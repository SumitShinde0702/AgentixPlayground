import { NextResponse } from "next/server";
import { getConsoleState } from "@/lib/state";
import { currentMandate } from "@/lib/mandate";
import { agents, mandateHash } from "@/lib/identity";
import { getLatestCard } from "@/lib/payments/cards";
import { getLastSettlement, getLivePending } from "@/lib/payments/x402";
import { liveFundingSnapshot } from "@/lib/avalanche/xsgd";
import {
  getActivePolicy,
  getSpendSnapshot,
  sleepScore,
} from "@/lib/policy/store";
import {
  XSGD,
  agentWalletAddress,
  avalancheChainId,
  merchantWalletAddress,
  x402Network,
} from "@/lib/config";

export async function GET() {
  const chain = await liveFundingSnapshot();
  void agents.corporate;
  const policy = getActivePolicy();
  return NextResponse.json({
    mandate: currentMandate(),
    mandateHash: mandateHash(),
    policy,
    sleep: sleepScore(policy),
    spend: getSpendSnapshot(policy.agentId),
    agents: {
      corporate: {
        id: agents.corporate.id,
        did: agents.corporate.did,
        label: agents.corporate.label,
      },
      rogue: {
        id: agents.rogue.id,
        did: agents.rogue.did,
        label: agents.rogue.label,
      },
    },
    card: getLatestCard(),
    settlement: getLastSettlement(),
    livePending: getLivePending(),
    chain,
    wallets: {
      agent: policy.treasuryAddress || agentWalletAddress() || null,
      merchant: merchantWalletAddress() || null,
      token: XSGD.address,
      network: x402Network(),
      chainId: avalancheChainId(),
    },
    console: getConsoleState(),
  });
}
