import { Context, Telegraf } from "telegraf";

import { IAgentRuntime } from "@wowtelligence-org/wowtelligence";
import { MessageManager } from "./messageManager.ts";
import { wowtelligenceLogger } from "@wowtelligence-org/wowtelligence/src/logger.ts";

export class TelegramClient {
    private bot: Telegraf<Context>;
    private runtime: IAgentRuntime;
    private messageManager: MessageManager;

    constructor(runtime: IAgentRuntime, botToken: string) {
        wowtelligenceLogger.log("📱 Constructing new TelegramClient...");
        this.runtime = runtime;
        this.bot = new Telegraf(botToken);
        this.messageManager = new MessageManager(this.bot, this.runtime);

        wowtelligenceLogger.log("✅ TelegramClient constructor completed");
    }

    public async start(): Promise<void> {
        wowtelligenceLogger.log("🚀 Starting Telegram bot...");
        try {
            this.bot.launch({
                dropPendingUpdates: true,
            });
            wowtelligenceLogger.log(
                "✨ Telegram bot successfully launched and is running!"
            );

            await this.bot.telegram.getMe().then((botInfo) => {
                this.bot.botInfo = botInfo;
            });

            console.log(`Bot username: @${this.bot.botInfo?.username}`);

            this.messageManager.bot = this.bot;

            // Include if you want to view message maanger bot info
            // console.log(`Message Manager bot info: @${this.messageManager.bot}`);

            wowtelligenceLogger.log("Setting up message handler...");

            this.bot.on("message", async (ctx) => {
                try {
                    console.log("📥 Received message:", ctx.message);
                    await this.messageManager.handleMessage(ctx);
                } catch (error) {
                    wowtelligenceLogger.error(
                        "❌ Error handling message:",
                        error
                    );
                    await ctx.reply(
                        "An error occurred while processing your message."
                    );
                }
            });

            // Handle specific message types for better logging
            this.bot.on("photo", (ctx) => {
                wowtelligenceLogger.log(
                    "📸 Received photo message with caption:",
                    ctx.message.caption
                );
            });

            this.bot.on("document", (ctx) => {
                wowtelligenceLogger.log(
                    "📎 Received document message:",
                    ctx.message.document.file_name
                );
            });

            this.bot.catch((err, ctx) => {
                wowtelligenceLogger.error(
                    `❌ Telegram Error for ${ctx.updateType}:`,
                    err
                );
                ctx.reply(
                    "An unexpected error occurred. Please try again later."
                );
            });

            // Graceful shutdown handlers
            const shutdownHandler = async (signal: string) => {
                wowtelligenceLogger.log(
                    `⚠️ Received ${signal}. Shutting down Telegram bot gracefully...`
                );
                try {
                    await this.stop();
                    wowtelligenceLogger.log(
                        "🛑 Telegram bot stopped gracefully"
                    );
                } catch (error) {
                    wowtelligenceLogger.error(
                        "❌ Error during Telegram bot shutdown:",
                        error
                    );
                    throw error;
                }
            };

            process.once("SIGINT", () => shutdownHandler("SIGINT"));
            process.once("SIGTERM", () => shutdownHandler("SIGTERM"));
            process.once("SIGHUP", () => shutdownHandler("SIGHUP"));
        } catch (error) {
            wowtelligenceLogger.error(
                "❌ Failed to launch Telegram bot:",
                error
            );
            throw error;
        }
    }

    public async stop(): Promise<void> {
        wowtelligenceLogger.log("Stopping Telegram bot...");
        await this.bot.stop();
        wowtelligenceLogger.log("Telegram bot stopped");
    }
}
