import { Client, IAgentRuntime } from "@wowtelligence-org/wowtelligence";
import { TrustScoreManager } from "@wowtelligence-org/plugin-solana";
import { TokenProvider } from "@wowtelligence-org/plugin-solana";
import { WalletProvider } from "@wowtelligence-org/plugin-solana";
import { TrustScoreDatabase } from "@wowtelligence-org/plugin-solana";
import { Connection, PublicKey } from "@solana/web3.js";

export class AutoClient {
    interval: NodeJS.Timeout;
    runtime: IAgentRuntime;
    trustScoreProvider: TrustScoreManager;
    walletProvider: WalletProvider;

    constructor(runtime: IAgentRuntime) {
        this.runtime = runtime;

        const trustScoreDb = new TrustScoreDatabase(runtime.databaseAdapter.db);
        this.trustScoreProvider = new TrustScoreManager(null, trustScoreDb);
        this.walletProvider = new WalletProvider(
            new Connection(runtime.getSetting("RPC_URL")),
            new PublicKey(runtime.getSetting("WALLET_PUBLIC_KEY"))
        );

        // start a loop that runs every x seconds
        this.interval = setInterval(
            async () => {
                await this.makeTrades();
            },
            60 * 60 * 1000
        ); // 1 hour in milliseconds
    }

    async makeTrades() {
        console.log("Running auto loop");

        // malibu todos
        const startDate = new Date(new Date().getTime() - 60 * 60 * 1000);
        const endDate = new Date();
        // get recommendations from the last hour (or whatever time period we want) in order desc by trust score
        const recommendations =
            await this.trustScoreProvider.getRecommendations(
                startDate,
                endDate
            );
        // get high trust recommendations
        const highTrustRecommendations = recommendations.filter(
            (r) => r.averageTrustScore > 0.7
        );

        // get information for all tokens which were recommended
        const tokenInfos = highTrustRecommendations.map(
            async (highTrustRecommendation) => {
                const tokenProvider = new TokenProvider(
                    highTrustRecommendation.tokenAddress,
                    this.walletProvider
                );
                const tokenInfo = await tokenProvider.getProcessedTokenData();
                const shouldTrade = await tokenProvider.shouldTradeToken();
                return { tokenInfo, shouldTrade };
            }
        );

        // get any additional information we might need
        // make sure we're looking at the right tokens and data

        // shaw -- TODOs
        // compose thesis context
        // write a thesis which trades and why

        // compose trade context
        // geratate trades with LLM
        // parse trades from LLM
        // post thesis to twitter

        // malibu todos
        // execute trades
    }
}

export const AutoClientInterface: Client = {
    start: async (runtime: IAgentRuntime) => {
        const client = new AutoClient(runtime);
        return client;
    },
    stop: async (runtime: IAgentRuntime) => {
        console.warn("Direct client does not support stopping yet");
    },
};

export default AutoClientInterface;
