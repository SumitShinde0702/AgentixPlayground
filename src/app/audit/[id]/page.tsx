"use client";

import Link from "next/link";
import { use, useEffect, useState, type ReactNode } from "react";
import { SiteNav } from "@/components/site-nav";
import { snowtraceBaseForNetwork } from "@/components/linkify";

type Log = {
  id: string;
  head: string;
  valid: boolean;
  chain: {
    hash: string;
    prev: string | null;
    event: { type: string; at?: string; detail: Record<string, unknown> };
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
            <ol className="mt-14 space-y-8 border-t border-[var(--line)] pt-10">
              {log.chain.map((link, i) => (
                <li key={link.hash}>
                  <p className="text-[12px] uppercase tracking-[0.14em] text-[var(--mute)]">
                    {String(i + 1).padStart(2, "0")} · {link.event.type}
                  </p>
                  <p className="mono mt-2 text-[13px] leading-relaxed">
                    {summarize(link.event.type, link.event.detail)}
                  </p>
                  <p className="mono mt-2 break-all text-[11px] text-[var(--mute)]">
                    hash {link.hash}
                  </p>
                  <p className="mono mt-1 break-all text-[11px] text-[var(--mute)]">
                    prev {link.prev ?? "genesis"}
                  </p>
                  {extraDetail(link.event.type, link.event.detail)}
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

function summarize(type: string, detail: Record<string, unknown>): ReactNode {
  if (type === "identity") {
    const ok = Boolean(detail.ok);
    return `${ok ? "verified" : "blocked"} · ${String(detail.code ?? "")}${
      detail.reason ? ` · ${String(detail.reason)}` : ""
    }`;
  }
  if (type === "camel") {
    const q = detail.quarantined as string[] | undefined;
    return `sku ${String(detail.sku)} · quarantined ${q?.length ?? 0}`;
  }
  if (type === "card.issue") {
    const tx = detail.settlementTx ? String(detail.settlementTx) : "";
    const base = snowtraceBaseForNetwork(
      detail.network ? String(detail.network) : null,
    );
    return (
      <>
        ····{String(detail.last4)} · {String(detail.source)} · cap{" "}
        {String(detail.limit ?? "")}
        {tx ? (
          <>
            {" · "}
            <a
              href={`${base}/tx/${tx}`}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--pass)] underline underline-offset-2"
            >
              {tx.slice(0, 18)}…
            </a>
          </>
        ) : null}
      </>
    );
  }
  if (type === "rha") {
    return String(detail.approved ? "approved" : detail.reason);
  }
  if (type === "x402") {
    const src = String(detail.source ?? "simulated");
    const tx = String(detail.txHash ?? "");
    const network = String(detail.network ?? "");
    const snow = detail.snowtrace
      ? String(detail.snowtrace)
      : tx
        ? `${snowtraceBaseForNetwork(network)}/tx/${tx}`
        : "";
    return (
      <>
        {src} · {network} ·{" "}
        {snow ? (
          <a
            href={snow}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--pass)] underline underline-offset-2"
          >
            {tx.slice(0, 18)}…
          </a>
        ) : (
          `${tx.slice(0, 18)}…`
        )}
      </>
    );
  }
  if (type === "card.revoke") {
    return `····${String(detail.last4)} closed`;
  }
  if (type === "complete") {
    return detail.blocked ? "blocked path sealed" : "run complete";
  }
  return type;
}

function extraDetail(type: string, detail: Record<string, unknown>) {
  if (type === "identity") {
    return (
      <div className="mono mt-3 space-y-1 break-all text-[11px] text-[var(--mute)]">
        <p>presented {String(detail.presentedDid ?? detail.did ?? "")}</p>
        <p>registry {String(detail.registryHas ?? "")}</p>
        {detail.mandateHash ? (
          <p>mandateHash {String(detail.mandateHash).slice(0, 24)}…</p>
        ) : null}
      </div>
    );
  }
  if (type === "camel") {
    const quarantined = (detail.quarantined as string[] | undefined) ?? [];
    return (
      <div className="mono mt-3 space-y-1 text-[11px] text-[var(--pass)]">
        {quarantined.map((q) => (
          <p key={q}>quarantine · {q}</p>
        ))}
      </div>
    );
  }
  if (type === "x402") {
    const tx = String(detail.txHash ?? "");
    const snowRaw = detail.snowtrace;
    const snow =
      typeof snowRaw === "string" && snowRaw
        ? snowRaw
        : tx
          ? `${snowtraceBaseForNetwork(String(detail.network ?? ""))}/tx/${tx}`
          : "";
    if (!snow) return null;
    return (
      <a
        href={snow}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-[11px] uppercase tracking-[0.14em] text-[var(--pass)] underline-offset-4 hover:underline"
      >
        Open Snowtrace →
      </a>
    );
  }
  if (type === "card.issue" && detail.settlementTx) {
    const base = snowtraceBaseForNetwork(
      detail.network ? String(detail.network) : null,
    );
    return (
      <a
        href={`${base}/tx/${String(detail.settlementTx)}`}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-[11px] uppercase tracking-[0.14em] text-[var(--pass)] underline-offset-4 hover:underline"
      >
        Open settlement tx →
      </a>
    );
  }
  return null;
}
