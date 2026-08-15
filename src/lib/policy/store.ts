import { MANDATE, agentWalletAddress, mandateExpiryIso } from "@/lib/config";
import { getDb } from "@/lib/db/sqlite";
import { nonce } from "@/lib/hash";

export type AgentPolicy = {
  agentId: string;
  label: string;
  did: string;
  status: "active" | "frozen";
  treasuryAddress: string;
  merchants: string[];
  skuAllowlist: string[];
  maxPerTxSgd: number;
  maxPerDaySgd: number;
  maxPerWeekSgd: number;
  maxTxPerHour: number;
  requireApprovalOverSgd: number;
  autoRevokeAfterPurchase: boolean;
  notes?: string;
  updatedAt: string;
  expiresAt: string;
  principal: string;
};

export type SpendBucket = {
  amountSgd: number;
  count: number;
  windowStart: number;
};

type SpendLedger = {
  day: SpendBucket;
  week: SpendBucket;
  hour: SpendBucket;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const HOUR_MS = 60 * 60 * 1000;

let activeAgentId: string = MANDATE.agentId;
const policies = new Map<string, AgentPolicy>();
const ledgers = new Map<string, SpendLedger>();
let hydrated = false;

function hydrateFromDb() {
  if (hydrated) return;
  hydrated = true;
  const db = getDb();
  for (const row of db
    .prepare(`SELECT agent_id, json FROM policies`)
    .all() as { agent_id: string; json: string }[]) {
    policies.set(row.agent_id, JSON.parse(row.json) as AgentPolicy);
  }
  for (const row of db
    .prepare(`SELECT agent_id, json FROM ledgers`)
    .all() as { agent_id: string; json: string }[]) {
    ledgers.set(row.agent_id, JSON.parse(row.json) as SpendLedger);
  }
  const meta = db
    .prepare(`SELECT value FROM meta WHERE key = 'active_agent_id'`)
    .get() as { value: string } | undefined;
  if (meta?.value && policies.has(meta.value)) {
    activeAgentId = meta.value;
  }
}

function savePolicy(policy: AgentPolicy) {
  getDb()
    .prepare(
      `INSERT INTO policies (agent_id, json) VALUES (?, ?)
       ON CONFLICT(agent_id) DO UPDATE SET json = excluded.json`,
    )
    .run(policy.agentId, JSON.stringify(policy));
}

function saveLedger(agentId: string, ledger: SpendLedger) {
  getDb()
    .prepare(
      `INSERT INTO ledgers (agent_id, json) VALUES (?, ?)
       ON CONFLICT(agent_id) DO UPDATE SET json = excluded.json`,
    )
    .run(agentId, JSON.stringify(ledger));
}

function saveActiveAgent() {
  getDb()
    .prepare(
      `INSERT INTO meta (key, value) VALUES ('active_agent_id', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(activeAgentId);
}

function emptyLedger(): SpendLedger {
  const now = Date.now();
  return {
    day: { amountSgd: 0, count: 0, windowStart: now },
    week: { amountSgd: 0, count: 0, windowStart: now },
    hour: { amountSgd: 0, count: 0, windowStart: now },
  };
}

function seedPolicy(did: string): AgentPolicy {
  return {
    agentId: MANDATE.agentId,
    label: "Apex Procure",
    did,
    status: "active",
    treasuryAddress: agentWalletAddress(),
    merchants: [...MANDATE.merchants],
    skuAllowlist: [MANDATE.sku],
    maxPerTxSgd: MANDATE.maxPerTx,
    maxPerDaySgd: MANDATE.capSgd,
    maxPerWeekSgd: MANDATE.capSgd,
    maxTxPerHour: 12,
    requireApprovalOverSgd: 10_000,
    autoRevokeAfterPurchase: true,
    notes: undefined,
    updatedAt: new Date().toISOString(),
    expiresAt: mandateExpiryIso(),
    principal: MANDATE.principal,
  };
}

/** Corporate DID is set once identity module registers the seed policy. */
export function ensureSeedPolicy(corporateDid: string) {
  hydrateFromDb();
  if (!policies.has(MANDATE.agentId)) {
    const p = seedPolicy(corporateDid);
    policies.set(MANDATE.agentId, p);
    const ledger = emptyLedger();
    ledgers.set(MANDATE.agentId, ledger);
    savePolicy(p);
    saveLedger(MANDATE.agentId, ledger);
  } else {
    const p = policies.get(MANDATE.agentId)!;
    if (!p.did) {
      p.did = corporateDid;
      policies.set(MANDATE.agentId, p);
      savePolicy(p);
    }
  }
}

export function listPolicies(): AgentPolicy[] {
  hydrateFromDb();
  return [...policies.values()].sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : -1,
  );
}

export function getPolicy(agentId?: string): AgentPolicy | null {
  hydrateFromDb();
  const id = agentId || activeAgentId;
  return policies.get(id) ?? null;
}

export function getActivePolicy(): AgentPolicy {
  hydrateFromDb();
  if (!policies.has(activeAgentId)) {
    // Lazy seed before identity module finishes wiring DID
    ensureSeedPolicy("");
  }
  const p = policies.get(activeAgentId);
  if (!p) {
    throw new Error("No active policy");
  }
  return p;
}

export function setActiveAgent(agentId: string) {
  hydrateFromDb();
  if (!policies.has(agentId)) throw new Error(`Unknown agent ${agentId}`);
  activeAgentId = agentId;
  saveActiveAgent();
  return getActivePolicy();
}

export function getActiveAgentId() {
  hydrateFromDb();
  return activeAgentId;
}

export type PolicyPatch = Partial<
  Omit<AgentPolicy, "agentId" | "did" | "updatedAt">
> & { agentId?: string };

export function upsertPolicy(patch: PolicyPatch & { agentId: string; did?: string; label?: string }) {
  hydrateFromDb();
  const existing = policies.get(patch.agentId);
  const next: AgentPolicy = {
    agentId: patch.agentId,
    label: patch.label ?? existing?.label ?? patch.agentId,
    did: patch.did ?? existing?.did ?? "",
    status: patch.status ?? existing?.status ?? "active",
    treasuryAddress:
      patch.treasuryAddress ??
      existing?.treasuryAddress ??
      agentWalletAddress(),
    merchants: patch.merchants ?? existing?.merchants ?? [...MANDATE.merchants],
    skuAllowlist:
      patch.skuAllowlist ?? existing?.skuAllowlist ?? [MANDATE.sku],
    maxPerTxSgd: patch.maxPerTxSgd ?? existing?.maxPerTxSgd ?? MANDATE.maxPerTx,
    maxPerDaySgd:
      patch.maxPerDaySgd ?? existing?.maxPerDaySgd ?? MANDATE.capSgd,
    maxPerWeekSgd:
      patch.maxPerWeekSgd ?? existing?.maxPerWeekSgd ?? MANDATE.capSgd,
    maxTxPerHour: patch.maxTxPerHour ?? existing?.maxTxPerHour ?? 12,
    requireApprovalOverSgd:
      patch.requireApprovalOverSgd ??
      existing?.requireApprovalOverSgd ??
      10_000,
    autoRevokeAfterPurchase:
      patch.autoRevokeAfterPurchase ??
      existing?.autoRevokeAfterPurchase ??
      true,
    notes: patch.notes !== undefined ? patch.notes : existing?.notes,
    updatedAt: new Date().toISOString(),
    expiresAt: patch.expiresAt ?? existing?.expiresAt ?? mandateExpiryIso(),
    principal: patch.principal ?? existing?.principal ?? MANDATE.principal,
  };
  policies.set(next.agentId, next);
  savePolicy(next);
  if (!ledgers.has(next.agentId)) {
    const ledger = emptyLedger();
    ledgers.set(next.agentId, ledger);
    saveLedger(next.agentId, ledger);
  }
  return next;
}

export function freezeAgent(agentId: string, frozen = true) {
  hydrateFromDb();
  const p = policies.get(agentId);
  if (!p) throw new Error(`Unknown agent ${agentId}`);
  p.status = frozen ? "frozen" : "active";
  p.updatedAt = new Date().toISOString();
  policies.set(agentId, p);
  savePolicy(p);
  return p;
}

function rollBucket(bucket: SpendBucket, windowMs: number, now: number) {
  if (now - bucket.windowStart >= windowMs) {
    bucket.amountSgd = 0;
    bucket.count = 0;
    bucket.windowStart = now;
  }
}

export function getSpendSnapshot(agentId = activeAgentId) {
  hydrateFromDb();
  const ledger = ledgers.get(agentId) ?? emptyLedger();
  const now = Date.now();
  rollBucket(ledger.day, DAY_MS, now);
  rollBucket(ledger.week, WEEK_MS, now);
  rollBucket(ledger.hour, HOUR_MS, now);
  ledgers.set(agentId, ledger);
  saveLedger(agentId, ledger);
  return {
    daySpentSgd: ledger.day.amountSgd,
    weekSpentSgd: ledger.week.amountSgd,
    hourTxCount: ledger.hour.count,
  };
}

export function checkSpendLimits(
  amountSgd: number,
  policy = getActivePolicy(),
): { ok: true } | { ok: false; reason: string; code: string } {
  if (policy.status === "frozen") {
    return { ok: false, reason: "Agent is frozen", code: "FROZEN" };
  }
  const snap = getSpendSnapshot(policy.agentId);
  if (amountSgd > policy.maxPerTxSgd) {
    return {
      ok: false,
      reason: `Amount S$${amountSgd} exceeds per-tx S$${policy.maxPerTxSgd}`,
      code: "CAP",
    };
  }
  if (snap.daySpentSgd + amountSgd > policy.maxPerDaySgd) {
    return {
      ok: false,
      reason: `Would exceed daily cap S$${policy.maxPerDaySgd} (spent ${snap.daySpentSgd})`,
      code: "DAY",
    };
  }
  if (snap.weekSpentSgd + amountSgd > policy.maxPerWeekSgd) {
    return {
      ok: false,
      reason: `Would exceed weekly cap S$${policy.maxPerWeekSgd}`,
      code: "WEEK",
    };
  }
  if (snap.hourTxCount >= policy.maxTxPerHour) {
    return {
      ok: false,
      reason: `Hourly rate limit ${policy.maxTxPerHour} tx reached`,
      code: "RATE",
    };
  }
  return { ok: true };
}

export function recordSpend(amountSgd: number, agentId = activeAgentId) {
  hydrateFromDb();
  const ledger = ledgers.get(agentId) ?? emptyLedger();
  const now = Date.now();
  rollBucket(ledger.day, DAY_MS, now);
  rollBucket(ledger.week, WEEK_MS, now);
  rollBucket(ledger.hour, HOUR_MS, now);
  ledger.day.amountSgd += amountSgd;
  ledger.week.amountSgd += amountSgd;
  ledger.hour.count += 1;
  ledgers.set(agentId, ledger);
  saveLedger(agentId, ledger);
  return getSpendSnapshot(agentId);
}

/** Demo theater: clear spend buckets so a fresh 1→4 pass is not CAP-blocked. */
export function resetSpendLedger(agentId = activeAgentId) {
  hydrateFromDb();
  const ledger = emptyLedger();
  ledgers.set(agentId, ledger);
  saveLedger(agentId, ledger);
  return getSpendSnapshot(agentId);
}

export function sleepScore(policy = getActivePolicy()) {
  const checks = [
    {
      id: "active",
      label: "Agent not frozen",
      ok: policy.status === "active",
    },
    {
      id: "daily",
      label: "Daily spend cap set",
      ok: policy.maxPerDaySgd > 0 && policy.maxPerDaySgd <= 50_000,
    },
    {
      id: "approval",
      label: "Approval threshold on",
      ok: policy.requireApprovalOverSgd > 0,
    },
    {
      id: "merchant",
      label: "Merchant allowlist locked",
      ok: policy.merchants.length > 0,
    },
    {
      id: "sku",
      label: "SKU allowlist locked",
      ok: policy.skuAllowlist.length > 0,
    },
    {
      id: "revoke",
      label: "Auto-revoke after purchase",
      ok: policy.autoRevokeAfterPurchase,
    },
    {
      id: "rate",
      label: "Hourly rate limit on",
      ok: policy.maxTxPerHour > 0 && policy.maxTxPerHour <= 60,
    },
  ] as const;
  const passed = checks.filter((c) => c.ok).length;
  return {
    score: Math.round((passed / checks.length) * 100),
    passed,
    total: checks.length,
    checks,
  };
}

export function newAgentId(label: string) {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return `${slug || "agent"}-${nonce(4)}`;
}
