import { MANDATE } from "@/lib/config";
import { runCamel } from "@/lib/camel";
import { appendAudit, startAudit } from "@/lib/audit";
import {
  agents,
  createChallenge,
  signIdentity,
  verifyIdentity,
} from "@/lib/identity";
import { evaluateMandate } from "@/lib/mandate";
import {
  authorizeRha,
  fundSubWallet,
  issueCard,
  revokeCard,
} from "@/lib/payments/cards";
import { settlePayment } from "@/lib/payments/x402";
import { listCardMcpTools } from "@/lib/payments/straitsx-mcp";
import { patchConsole } from "@/lib/state";
import { nonce } from "@/lib/hash";
import { supplierDocument } from "@/lib/supplier/content";
import type { RunEvent, RunLane } from "@/lib/run/types";

export type { RunEvent, RunLane } from "@/lib/run/types";

export async function* runLane(lane: RunLane): AsyncGenerator<RunEvent> {
  const t0 = Date.now();
  const emit = (
    phase: RunEvent["phase"],
    status: RunEvent["status"],
    line: string,
  ): RunEvent => ({
    t: Date.now() - t0,
    lane,
    phase,
    status,
    line,
  });

  const auditId = `rcpt_${nonce(5)}`;
  startAudit(auditId);

  yield emit(1, "info", `Challenge issued to ${lane} agent`);
  const challenge = createChallenge();
  const agent = lane === "rogue" ? agents.rogue : agents.corporate;
  const req = signIdentity(agent, challenge);
  const verified = verifyIdentity(req);
  appendAudit(auditId, "identity", {
    lane,
    did: req.did,
    ok: verified.ok,
    code: verified.code,
  });

  if (!verified.ok) {
    patchConsole({
      identity: { did: req.did, status: "fail", reason: verified.reason },
    });
    yield emit(1, "BLOCK", `Identity check failed — ${verified.reason}`);
    yield emit(1, "BLOCK", "Mandate untouched. No card issued.");
    return;
  }

  patchConsole({ identity: { did: req.did, status: "pass" } });
  yield emit(1, "PASS", `Registry match ${agent.label} · ${agent.did.slice(0, 22)}…`);

  yield emit(2, "info", "P-LLM compiled frozen plan from mandate");
  yield emit(2, "info", `Plan: scrape → assert ${MANDATE.sku} → issue_card → pay`);

  const html = supplierDocument();
  const camel = await runCamel(html);
  appendAudit(auditId, "camel", {
    ok: camel.ok,
    stripped: camel.quote.stripped,
    hints: camel.quote.rawHints,
    sku: camel.quote.sku,
  });

  if (camel.quote.stripped.length || camel.quarantined.length) {
    yield emit(
      2,
      "PASS",
      `Q-LLM quarantined: ${camel.quarantined.slice(0, 2).join(" · ")}`,
    );
  }
  yield emit(2, "info", `Untrusted quote tagged · sku ${camel.quote.sku} · S$${camel.quote.price}`);

  if (!camel.ok) {
    yield emit(2, "BLOCK", camel.reason);
    return;
  }
  yield emit(2, "PASS", "Injected gift-card command never became a tool call");

  const intent = {
    sku: camel.allowed.sku,
    merchant: camel.allowed.merchant,
    amountSgd: camel.allowed.price,
  };
  const mandate = evaluateMandate(intent);
  if (!mandate.ok) {
    yield emit(3, "BLOCK", mandate.reason);
    return;
  }

  yield emit(3, "info", "Funding XSGD cards sub-wallet");
  const fund = await fundSubWallet();
  patchConsole({
    funding: {
      amount: "12000.00",
      currency: "XSGD",
      status: "completed",
      source: fund.source,
    },
  });
  yield emit(3, "PASS", `Funding ${fund.source} · 12,000 XSGD`);

  yield emit(3, "info", "StraitsX MCP: issue one-time card scoped to intent");
  const mcp = await listCardMcpTools();
  yield emit(
    3,
    "info",
    mcp.reachable
      ? `MCP ${mcp.url}`
      : `MCP ${mcp.url} (sandbox issuer standing by)`,
  );
  const issued = await issueCard({ ...intent, mandateId: auditId });
  if (!issued.ok) {
    yield emit(3, "BLOCK", issued.reason);
    return;
  }
  patchConsole({
    card: {
      last4: issued.card.last4,
      status: "active",
      opaqueId: issued.card.opaqueId,
    },
  });
  appendAudit(auditId, "card.issue", {
    last4: issued.card.last4,
    source: issued.card.source,
    limit: issued.card.limitSgd,
  });
  yield emit(
    3,
    "PASS",
    `${issued.card.source} card ····${issued.card.last4} · cap S$${issued.card.limitSgd}`,
  );

  const rha = authorizeRha({
    amount: intent.amountSgd,
    currency: "SGD",
    merchant: intent.merchant,
    sku: intent.sku,
    cardOpaqueId: issued.card.opaqueId,
  });
  appendAudit(auditId, "rha", rha);
  if (!rha.approved) {
    yield emit(3, "BLOCK", `RHA declined — ${rha.reason}`);
    return;
  }
  yield emit(3, "PASS", "RHA approved: amount, merchant, SKU match mandate");

  const first = await settlePayment({ amountSgd: intent.amountSgd });
  yield emit(3, "info", "x402 checkout → HTTP 402 PAYMENT-REQUIRED");
  if (first.status !== 402) {
    yield emit(3, "BLOCK", "Expected 402 from merchant");
    return;
  }

  const paid = await settlePayment({
    amountSgd: intent.amountSgd,
    payload: `sig:${issued.card.opaqueId}`,
  });
  if (paid.status !== 200 || !paid.body.settlement) {
    yield emit(3, "BLOCK", "Settlement failed");
    return;
  }
  appendAudit(auditId, "x402", paid.body.settlement);
  yield emit(
    3,
    "PASS",
    `XSGD settled ${paid.body.settlement.network} · ${paid.body.settlement.txHash.slice(0, 16)}…`,
  );

  const closed = revokeCard(issued.card.opaqueId);
  if (closed.ok) {
    patchConsole({
      card: { last4: closed.card.last4, status: "revoked", opaqueId: closed.card.opaqueId },
    });
    appendAudit(auditId, "card.revoke", { last4: closed.card.last4 });
    yield emit(3, "PASS", `Card ····${closed.card.last4} revoked`);
  }

  const head = appendAudit(auditId, "complete", { lane });
  patchConsole({ receipt: { id: auditId, head: head.hash } });
  yield emit(4, "PASS", `Audit ${auditId} · chain ${head.hash.slice(0, 12)}…`);
  yield emit(4, "PASS", "Receipt sealed. Card gone from agent memory.");
}
