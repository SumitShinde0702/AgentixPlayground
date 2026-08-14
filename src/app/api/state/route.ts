import { NextResponse } from "next/server";
import { getConsoleState } from "@/lib/state";
import { currentMandate } from "@/lib/mandate";
import { agents } from "@/lib/identity";
import { getLatestCard } from "@/lib/payments/cards";
import { getLastSettlement } from "@/lib/payments/x402";

export async function GET() {
  return NextResponse.json({
    mandate: currentMandate(),
    agents: {
      corporate: { id: agents.corporate.id, did: agents.corporate.did },
      rogue: { id: agents.rogue.id, did: agents.rogue.did },
    },
    card: getLatestCard(),
    settlement: getLastSettlement(),
    console: getConsoleState(),
  });
}
