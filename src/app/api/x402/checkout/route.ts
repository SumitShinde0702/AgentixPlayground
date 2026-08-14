import { NextRequest, NextResponse } from "next/server";
import { MANDATE } from "@/lib/config";
import { settlePayment } from "@/lib/payments/x402";

export async function POST(req: NextRequest) {
  const payload = req.headers.get("payment-signature") ?? req.headers.get("PAYMENT-SIGNATURE");
  const body = await req.json().catch(() => ({}));
  const amountSgd = Number((body as { amountSgd?: number }).amountSgd ?? MANDATE.priceSgd);
  const result = await settlePayment({ amountSgd, payload: payload ?? undefined });
  const res = NextResponse.json(result.body, { status: result.status });
  for (const [k, v] of Object.entries(result.headers)) {
    res.headers.set(k, v);
  }
  return res;
}
