import { NextRequest, NextResponse } from "next/server";
import { recordLiveSettlement, getLastSettlement } from "@/lib/payments/x402";
import { snowtraceTxUrl } from "@/lib/avalanche/xsgd";
import { merchantWalletAddress, x402Network } from "@/lib/config";

export const runtime = "nodejs";

/** Ingest a real Avalanche XSGD txHash (e.g. after MetaMask dust send). */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    txHash?: string;
    amountSgd?: number;
  };
  const txHash = body.txHash?.trim();
  if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return NextResponse.json({ error: "Valid txHash required" }, { status: 400 });
  }
  const amountSgd = Number(body.amountSgd ?? 0.1);
  const settlement = recordLiveSettlement({
    txHash,
    amountSgd,
    payTo: merchantWalletAddress() || "unknown",
  });
  return NextResponse.json({
    ok: true,
    settlement,
    snowtrace: snowtraceTxUrl(txHash),
    network: x402Network(),
  });
}

export async function GET() {
  return NextResponse.json({ settlement: getLastSettlement() });
}
