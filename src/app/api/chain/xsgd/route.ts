import { NextResponse } from "next/server";
import { liveFundingSnapshot } from "@/lib/avalanche/xsgd";
import { XSGD, avalancheChainId } from "@/lib/config";

export const runtime = "nodejs";

export async function GET() {
  const snap = await liveFundingSnapshot();
  return NextResponse.json({
    ...snap,
    token: XSGD,
    chainId: avalancheChainId(),
    dustSgd: 0.1,
  });
}
