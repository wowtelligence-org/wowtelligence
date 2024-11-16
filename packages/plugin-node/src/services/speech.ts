import { PassThrough, Readable } from "stream";
import {
    IAgentRuntime,
    ISpeechService,
    ServiceType,
} from "@wowtelligence-org/wowtelligence";
import { getWavHeader } from "./audioUtils.ts";
import { synthesize } from "../vendor/vits.ts";
import { Service } from "@wowtelligence-org/wowtelligence";
function prependWavHeader(
    readable: Readable,
    audioLength: number,
    sampleRate: number,
    channelCount: number = 1,
    bitsPerSample: number = 16
): Readable {
    const wavHeader = getWavHeader(
        audioLength,
        sampleRate,
        channelCount,
        bitsPerSample
    );
    let pushedHeader = false;
    const passThrough = new PassThrough();
    readable.on("data", function (data) {
        if (!pushedHeader) {
            passThrough.push(wavHeader);
            pushedHeader = true;
        }
        passThrough.push(data);
    });
    readable.on("end", function () {
        passThrough.end();
    });
    return passThrough;
}

async function textToSpeech(runtime: IAgentRuntime, text: string) {
    console.log("11 TTS: " + text);
    const body = {
        model_id: runtime.getSetting("ELEVENLABS_MODEL_ID"),
        text: text,
        voice_settings: {
            similarity_boost: runtime.getSetting(
                "ELEVENLABS_VOICE_SIMILARITY_BOOST"
            ),
            stability: runtime.getSetting("ELEVENLABS_VOICE_STABILITY"),
            style: runtime.getSetting("ELEVENLABS_VOICE_STYLE"),
            use_speaker_boost: runtime.getSetting(
                "ELEVENLABS_VOICE_USE_SPEAKER_BOOST"
            ),
        },
    };
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "xi-api-key": runtime.getSetting("ELEVENLABS_XI_API_KEY"),
        },
        body: JSON.stringify(body),
    };

    const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${runtime.getSetting("ELEVENLABS_VOICE_ID")}/stream?optimize_streaming_latency=${runtime.getSetting("ELEVENLABS_OPTIMIZE_STREAMING_LATENCY")}&output_format=${runtime.getSetting("ELEVENLABS_OUTPUT_FORMAT")}`,
        options
    );

    const status = response.status;
    if (status != 200) {
        console.log(`Received status ${status} from Eleven Labs API`);
        const errorBodyString = await response.text();
        throw new Error(
            `Received status ${status} from Eleven Labs API: ${errorBodyString}`
        );
    }

    if (response) {
        const reader = response.body?.getReader();
        const readable = new Readable({
            read() {
                reader &&
                    reader.read().then(({ done, value }) => {
                        if (done) {
                            this.push(null);
                        } else {
                            this.push(value);
                        }
                    });
            },
        });

        if (runtime.getSetting("ELEVENLABS_OUTPUT_FORMAT").startsWith("pcm_")) {
            const sampleRate = parseInt(
                runtime.getSetting("ELEVENLABS_OUTPUT_FORMAT").substring(4)
            );
            const withHeader = prependWavHeader(
                readable,
                1024 * 1024 * 100,
                sampleRate,
                1,
                16
            );
            return withHeader;
        } else {
            return readable;
        }
    } else {
        return new Readable({
            read() {},
        });
    }
}

export class SpeechService extends Service implements ISpeechService {
    static serviceType: ServiceType = ServiceType.SPEECH_GENERATION;
    async generate(runtime: IAgentRuntime, text: string): Promise<Readable> {
        // check for elevenlabs API key
        if (runtime.getSetting("ELEVENLABS_XI_API_KEY")) {
            return textToSpeech(runtime, text);
        }
        const { audio } = await synthesize(text, {
            engine: "vits",
            voice: "en_US-hfc_female-medium",
        });

        let wavStream: Readable;
        if (audio instanceof Buffer) {
            console.log("audio is a buffer");
            wavStream = Readable.from(audio);
        } else if ("audioChannels" in audio && "sampleRate" in audio) {
            console.log("audio is a RawAudio");
            const floatBuffer = Buffer.from(audio.audioChannels[0].buffer);
            console.log("buffer length: ", floatBuffer.length);

            // Get the sample rate from the RawAudio object
            const sampleRate = audio.sampleRate;

            // Create a Float32Array view of the floatBuffer
            const floatArray = new Float32Array(floatBuffer.buffer);

            // Convert 32-bit float audio to 16-bit PCM
            const pcmBuffer = new Int16Array(floatArray.length);
            for (let i = 0; i < floatArray.length; i++) {
                pcmBuffer[i] = Math.round(floatArray[i] * 32767);
            }

            // Prepend WAV header to the buffer
            const wavHeaderBuffer = getWavHeader(
                pcmBuffer.length * 2,
                sampleRate,
                1,
                16
            );
            const wavBuffer = Buffer.concat([
                wavHeaderBuffer,
                Buffer.from(pcmBuffer.buffer),
            ]);

            wavStream = Readable.from(wavBuffer);
        } else {
            throw new Error("Unsupported audio format");
        }

        return wavStream;
    }
}
