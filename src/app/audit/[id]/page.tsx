"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { SiteNav } from "@/components/site-nav";

type Log = {
  id: string;
  head: string;
  valid: boolean;
  chain: {
    hash: string;
    event: { type: string; detail: Record<string, unknown> };
  }[];
};

export default function AuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [log, setLog] = useState<Log | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`/api/audit/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          setMissing(true);
          return;
        }
        setLog(await r.json());
      })
      .catch(() => setMissing(true));
  }, [id]);

  return (
    <>
      <SiteNav />
      <main className="mx-auto min-h-[100dvh] max-w-xl px-6 pb-24 pt-28 md:px-10">
        {missing ? (
          <p className="display text-[2.4rem]">Receipt gone</p>
        ) : !log ? (
          <p className="text-[var(--mute)]">Sealing…</p>
        ) : (
          <>
            <p className="text-[12px] uppercase tracking-[0.16em] text-[var(--mute)]">
              Receipt {log.valid ? "sealed" : "broken"}
            </p>
            <h1 className="display mt-4 text-[2.6rem]">{log.id}</h1>
            <p className="mono mt-2 break-all text-[12px] text-[var(--mute)]">
              head {log.head}
            </p>
            <ol className="mt-14 space-y-6 border-t border-[var(--line)] pt-10">
              {log.chain.map((link) => (
                <li key={link.hash}>
                  <p className="text-[12px] uppercase tracking-[0.14em] text-[var(--mute)]">
                    {link.event.type}
                  </p>
                  <p className="mono mt-2 text-[13px] leading-relaxed">
                    {summarize(link.event.type, link.event.detail)}
                  </p>
                </li>
              ))}
            </ol>
          </>
        )}
        <Link
          href="/demo"
          className="mt-16 inline-block text-[12px] uppercase tracking-[0.14em]"
        >
          Back to demo
        </Link>
      </main>
    </>
  );
}

function summarize(type: string, detail: Record<string, unknown>) {
  if (type === "identity") {
    return `${detail.ok ? "verified" : "blocked"} · ${String(detail.code ?? "")}`;
  }
  if (type === "camel") {
    return `sku ${String(detail.sku)}`;
  }
  if (type === "card.issue") {
    return `····${String(detail.last4)} · ${String(detail.source)}`;
  }
  if (type === "rha") {
    return String(detail.approved ? "approved" : detail.reason);
  }
  if (type === "x402") {
    return `${String(detail.network)} · ${String(detail.txHash ?? "").slice(0, 18)}…`;
  }
  if (type === "card.revoke") {
    return `····${String(detail.last4)} closed`;
  }
  return type;
}
