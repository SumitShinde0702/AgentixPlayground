"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { DustTransferButton } from "@/components/dust-transfer";

type State = {
  mandate: {
    sku: string;
    capSgd: number;
    merchants: string[];
    expiresAt: string;
    principal: string;
  };
  mandateHash?: string;
  console: {
    identity: { did: string; status: string; reason?: string };
    card: { last4: string; status: string };
    receipt: { id: string | null; head: string | null };
    funding: { amount: string; currency: string; status: string; source?: string };
  };
  settlement: {
    txHash: string;
    network: string;
    source: string;
    amount: string;
    snowtrace?: string;
  } | null;
  chain: {
    configured: boolean;
    agent: string | null;
    merchant: string | null;
    merchantUrl?: string | null;
    balance: { amount: number; snowtrace: string } | null;
    error?: string;
    network: string;
  };
  wallets: {
    agent: string | null;
    merchant: string | null;
    token: string;
    chainId: number;
  };
};

export function ConsoleView() {
  const [data, setData] = useState<State | null>(null);

  const load = useCallback(() => {
    fetch("/api/state")
      .then((r) => r.json())
      .then(setData);
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, [load]);

  const m = data?.mandate;
  const c = data?.console;
  const chain = data?.chain;

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
      {data?.mandateHash ? (
        <p className="mono -mt-6 mb-8 border-b border-[var(--line)] pb-6 text-[11px] text-[var(--mute)]">
          mandateHash {data.mandateHash.slice(0, 32)}…
        </p>
      ) : null}
      <Row
        label="Agent"
        value={
          c ? (
            <>
              {c.identity.status === "pass"
                ? "Pass"
                : c.identity.status === "fail"
                  ? "Fail"
                  : "Idle"}{" "}
              · {c.identity.did.slice(0, 28)}
              {c.identity.status === "fail" && c.identity.reason ? (
                <span className="mt-1 block text-[var(--block)]">
                  {c.identity.reason}
                </span>
              ) : null}
            </>
          ) : (
            "—"
          )
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
            <Link
              href={`/audit/${c.receipt.id}`}
              className="underline-offset-4 hover:underline"
            >
              {c.receipt.id} · {c.receipt.head?.slice(0, 12)}…
            </Link>
          ) : (
            "—"
          )
        }
      />
      <Row
        label="Settlement"
        value={
          data?.settlement ? (
            <>
              {data.settlement.source} · {data.settlement.network} ·{" "}
              {data.settlement.snowtrace ? (
                <a
                  href={data.settlement.snowtrace}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 text-[var(--pass)]"
                >
                  {data.settlement.txHash.slice(0, 18)}…
                </a>
              ) : (
                `${data.settlement.txHash.slice(0, 14)}…`
              )}
              {data.settlement.snowtrace ? (
                <a
                  href={data.settlement.snowtrace}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-[var(--pass)] underline-offset-4 hover:underline"
                >
                  Open Snowtrace →
                </a>
              ) : data.settlement.source === "simulated" ? (
                <span className="mt-1 block text-[var(--mute)]">
                  not on-chain — simulated hash
                </span>
              ) : null}
            </>
          ) : (
            "—"
          )
        }
        tone={data?.settlement?.source === "avalanche" ? "pass" : undefined}
      />
      <Row
        label="Live XSGD"
        value={
          chain?.balance ? (
            <>
              {chain.balance.amount.toFixed(2)} XSGD ·{" "}
              {chain.balance.snowtrace ? (
                <a
                  href={chain.balance.snowtrace}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 text-[var(--pass)]"
                >
                  agent {chain.agent?.slice(0, 10)}…
                </a>
              ) : (
                <>agent {chain.agent?.slice(0, 10)}…</>
              )}
              <a
                href={chain.balance.snowtrace}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block text-[var(--pass)] underline-offset-4 hover:underline"
              >
                Snowtrace token →
              </a>
              {chain.merchant ? (
                chain.merchantUrl ? (
                  <a
                    href={chain.merchantUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-[var(--mute)] underline-offset-2 hover:underline"
                  >
                    payTo {chain.merchant.slice(0, 12)}…
                  </a>
                ) : (
                  <span className="mt-1 block text-[var(--mute)]">
                    payTo {chain.merchant.slice(0, 12)}…
                  </span>
                )
              ) : null}
            </>
          ) : chain?.configured ? (
            `Configured · ${chain.error ?? "balance unread"}`
          ) : (
            "Set AGENT_WALLET_ADDRESS"
          )
        }
        tone={chain?.balance ? "pass" : undefined}
      />

      <div className="mt-10 border-t border-[var(--line)] pt-8">
        <p className="text-[12px] uppercase tracking-[0.16em] text-[var(--mute)]">
          Dust settlement
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--ink)]">
          Send 0.1 XSGD from the agent wallet to the merchant wallet via MetaMask.
          The real txHash replaces the simulated x402 settlement on the next demo
          run.
        </p>
        <div className="mt-5">
          <DustTransferButton
            agent={data?.wallets.agent ?? null}
            merchant={data?.wallets.merchant ?? null}
            token={data?.wallets.token ?? ""}
            chainId={data?.wallets.chainId ?? 43114}
            onSettled={load}
          />
        </div>
      </div>

      <p className="mt-16 text-[13px] text-[var(--mute)]">
        Sandbox funding {c?.funding.amount ?? "12,000.00"}{" "}
        {c?.funding.currency ?? "XSGD"}
        {c?.funding.source ? ` · ${c.funding.source}` : ""}
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
      <div
        className={`mono text-right text-[14px] ${
          tone === "pass"
            ? "text-[var(--pass)]"
            : tone === "block"
              ? "text-[var(--block)]"
              : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
