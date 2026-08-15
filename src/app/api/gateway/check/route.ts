import { NextResponse } from "next/server";
import { assertGatewayAuth, parseIntent } from "@/lib/gateway/auth";
import { evaluateMandate } from "@/lib/mandate";
import {
  getActivePolicy,
  getPolicy,
  setActiveAgent,
} from "@/lib/policy/store";
import { agents } from "@/lib/identity";

export async function POST(req: Request) {
  void agents.corporate;
  const denied = assertGatewayAuth(req);
  if (denied) return denied;

  const body = (await req.json()) as {
    sku?: string;
    merchant?: string;
    amountSgd?: number;
    agentId?: string;
  };
  const parsed = parseIntent(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  if (parsed.intent.agentId) {
    try {
      if (getPolicy(parsed.intent.agentId)) {
        setActiveAgent(parsed.intent.agentId);
      }
    } catch {
      /* keep current active */
    }
  }

  const policy = getActivePolicy();
  const result = evaluateMandate({
    sku: parsed.intent.sku,
    merchant: parsed.intent.merchant,
    amountSgd: parsed.intent.amountSgd,
  });

  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      code: result.code,
      reason: result.reason,
      agentId: policy.agentId,
    });
  }

  return NextResponse.json({
    ok: true,
    code: "PASS",
    agentId: policy.agentId,
    mandate: {
      sku: result.mandate.sku,
      merchants: result.mandate.merchants,
      maxPerTx: result.mandate.maxPerTx,
      capSgd: result.mandate.capSgd,
    },
  });
}
