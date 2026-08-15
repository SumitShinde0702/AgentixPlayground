import { NextResponse } from "next/server";
import { getAudit, verifyChain } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const log = getAudit(id);
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...log, valid: verifyChain(log) });
}
