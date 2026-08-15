/**
 * Policy / mandate smoke tests — no Card MCP settle, no Fuji XSGD.
 * Import via @/ so we share one policy store instance with lib code.
 *
 * Run: npx tsx scripts/policy-rules-smoke.mts
 */
process.env.GATEX_FORCE_MEMORY = "1";
process.env.STRAITSX_CARD_MCP_URL = "http://127.0.0.1:9/no-mcp";
delete process.env.AGENT_WALLET_ADDRESS;
delete process.env.AGENT_PRIVATE_KEY;

const { evaluateMandate } = await import("@/lib/mandate");
const { authorizeRha, issueCard } = await import("@/lib/payments/cards");
const {
  freezeAgent,
  getActivePolicy,
  recordSpend,
  resetSpendLedger,
  setActiveAgent,
  upsertPolicy,
} = await import("@/lib/policy/store");

type Case = { name: string; pass: boolean; detail: string };
const results: Case[] = [];

function expect(name: string, cond: boolean, detail: string) {
  results.push({ name, pass: cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const baseline = {
  agentId: "smoke-procure",
  label: "Smoke agent",
  merchants: ["helix-materials.sg"],
  skuAllowlist: ["ALU-6061-T6"],
  maxPerTxSgd: 12_000,
  maxPerDaySgd: 12_000,
  maxPerWeekSgd: 12_000,
  maxTxPerHour: 12,
  requireApprovalOverSgd: 10_000,
  status: "active" as const,
  autoRevokeAfterPurchase: true,
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
};

upsertPolicy(baseline);
setActiveAgent(baseline.agentId);
resetSpendLedger(baseline.agentId);

const good = {
  sku: "ALU-6061-T6",
  merchant: "helix-materials.sg",
  amountSgd: 100,
};

{
  const r = evaluateMandate(good);
  expect("happy path PASS", r.ok === true, r.ok ? "ok" : r.reason);
}

{
  upsertPolicy({ agentId: baseline.agentId, merchants: [] });
  const r = evaluateMandate(good);
  expect(
    "empty merchants → MERCHANT deny",
    r.ok === false && !r.ok && r.code === "MERCHANT",
    r.ok ? `unexpected pass merchants=${getActivePolicy().merchants.join("|")}` : `${r.code}`,
  );
  upsertPolicy({ agentId: baseline.agentId, merchants: ["helix-materials.sg"] });
}

{
  const r = evaluateMandate({ ...good, merchant: "evil-shop.example" });
  expect(
    "wrong merchant → MERCHANT",
    r.ok === false && r.code === "MERCHANT",
    r.ok ? "unexpected pass" : r.code,
  );
}

{
  upsertPolicy({ agentId: baseline.agentId, skuAllowlist: [] });
  const r = evaluateMandate(good);
  expect(
    "empty SKUs → SKU deny",
    r.ok === false && r.code === "SKU",
    r.ok ? "unexpected pass" : `${r.code}`,
  );
  upsertPolicy({ agentId: baseline.agentId, skuAllowlist: ["ALU-6061-T6"] });
}

{
  const r = evaluateMandate({ ...good, sku: "GIFT-CARD-500" });
  expect(
    "wrong SKU → SKU",
    r.ok === false && r.code === "SKU",
    r.ok ? "unexpected pass" : r.code,
  );
}

{
  const r = evaluateMandate({ ...good, amountSgd: 50_000 });
  expect(
    "over per-tx / day → CAP or DAY",
    r.ok === false && (r.code === "CAP" || r.code === "DAY"),
    r.ok ? "unexpected pass" : r.code,
  );
}

{
  upsertPolicy({ agentId: baseline.agentId, maxPerTxSgd: 50 });
  const r = evaluateMandate({ ...good, amountSgd: 100 });
  expect(
    "per-tx cap → CAP",
    r.ok === false && r.code === "CAP",
    r.ok ? `unexpected pass maxPerTx=${getActivePolicy().maxPerTxSgd}` : r.code,
  );
  upsertPolicy({ agentId: baseline.agentId, maxPerTxSgd: 12_000 });
}

{
  resetSpendLedger(baseline.agentId);
  upsertPolicy({ agentId: baseline.agentId, maxPerDaySgd: 150 });
  recordSpend(100, baseline.agentId);
  const r = evaluateMandate({ ...good, amountSgd: 100 });
  expect(
    "daily cap after spend → DAY",
    r.ok === false && r.code === "DAY",
    r.ok ? "unexpected pass" : r.code,
  );
  resetSpendLedger(baseline.agentId);
  upsertPolicy({ agentId: baseline.agentId, maxPerDaySgd: 12_000 });
}

{
  resetSpendLedger(baseline.agentId);
  upsertPolicy({ agentId: baseline.agentId, maxPerWeekSgd: 150 });
  recordSpend(100, baseline.agentId);
  const r = evaluateMandate({ ...good, amountSgd: 100 });
  expect(
    "weekly cap after spend → WEEK",
    r.ok === false && r.code === "WEEK",
    r.ok ? "unexpected pass" : r.code,
  );
  resetSpendLedger(baseline.agentId);
  upsertPolicy({ agentId: baseline.agentId, maxPerWeekSgd: 12_000 });
}

{
  resetSpendLedger(baseline.agentId);
  upsertPolicy({ agentId: baseline.agentId, maxTxPerHour: 2 });
  recordSpend(1, baseline.agentId);
  recordSpend(1, baseline.agentId);
  const r = evaluateMandate(good);
  expect(
    "hourly rate → RATE",
    r.ok === false && r.code === "RATE",
    r.ok ? "unexpected pass" : r.code,
  );
  resetSpendLedger(baseline.agentId);
  upsertPolicy({ agentId: baseline.agentId, maxTxPerHour: 12 });
}

{
  freezeAgent(baseline.agentId, true);
  const r = evaluateMandate(good);
  expect(
    "frozen agent → FROZEN",
    r.ok === false && r.code === "FROZEN",
    r.ok ? "unexpected pass" : r.code,
  );
  freezeAgent(baseline.agentId, false);
}

{
  const r = evaluateMandate({ ...good, extraActions: ["add_gift_cards"] });
  expect(
    "extra actions → EXTRA",
    r.ok === false && r.code === "EXTRA",
    r.ok ? "unexpected pass" : r.code,
  );
}

{
  upsertPolicy({
    agentId: baseline.agentId,
    expiresAt: "2020-01-01T00:00:00.000Z",
  });
  const r = evaluateMandate(good);
  expect(
    "expired mandate → EXPIRED",
    r.ok === false && r.code === "EXPIRED",
    r.ok ? "unexpected pass" : r.code,
  );
  upsertPolicy({
    agentId: baseline.agentId,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  });
}

{
  upsertPolicy({ agentId: baseline.agentId, requireApprovalOverSgd: 50 });
  setActiveAgent(baseline.agentId);
  const issued = await issueCard({
    sku: "ALU-6061-T6",
    merchant: "helix-materials.sg",
    amountSgd: 5_000,
    mandateId: "smoke-mandate",
  });
  expect(
    "local card without MCP (no Fuji spend)",
    issued.ok === true && issued.card.source === "local",
    issued.ok ? issued.card.source : issued.reason,
  );
  if (issued.ok) {
    const over = authorizeRha({
      amount: 100,
      currency: "SGD",
      merchant: "helix-materials.sg",
      sku: "ALU-6061-T6",
      cardOpaqueId: issued.card.opaqueId,
    });
    const under = authorizeRha({
      amount: 40,
      currency: "SGD",
      merchant: "helix-materials.sg",
      sku: "ALU-6061-T6",
      cardOpaqueId: issued.card.opaqueId,
    });
    expect(
      "approval over threshold → APPROVAL",
      over.approved === false && over.code === "APPROVAL",
      over.approved ? `unexpected ${over.code}` : `${over.code}`,
    );
    expect(
      "under approval threshold → APPROVE",
      under.approved === true,
      under.approved ? "ok" : `${under.code}: ${under.reason}`,
    );
  }
  upsertPolicy({ agentId: baseline.agentId, requireApprovalOverSgd: 10_000 });
}

{
  const p = getActivePolicy();
  expect(
    "active policy is smoke agent",
    p.agentId === baseline.agentId && p.status === "active",
    p.agentId,
  );
}

const failed = results.filter((r) => !r.pass);
console.log("");
console.log(
  `Done: ${results.length - failed.length}/${results.length} passed. Fuji XSGD spent: 0.`,
);
if (failed.length) {
  console.error("Failed:", failed.map((f) => f.name).join(", "));
  process.exit(1);
}
