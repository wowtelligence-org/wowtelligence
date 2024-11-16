export * from "./providers/token.ts";
export * from "./providers/wallet.ts";
export * from "./providers/trustScoreProvider.ts";
export * from "./evaluators/trust.ts";
export * from "./adapters/trustScoreDatabase.ts";

import { Plugin } from "@wowtelligence-org/wowtelligence";
//import { executeSwap } from "./actions/swap.ts";
//import take_order from "./actions/takeOrder";
//import pumpfun from "./actions/pumpfun.ts";
//import { executeSwapForDAO } from "./actions/swapDao";
//import transferToken from "./actions/transfer.ts";
import { walletProvider } from "./providers/wallet.ts";
import { trustScoreProvider } from "./providers/trustScoreProvider.ts";
import { trustEvaluator } from "./evaluators/trust.ts";

export const solanaPlugin: Plugin = {
    name: "solana",
    description: "Solana Plugin for Wowtelligence",
    actions: [
        //executeSwap,
        //pumpfun,
        //transferToken,
        //executeSwapForDAO,
        //take_order,
    ],
    evaluators: [trustEvaluator],
    providers: [walletProvider, trustScoreProvider],
};

export default solanaPlugin;
