import { NextResponse } from "next/server";
import { assertGatewayAuth, parseIntent } from "@/lib/gateway/auth";
import { evaluateMandate } from "@/lib/mandate";
import {
  authorizeRha,
  issueCard,
  revokeCard,
} from "@/lib/payments/cards";
import {
  getActivePolicy,
  getPolicy,
  recordSpend,
  setActiveAgent,
} from "@/lib/policy/store";
import { appendAudit, startAudit } from "@/lib/audit";
import { agents } from "@/lib/identity";
import { nonce } from "@/lib/hash";
import { mcpCardAmountSgd } from "@/lib/payments/straitsx-mcp";

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
      /* keep current */
    }
  }

  const policy = getActivePolicy();
  const mandate = evaluateMandate({
    sku: parsed.intent.sku,
    merchant: parsed.intent.merchant,
    amountSgd: parsed.intent.amountSgd,
  });
  if (!mandate.ok) {
    return NextResponse.json({
      ok: false,
      stage: "mandate",
      code: mandate.code,
      reason: mandate.reason,
    });
  }

  const receiptId = `rcpt_${nonce(5)}`;
  startAudit(receiptId);
  appendAudit(receiptId, "gateway.check", {
    sku: parsed.intent.sku,
    merchant: parsed.intent.merchant,
    amountSgd: parsed.intent.amountSgd,
    agentId: policy.agentId,
  });

  // MCP cards are prepaid 5–30; charge the gateway amount capped to MCP window when using MCP.
  const issueAmount = Math.min(
    parsed.intent.amountSgd,
    Math.max(mcpCardAmountSgd(), 5),
  );

  const issued = await issueCard({
    sku: parsed.intent.sku,
    merchant: parsed.intent.merchant,
    amountSgd: issueAmount,
    mandateId: receiptId,
  });

  if (!issued.ok) {
    appendAudit(receiptId, "gateway.pay_fail", {
      reason: issued.reason,
      code: issued.code,
    });
    return NextResponse.json({
      ok: false,
      stage: "card",
      code: issued.code,
      reason: issued.reason,
      receiptId,
    });
  }

  appendAudit(receiptId, "card.issue", {
    last4: issued.card.last4,
    source: issued.card.source,
    settlementTx: issued.card.settlementTx,
    network: issued.card.network,
  });

  const chargeSgd =
    issued.card.source === "mcp" ? issued.card.limitSgd : parsed.intent.amountSgd;

  const rha = authorizeRha({
    amount: chargeSgd,
    currency: "SGD",
    merchant: parsed.intent.merchant,
    sku: parsed.intent.sku,
    cardOpaqueId: issued.card.opaqueId,
  });
  appendAudit(receiptId, "rha", rha);

  if (!rha.approved) {
    revokeCard(issued.card.opaqueId);
    return NextResponse.json({
      ok: false,
      stage: "rha",
      code: rha.code,
      reason: rha.reason,
      receiptId,
    });
  }

  recordSpend(chargeSgd, policy.agentId);
  revokeCard(issued.card.opaqueId);
  appendAudit(receiptId, "card.revoke", { last4: issued.card.last4 });
  appendAudit(receiptId, "complete", { via: "gateway" });

  return NextResponse.json({
    ok: true,
    code: "PAID",
    receiptId,
    agentId: policy.agentId,
    card: {
      last4: issued.card.last4,
      source: issued.card.source,
      limitSgd: issued.card.limitSgd,
      status: "revoked",
      network: issued.card.network,
      settlementTx: issued.card.settlementTx ?? null,
    },
    chargeSgd,
    auditPath: `/audit/${receiptId}`,
  });
}
