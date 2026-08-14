"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

type State = {
  mandate: {
    sku: string;
    capSgd: number;
    merchants: string[];
    expiresAt: string;
    principal: string;
  };
  console: {
    identity: { did: string; status: string; reason?: string };
    card: { last4: string; status: string };
    receipt: { id: string | null; head: string | null };
    funding: { amount: string; currency: string; status: string };
  };
};

export function ConsoleView() {
  const [data, setData] = useState<State | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/state")
        .then((r) => r.json())
        .then(setData);
    void load();
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, []);

  const m = data?.mandate;
  const c = data?.console;

  return (
    <main className="mx-auto min-h-[100dvh] max-w-3xl px-6 pb-20 pt-28 md:px-10">
      <p className="display text-[clamp(2.4rem,5vw,4rem)]">Mandate</p>
      <p className="mt-6 border-b border-[var(--line)] pb-8 text-[16px] leading-relaxed text-[var(--ink)]">
        {m ? (
          <>
            {m.sku} · cap S${m.capSgd.toLocaleString("en-SG")} · {m.merchants[0]}{" "}
            · {new Date(m.expiresAt).toUTCString().slice(0, 16)}
          </>
        ) : (
          "Loading"
        )}
      </p>
      <Row
        label="Agent"
        value={
          c
            ? `${c.identity.status === "pass" ? "Pass" : c.identity.status === "fail" ? "Fail" : "Idle"} · ${c.identity.did.slice(0, 28)}`
            : "—"
        }
        tone={
          c?.identity.status === "pass"
            ? "pass"
            : c?.identity.status === "fail"
              ? "block"
              : undefined
        }
      />
      <Row
        label="Card"
        value={
          c
            ? `${c.card.last4 === "—" ? "None" : `····${c.card.last4}`} · ${c.card.status}`
            : "—"
        }
        tone={c?.card.status === "revoked" ? "pass" : undefined}
      />
      <Row
        label="Receipt"
        value={
          c?.receipt.id ? (
            <Link href={`/audit/${c.receipt.id}`} className="underline-offset-4 hover:underline">
              {c.receipt.id} · {c.receipt.head?.slice(0, 12)}…
            </Link>
          ) : (
            "—"
          )
        }
      />
      <p className="mt-16 text-[13px] text-[var(--mute)]">
        Funding {c?.funding.amount ?? "12,000.00"} {c?.funding.currency ?? "XSGD"}
      </p>
    </main>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "pass" | "block";
}) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-[var(--line)] py-7">
      <p className="text-[12px] uppercase tracking-[0.16em] text-[var(--mute)]">
        {label}
      </p>
      <p
        className={`mono text-right text-[14px] ${
          tone === "pass"
            ? "text-[var(--pass)]"
            : tone === "block"
              ? "text-[var(--block)]"
              : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
