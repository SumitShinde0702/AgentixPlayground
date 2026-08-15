import { sha256 } from "@/lib/hash";
import { tryGetDb } from "@/lib/db/sqlite";

export type AuditEvent = {
  at: string;
  type: string;
  detail: Record<string, unknown>;
};

export type AuditLink = {
  hash: string;
  prev: string | null;
  event: AuditEvent;
};

export type AuditLog = {
  id: string;
  chain: AuditLink[];
  head: string;
};

export type ReceiptOutcome = "block" | "success" | "pending";

export type ReceiptSummary = {
  id: string;
  head: string;
  outcome: ReceiptOutcome;
  createdAt: string;
  updatedAt: string;
  eventCount: number;
  lastType: string | null;
  summary: string;
};

type Meta = { createdAt: string; updatedAt: string; outcome: ReceiptOutcome };

const logs = new Map<string, AuditLog>();
const meta = new Map<string, Meta>();
let hydrated = false;

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  const db = tryGetDb();
  if (!db) return;
  try {
    const rows = db
      .prepare(`SELECT * FROM audits`)
      .all() as {
      id: string;
      head: string;
      outcome: string;
      created_at: string;
      updated_at: string;
      chain_json: string;
    }[];
    for (const row of rows) {
      const log: AuditLog = {
        id: row.id,
        head: row.head,
        chain: JSON.parse(row.chain_json) as AuditLink[],
      };
      logs.set(row.id, log);
      meta.set(row.id, {
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        outcome: (row.outcome as ReceiptOutcome) || deriveOutcome(log),
      });
    }
  } catch (err) {
    console.warn("[gatex] audit hydrate failed", err);
  }
}

export function deriveOutcome(log: AuditLog): ReceiptOutcome {
  for (const link of log.chain) {
    if (link.event.type === "complete") {
      return link.event.detail.blocked === true ? "block" : "success";
    }
    if (
      link.event.type === "gateway.pay_fail" ||
      link.event.type === "identity.fail"
    ) {
      return "block";
    }
  }
  return "pending";
}

function summarizeLog(log: AuditLog): string {
  const complete = [...log.chain]
    .reverse()
    .find((l) => l.event.type === "complete");
  if (complete?.event.detail.blocked === true) {
    const lane = complete.event.detail.lane;
    return lane ? `Blocked (${String(lane)})` : "Blocked";
  }
  const fail = log.chain.find((l) => l.event.type === "gateway.pay_fail");
  if (fail) {
    return String(
      fail.event.detail.reason ?? fail.event.detail.code ?? "Pay failed",
    );
  }
  const card = [...log.chain]
    .reverse()
    .find((l) => l.event.type === "card.issue");
  if (card && complete) {
    const last4 = card.event.detail.last4;
    return last4 ? `Paid · card ••${String(last4)}` : "Paid";
  }
  if (complete) return "Complete";
  const last = log.chain.at(-1);
  return last?.event.type ?? "Empty";
}

function persist(log: AuditLog) {
  const now = new Date().toISOString();
  const outcome = deriveOutcome(log);
  const prev = meta.get(log.id);
  const nextMeta: Meta = {
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
    outcome,
  };
  meta.set(log.id, nextMeta);
  logs.set(log.id, log);

  const db = tryGetDb();
  if (!db) return;
  try {
    db.prepare(
      `INSERT INTO audits (id, head, outcome, created_at, updated_at, chain_json)
       VALUES (@id, @head, @outcome, @created_at, @updated_at, @chain_json)
       ON CONFLICT(id) DO UPDATE SET
         head = excluded.head,
         outcome = excluded.outcome,
         updated_at = excluded.updated_at,
         chain_json = excluded.chain_json`,
    ).run({
      id: log.id,
      head: log.head,
      outcome,
      created_at: nextMeta.createdAt,
      updated_at: nextMeta.updatedAt,
      chain_json: JSON.stringify(log.chain),
    });
  } catch (err) {
    console.warn("[gatex] audit persist failed", err);
  }
}

export function startAudit(id: string) {
  hydrate();
  const existing = logs.get(id);
  if (existing) return existing;
  const log: AuditLog = { id, chain: [], head: "genesis" };
  persist(log);
  return log;
}

export function appendAudit(
  id: string,
  type: string,
  detail: Record<string, unknown>,
) {
  hydrate();
  const log = logs.get(id) ?? startAudit(id);
  const event: AuditEvent = { at: new Date().toISOString(), type, detail };
  const prev = log.chain.at(-1)?.hash ?? null;
  const hash = sha256(JSON.stringify({ prev, event }));
  log.chain.push({ hash, prev, event });
  log.head = hash;
  persist(log);
  return { hash, prev };
}

export function getAudit(id: string) {
  hydrate();
  return logs.get(id) ?? null;
}

export function verifyChain(log: AuditLog) {
  let prev: string | null = null;
  for (const link of log.chain) {
    if (link.prev !== prev) return false;
    const expected = sha256(
      JSON.stringify({ prev: link.prev, event: link.event }),
    );
    if (expected !== link.hash) return false;
    prev = link.hash;
  }
  return true;
}

export function listAudits() {
  hydrate();
  return [...logs.values()];
}

export function listReceipts(
  outcome?: ReceiptOutcome | "all",
): ReceiptSummary[] {
  hydrate();
  const all = [...logs.values()].map((log) => {
    const m = meta.get(log.id);
    const out = m?.outcome ?? deriveOutcome(log);
    return {
      id: log.id,
      head: log.head,
      outcome: out,
      createdAt: m?.createdAt ?? new Date(0).toISOString(),
      updatedAt: m?.updatedAt ?? new Date(0).toISOString(),
      eventCount: log.chain.length,
      lastType: log.chain.at(-1)?.event.type ?? null,
      summary: summarizeLog(log),
    } satisfies ReceiptSummary;
  });

  all.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  if (!outcome || outcome === "all") return all;
  return all.filter((r) => r.outcome === outcome);
}
