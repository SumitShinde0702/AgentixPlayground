import { MANDATE, merchantWalletAddress } from "@/lib/config";
import { runCamel } from "@/lib/camel";
import { appendAudit, startAudit } from "@/lib/audit";
import {
  agents,
  createChallenge,
  mandateHash,
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
import { settlePayment, recordLiveSettlement } from "@/lib/payments/x402";
import { listCardMcpTools } from "@/lib/payments/straitsx-mcp";
import { liveFundingSnapshot } from "@/lib/avalanche/xsgd";
import { patchConsole } from "@/lib/state";
import { nonce } from "@/lib/hash";
import { supplierDocument } from "@/lib/supplier/content";
import { getActivePolicy, recordSpend, resetSpendLedger } from "@/lib/policy/store";
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

  // Phase 1 (rogue) clears spend so a full theater pass is not CAP-blocked.
  if (lane === "rogue") {
    resetSpendLedger();
  }

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
    agentId: req.agentId,
    ok: verified.ok,
    code: verified.code,
    reason: verified.ok ? undefined : verified.reason,
    mandateHash: req.mandateHash,
    registryHas: agents.corporate.did,
    presentedDid: req.did,
  });

  if (!verified.ok) {
    const head = appendAudit(auditId, "complete", { lane, blocked: true });
    patchConsole({
      identity: { did: req.did, status: "fail", reason: verified.reason },
      receipt: { id: auditId, head: head.hash },
    });
    yield emit(1, "BLOCK", `Identity check failed — ${verified.reason}`);
    yield emit(1, "info", `code ${verified.code} · DID not in registry`);
    yield emit(1, "info", `presented ${req.did.slice(0, 28)}…`);
    yield emit(1, "info", `registry ${agents.corporate.did.slice(0, 28)}…`);
    yield emit(1, "BLOCK", "Mandate untouched. No card issued.");
    yield emit(4, "PASS", `Audit ${auditId} · chain ${head.hash.slice(0, 12)}…`);
    return;
  }

  patchConsole({ identity: { did: req.did, status: "pass" } });
  yield emit(1, "PASS", `Registry match ${agent.label} · ${agent.did.slice(0, 22)}…`);
  yield emit(1, "info", `mandateHash ${mandateHash().slice(0, 16)}…`);

  yield emit(2, "info", "P-LLM compiled frozen plan from mandate");
  yield emit(2, "info", `Plan: scrape → assert ${MANDATE.sku} → issue_card → pay`);

  const html = supplierDocument();
  const camel = await runCamel(html);
  appendAudit(auditId, "camel", {
    ok: camel.ok,
    stripped: camel.quote.stripped,
    hints: camel.quarantined.filter((h) => !camel.quote.stripped.includes(h)),
    quarantined: camel.quarantined,
    sku: camel.quote.sku,
    price: camel.quote.price,
    merchant: camel.quote.merchant,
    capability: camel.quote.capability,
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
    const head = appendAudit(auditId, "complete", { lane, blocked: true });
    patchConsole({ receipt: { id: auditId, head: head.hash } });
    yield emit(2, "BLOCK", camel.reason);
    yield emit(4, "PASS", `Audit ${auditId} · chain ${head.hash.slice(0, 12)}…`);
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
    const head = appendAudit(auditId, "complete", { lane, blocked: true });
    patchConsole({ receipt: { id: auditId, head: head.hash } });
    yield emit(3, "BLOCK", mandate.reason);
    yield emit(4, "PASS", `Audit ${auditId} · chain ${head.hash.slice(0, 12)}…`);
    return;
  }

  yield emit(
    3,
    "info",
    `Mandate bounds · ${MANDATE.sku} · ${MANDATE.merchantHost} · cap S$${MANDATE.capSgd.toLocaleString("en-SG")}`,
  );

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
  yield emit(3, "PASS", `Sandbox sub-wallet ${fund.source} · 12,000 XSGD`);

  const live = await liveFundingSnapshot();
  if (live.balance) {
    yield emit(
      3,
      "PASS",
      `Live Avalanche · ${live.balance.amount.toFixed(2)} XSGD · agent ${live.agent.slice(0, 10)}…`,
    );
  } else if (live.configured) {
    yield emit(3, "info", `Live rail configured · balance unread (${live.error ?? "n/a"})`);
  } else {
    yield emit(3, "info", "Live rail: set AGENT_WALLET_ADDRESS for on-chain proof");
  }

  const payTo = merchantWalletAddress();
  if (payTo) {
    yield emit(3, "info", `Merchant payTo ${payTo.slice(0, 12)}…`);
  }

  yield emit(3, "info", "StraitsX Card MCP: get_card_sandbox → cardapi x402");
  const mcp = await listCardMcpTools();
  yield emit(
    3,
    mcp.reachable ? "PASS" : "info",
    mcp.reachable
      ? `MCP tools: ${mcp.tools.join(", ") || mcp.toolName}`
      : `MCP ${mcp.url} unreachable — local stand-in`,
  );
  const issued = await issueCard({ ...intent, mandateId: auditId });
  if (!issued.ok) {
    const head = appendAudit(auditId, "complete", { lane, blocked: true });
    patchConsole({ receipt: { id: auditId, head: head.hash } });
    yield emit(3, "BLOCK", issued.reason);
    yield emit(4, "PASS", `Audit ${auditId} · chain ${head.hash.slice(0, 12)}…`);
    return;
  }
  if (issued.mcpPlan) {
    yield emit(
      3,
      "info",
      `MCP plan ${issued.mcpPlan.environment.environment} · ${issued.mcpPlan.environment.chain} · ${issued.mcpPlan.url.split("/").slice(-2).join("/")}`,
    );
  }
  if (issued.paymentAccept) {
    yield emit(
      3,
      "info",
      `x402 accept ${issued.paymentAccept.network} · ${issued.paymentAccept.amount} atomic · payTo ${issued.paymentAccept.payTo.slice(0, 10)}…`,
    );
  }
  yield emit(3, issued.card.source === "mcp" ? "PASS" : "info", issued.note);

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
    settlementTx: issued.card.settlementTx,
    network: issued.card.network,
  });
  if (issued.card.source === "mcp") {
    yield emit(
      3,
      "PASS",
      `mcp card ····${issued.card.last4} · cap S$${issued.card.limitSgd}`,
    );
  } else {
    yield emit(
      3,
      "info",
      `local stand-in card ····${issued.card.last4} — MCP settle did not complete (see note above)`,
    );
  }
  if (issued.card.settlementTx) {
    recordLiveSettlement({
      txHash: issued.card.settlementTx,
      amountSgd: issued.card.limitSgd,
      payTo: issued.paymentAccept?.payTo ?? merchantWalletAddress() ?? "",
      network: issued.card.network ?? issued.paymentAccept?.network,
    });
    yield emit(
      3,
      "PASS",
      `MCP settlement_tx ${issued.card.settlementTx.slice(0, 18)}…`,
    );
  }

  // MCP sandbox cards max S$30 — charge the prepaid card amount, not full mandate price.
  const chargeSgd =
    issued.card.source === "mcp" ? issued.card.limitSgd : intent.amountSgd;

  const rha = authorizeRha({
    amount: chargeSgd,
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

  const first = await settlePayment({ amountSgd: chargeSgd });
  yield emit(3, "info", "x402 checkout → HTTP 402 PAYMENT-REQUIRED");
  if (first.status !== 402) {
    yield emit(3, "BLOCK", "Expected 402 from merchant");
    return;
  }

  const paid = await settlePayment({
    amountSgd: chargeSgd,
    payload: `sig:${issued.card.opaqueId}`,
  });
  if (paid.status !== 200 || !paid.body.settlement) {
    yield emit(3, "BLOCK", "Settlement failed");
    return;
  }
  appendAudit(auditId, "x402", paid.body.settlement);
  recordSpend(chargeSgd, getActivePolicy().agentId);
  const settleLabel =
    paid.body.settlement.source === "avalanche" ? "on-chain" : "simulated";
  yield emit(
    3,
    paid.body.settlement.source === "avalanche" ? "PASS" : "info",
    `Merchant XSGD ${settleLabel} ${paid.body.settlement.network} · ${paid.body.settlement.txHash.slice(0, 16)}…`,
  );
  if (paid.body.settlement.snowtrace) {
    yield emit(3, "PASS", `Snowtrace ${paid.body.settlement.snowtrace}`);
  } else if (issued.card.source !== "mcp") {
    yield emit(
      3,
      "info",
      "Merchant settle is simulated until MCP card issues with a real settlement_tx (Fuji XSGD + working settle)",
    );
  }

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
