import { sha256 } from "@/lib/hash";

export type AuditEvent = {
  at: string;
  type: string;
  detail: Record<string, unknown>;
};

export type AuditLog = {
  id: string;
  chain: { hash: string; prev: string | null; event: AuditEvent }[];
  head: string;
};

const logs = new Map<string, AuditLog>();

export function startAudit(id: string) {
  const log: AuditLog = { id, chain: [], head: "genesis" };
  logs.set(id, log);
  return log;
}

export function appendAudit(id: string, type: string, detail: Record<string, unknown>) {
  const log = logs.get(id) ?? startAudit(id);
  const event: AuditEvent = { at: new Date().toISOString(), type, detail };
  const prev = log.chain.at(-1)?.hash ?? null;
  const hash = sha256(JSON.stringify({ prev, event }));
  log.chain.push({ hash, prev, event });
  log.head = hash;
  logs.set(id, log);
  return { hash, prev };
}

export function getAudit(id: string) {
  return logs.get(id) ?? null;
}

export function verifyChain(log: AuditLog) {
  let prev: string | null = null;
  for (const link of log.chain) {
    if (link.prev !== prev) return false;
    const expected = sha256(JSON.stringify({ prev: link.prev, event: link.event }));
    if (expected !== link.hash) return false;
    prev = link.hash;
  }
  return true;
}

export function listAudits() {
  return [...logs.values()];
}
