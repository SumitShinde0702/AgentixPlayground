import { NextResponse } from "next/server";
import {
  agentPrivateKey,
  agentWalletAddress,
  merchantWalletAddress,
  straitsxCardMcpUrl,
} from "@/lib/config";
import { mcpCardAmountSgd } from "@/lib/payments/straitsx-mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Safe presence check — never returns secret values. */
export async function GET() {
  const wallet = agentWalletAddress();
  const key = agentPrivateKey();
  const merchant = merchantWalletAddress();
  return NextResponse.json({
    ok: Boolean(wallet && key),
    present: {
      AGENT_WALLET_ADDRESS: Boolean(wallet),
      AGENT_PRIVATE_KEY: Boolean(key),
      MERCHANT_WALLET_ADDRESS: Boolean(merchant),
      STRAITSX_CARD_MCP_URL: Boolean(straitsxCardMcpUrl()),
      CARD_MCP_AMOUNT_SGD: mcpCardAmountSgd(),
    },
    hints: {
      walletPrefix: wallet ? `${wallet.slice(0, 10)}…` : null,
      mcpUrlHost: (() => {
        try {
          return new URL(straitsxCardMcpUrl()).host;
        } catch {
          return null;
        }
      })(),
    },
  });
}
