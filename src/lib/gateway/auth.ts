import { NextResponse } from "next/server";

function unauthorized() {
  const key = process.env.GATEWAY_API_KEY?.trim();
  return key
    ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    : null;
}

export function assertGatewayAuth(req: Request): NextResponse | null {
  const expected = process.env.GATEWAY_API_KEY?.trim();
  if (!expected) return null;
  const got = req.headers.get("x-secure-procure-key")?.trim();
  if (got !== expected) return unauthorized();
  return null;
}

export type GatewayIntent = {
  sku?: string;
  merchant?: string;
  amountSgd?: number;
  agentId?: string;
};

export function parseIntent(body: GatewayIntent) {
  const sku = typeof body.sku === "string" ? body.sku.trim() : "";
  const merchant = typeof body.merchant === "string" ? body.merchant.trim() : "";
  const amountSgd = Number(body.amountSgd);
  if (!sku || !merchant || !Number.isFinite(amountSgd) || amountSgd <= 0) {
    return {
      ok: false as const,
      error: "sku, merchant, and positive amountSgd required",
    };
  }
  return {
    ok: true as const,
    intent: {
      sku,
      merchant,
      amountSgd,
      agentId: body.agentId?.trim() || undefined,
    },
  };
}
