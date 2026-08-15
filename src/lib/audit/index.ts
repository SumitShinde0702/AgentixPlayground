import { sha256 } from "@/lib/hash";
import { getDb } from "@/lib/db/sqlite";

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

type AuditRow = {
  id: string;
  head: string;
  outcome: string;
  created_at: string;
  updated_at: string;
  chain_json: string;
};

function rowToLog(row: AuditRow): AuditLog {
  return {
    id: row.id,
    head: row.head,
    chain: JSON.parse(row.chain_json) as AuditLink[],
  };
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
    return String(fail.event.detail.reason ?? fail.event.detail.code ?? "Pay failed");
  }
  const card = [...log.chain].reverse().find((l) => l.event.type === "card.issue");
  if (card && complete) {
    const last4 = card.event.detail.last4;
    return last4 ? `Paid · card ••${String(last4)}` : "Paid";
  }
  if (complete) return "Complete";
  const last = log.chain.at(-1);
  return last?.event.type ?? "Empty";
}

function persist(log: AuditLog, createdAt?: string) {
  const now = new Date().toISOString();
  const outcome = deriveOutcome(log);
  getDb()
    .prepare(
      `INSERT INTO audits (id, head, outcome, created_at, updated_at, chain_json)
       VALUES (@id, @head, @outcome, @created_at, @updated_at, @chain_json)
       ON CONFLICT(id) DO UPDATE SET
         head = excluded.head,
         outcome = excluded.outcome,
         updated_at = excluded.updated_at,
         chain_json = excluded.chain_json`,
    )
    .run({
      id: log.id,
      head: log.head,
      outcome,
      created_at: createdAt ?? now,
      updated_at: now,
      chain_json: JSON.stringify(log.chain),
    });
}

export function startAudit(id: string) {
  const existing = getAudit(id);
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
  const log = getAudit(id) ?? startAudit(id);
  const event: AuditEvent = { at: new Date().toISOString(), type, detail };
  const prev = log.chain.at(-1)?.hash ?? null;
  const hash = sha256(JSON.stringify({ prev, event }));
  log.chain.push({ hash, prev, event });
  log.head = hash;

  const row = getDb()
    .prepare(`SELECT created_at FROM audits WHERE id = ?`)
    .get(id) as { created_at: string } | undefined;
  persist(log, row?.created_at);
  return { hash, prev };
}

export function getAudit(id: string) {
  const row = getDb()
    .prepare(`SELECT * FROM audits WHERE id = ?`)
    .get(id) as AuditRow | undefined;
  return row ? rowToLog(row) : null;
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
  const rows = getDb()
    .prepare(`SELECT * FROM audits ORDER BY updated_at DESC`)
    .all() as AuditRow[];
  return rows.map(rowToLog);
}

export function listReceipts(outcome?: ReceiptOutcome | "all"): ReceiptSummary[] {
  const rows =
    !outcome || outcome === "all"
      ? (getDb()
          .prepare(`SELECT * FROM audits ORDER BY updated_at DESC`)
          .all() as AuditRow[])
      : (getDb()
          .prepare(
            `SELECT * FROM audits WHERE outcome = ? ORDER BY updated_at DESC`,
          )
          .all(outcome) as AuditRow[]);

  return rows.map((row) => {
    const log = rowToLog(row);
    return {
      id: row.id,
      head: row.head,
      outcome: (row.outcome as ReceiptOutcome) || deriveOutcome(log),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      eventCount: log.chain.length,
      lastType: log.chain.at(-1)?.event.type ?? null,
      summary: summarizeLog(log),
    };
  });
}
