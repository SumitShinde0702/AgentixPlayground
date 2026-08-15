import { NextResponse } from "next/server";
import { listReceipts, type ReceiptOutcome } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("outcome") ?? "all";
  const outcome =
    raw === "block" || raw === "success" || raw === "pending" || raw === "all"
      ? (raw as ReceiptOutcome | "all")
      : "all";

  const receipts = listReceipts(outcome);
  return NextResponse.json({
    ok: true,
    outcome,
    count: receipts.length,
    receipts,
  });
}
