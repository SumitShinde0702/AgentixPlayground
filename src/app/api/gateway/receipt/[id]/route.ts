import { NextResponse } from "next/server";
import { assertGatewayAuth } from "@/lib/gateway/auth";
import { getAudit, verifyChain } from "@/lib/audit";
import { agents } from "@/lib/identity";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  void agents.corporate;
  const denied = assertGatewayAuth(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const log = getAudit(id);
  if (!log) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    receiptId: log.id,
    head: log.head,
    valid: verifyChain(log),
    chain: log.chain,
  });
}
