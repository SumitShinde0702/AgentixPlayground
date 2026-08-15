import { XSGD } from "@/lib/config";

/** Fuji test XSGD (Card MCP sandbox). */
export const XSGD_FUJI = {
  symbol: "XSGD",
  address: "0xd769410dc8772695a7f55a304d2125320a65c2a5" as const,
  decimals: 6,
} as const;

export const XSGD_MAINNET = {
  symbol: XSGD.symbol,
  address: XSGD.address as `0x${string}`,
  decimals: XSGD.decimals,
} as const;

export const erc20BalanceOfAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;
