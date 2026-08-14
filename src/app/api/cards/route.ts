import { NextRequest, NextResponse } from "next/server";
import { getLatestCard, issueCard, revokeCard } from "@/lib/payments/cards";

export async function GET() {
  return NextResponse.json({ card: getLatestCard() });
}

export async function POST(req: NextRequest) {
  const intent = (await req.json()) as {
    sku: string;
    merchant: string;
    amountSgd: number;
    mandateId: string;
  };
  const result = await issueCard(intent);
  return NextResponse.json(result, { status: result.ok ? 200 : 403 });
}

export async function DELETE(req: NextRequest) {
  const { opaqueId } = (await req.json()) as { opaqueId: string };
  return NextResponse.json(revokeCard(opaqueId));
}
