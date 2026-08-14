import { NextRequest, NextResponse } from "next/server";
import { currentMandate, evaluateMandate } from "@/lib/mandate";

export async function GET() {
  return NextResponse.json(currentMandate());
}

export async function POST(req: NextRequest) {
  const intent = (await req.json()) as {
    sku: string;
    merchant: string;
    amountSgd: number;
    extraActions?: string[];
  };
  return NextResponse.json(evaluateMandate(intent));
}
