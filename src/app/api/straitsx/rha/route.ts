import { NextRequest, NextResponse } from "next/server";
import { authorizeRha } from "@/lib/payments/cards";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    amount: number;
    currency?: string;
    merchant: string;
    sku?: string;
    cardOpaqueId?: string;
  };
  const result = authorizeRha({
    amount: body.amount,
    currency: body.currency ?? "SGD",
    merchant: body.merchant,
    sku: body.sku,
    cardOpaqueId: body.cardOpaqueId,
  });
  return NextResponse.json(result, { status: result.approved ? 200 : 403 });
}
