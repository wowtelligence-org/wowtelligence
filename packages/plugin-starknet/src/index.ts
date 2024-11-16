import { Plugin } from "@wowtelligence-org/wowtelligence";
import { executeSwap } from "./actions/swap";
import {
    getStarknetAccountProvider,
    getStarknetRpcProvider,
} from "./providers/avnu";

export const starknetPlugin: Plugin = {
    name: "Starknet",
    description: "Starknet Swap Plugin for Wowtelligence",
    actions: [executeSwap],
    evaluators: [],
    providers: [getStarknetAccountProvider, getStarknetRpcProvider],
};

export default starknetPlugin;
