"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SiteNav } from "@/components/site-nav";

type Tab = "success" | "block" | "all";

type Receipt = {
  id: string;
  head: string;
  outcome: "block" | "success" | "pending";
  createdAt: string;
  updatedAt: string;
  eventCount: number;
  lastType: string | null;
  summary: string;
};

export default function ReceiptsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/receipts?outcome=all");
      const data = (await res.json()) as { receipts?: Receipt[] };
      setReceipts(data.receipts ?? []);
    } catch {
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const success = receipts.filter((r) => r.outcome === "success");
  const blocked = receipts.filter((r) => r.outcome === "block");
  const pending = receipts.filter((r) => r.outcome === "pending");
  const shown =
    tab === "success" ? success : tab === "block" ? blocked : receipts;

  return (
    <>
      <SiteNav />
      <main className="mx-auto min-h-[100dvh] max-w-3xl px-6 pb-28 pt-28 md:px-10">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mute)]">
          SQLite · durable audit
        </p>
        <h1 className="display mt-4 text-[clamp(2.2rem,4vw,3.2rem)] text-[var(--ink)]">
          Receipts
        </h1>
        <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-[var(--mute)]">
          Hash-chained runs that survive restart. Split by success vs block.
        </p>

        <div className="mt-10 flex flex-wrap gap-2 border-b border-[var(--line)] pb-0">
          {(
            [
              ["all", "All", receipts.length],
              ["success", "Success", success.length],
              ["block", "Block", blocked.length],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`border-b-2 px-4 py-3 text-[12px] uppercase tracking-[0.14em] transition-colors ${
                tab === id
                  ? "border-[var(--ink)] text-[var(--ink)]"
                  : "border-transparent text-[var(--mute)] hover:text-[var(--ink)]"
              }`}
            >
              {label}
              <span className="mono ml-2 text-[11px] opacity-60">{count}</span>
            </button>
          ))}
        </div>

        {tab === "all" && pending.length > 0 ? (
          <p className="mt-4 text-[12px] text-[var(--mute)]">
            {pending.length} pending (incomplete chain)
          </p>
        ) : null}

        <div className="mt-8 divide-y divide-[var(--line)] border-t border-[var(--line)]">
          {loading ? (
            <p className="py-10 text-[var(--mute)]">Loading…</p>
          ) : shown.length === 0 ? (
            <p className="py-10 text-[var(--mute)]">
              No receipts yet. Run /demo or gateway pay.
            </p>
          ) : (
            shown.map((r) => (
              <Link
                key={r.id}
                href={`/audit/${r.id}`}
                className="flex flex-col gap-2 py-5 transition-opacity hover:opacity-80 sm:flex-row sm:items-baseline sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <OutcomeBadge outcome={r.outcome} />
                    <span className="mono text-[13px] text-[var(--ink)]">
                      {r.id}
                    </span>
                  </div>
                  <p className="mt-2 text-[14px] text-[var(--mute)]">
                    {r.summary}
                  </p>
                </div>
                <div className="mono shrink-0 text-[11px] text-[var(--mute)]">
                  {formatWhen(r.updatedAt)}
                  <span className="mx-2 opacity-40">·</span>
                  {r.eventCount} events
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </>
  );
}

function OutcomeBadge({ outcome }: { outcome: Receipt["outcome"] }) {
  if (outcome === "success") {
    return (
      <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--pass)]">
        Success
      </span>
    );
  }
  if (outcome === "block") {
    return (
      <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--block)]">
        Block
      </span>
    );
  }
  return (
    <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--mute)]">
      Pending
    </span>
  );
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
