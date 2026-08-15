"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";

const CAMEL_PAPER = "https://arxiv.org/abs/2503.18813";

export type DemoPhase = 1 | 2 | 3 | 4;

const PHASE_COPY: Record<
  DemoPhase,
  {
    label: string;
    title: string;
    before: string;
    after: string;
    howWeTest: string;
    how: string;
    camel?: boolean;
  }
> = {
  1: {
    label: "01 · Identity",
    title: "Wrong key never pays",
    before: "Rogue bot signs with any key and looks like your buyer.",
    after: "Wrong DID blocked; mandate never opens.",
    howWeTest:
      "Present two agents: a rogue DID not on the registry and a corporate DID that is. Same purchase intent. Watch the registry check — only the registered agent may proceed; rogue gets BLOCK, mandate untouched.",
    how: "Corporate registry checks signed agent identity before policy or pay.",
  },
  2: {
    label: "02 · Injection",
    title: "Page text is not a tool",
    before: "Supplier HTML (“add gift cards”) becomes a tool call.",
    after: "Injection quarantined; only typed SKU reaches pay.",
    howWeTest:
      "Put up a supplier webpage (Helix) with hidden prompt injection (gift cards, reroute payee). Ask the agent to crawl / buy from it. Without isolation the model treats page text as instructions. With GateX/CaMeL the crawl still runs, but injections are quarantined and never become tools — you see both outcomes in the lanes.",
    how: "CaMeL splits control from untrusted data — Q-LLM sees the page with no tools; P-LLM never sees raw HTML.",
    camel: true,
  },
  3: {
    label: "03 · Execute",
    title: "Policy then one-time card",
    before: "Agent holds standing spend power / wallet risk.",
    after: "One-time XSGD card only after policy PASS.",
    howWeTest:
      "Run the corporate agent for real: check policy, mint a one-time card, try to settle. You should see card + settlement in Evidence (or a clear CAP block if over the daily limit).",
    how: "check_spend → Card MCP → x402 / Avalanche; no standing Visa on the agent.",
  },
  4: {
    label: "04 · Audit",
    title: "Seal and revoke",
    before: "Card or secret may still be reusable.",
    after: "Receipt sealed; card already revoked.",
    howWeTest:
      "After a run, open the sealed receipt for that beat. Key 1’s receipt is only the rogue BLOCK. After 3–4, Open receipt for the full authorized chain (card → settle → revoke). Don’t mix them up.",
    how: "Auto-revoke after purchase; the audit chain is the proof.",
  },
};

function OverlayShell({
  children,
  onDismiss,
}: {
  children: ReactNode;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(12,18,24,0.72)] px-5 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[min(90dvh,42rem)] w-full max-w-xl overflow-y-auto border border-[var(--line)] bg-[var(--paper)] p-7 text-[var(--ink)] shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-10">
        {children}
      </div>
    </div>
  );
}

function HowWeProveDisclosure() {
  return (
    <details className="mt-6 border-t border-[var(--line)] pt-5">
      <summary className="mono cursor-pointer text-[11px] uppercase tracking-[0.14em] text-[var(--mute)]">
        How we prove it (not theater-only)
      </summary>
      <p className="mt-3 text-[14px] leading-relaxed text-[var(--ink)]/65">
        Each beat is a live test (rogue vs registry, injected page crawl, gateway
        pay, sealed receipt) — not a slideshow. Keys 1–4 re-run that beat only,
        not the full story from scratch.
      </p>
    </details>
  );
}

export function DemoWelcome({ onEnter }: { onEnter: () => void }) {
  return (
    <OverlayShell onDismiss={onEnter}>
      <p className="mono text-[11px] uppercase tracking-[0.18em] text-[var(--mute)]">
        Live proof
      </p>
      <h2 className="display mt-3 text-[clamp(2.2rem,5vw,3.4rem)] leading-[0.95]">
        Welcome to GateX
      </h2>
      <p className="mt-5 text-[16px] leading-relaxed text-[var(--ink)]/75">
        Agents that buy, without being hijacked.
      </p>
      <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink)]/70">
        GateX is mostly infrastructure — the gateway and equippable skill. This
        UI exists so you can <span className="text-[var(--ink)]">see it work</span>{" "}
        live: block, isolate, settle, seal.
      </p>
      <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink)]/70">
        Spend policy lives in{" "}
        <span className="text-[var(--ink)]">Set the rules</span> — connect
        treasury, set limits, freeze anytime. This theater is the proof run.
      </p>
      <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink)]/70">
        Each beat seals its{" "}
        <span className="text-[var(--ink)]">own receipt</span>. Key{" "}
        <span className="mono text-[13px]">1</span> (rogue) = short “blocked”
        receipt. After{" "}
        <span className="mono text-[13px]">3</span>–
        <span className="mono text-[13px]">4</span> (authorized pay), use{" "}
        <span className="text-[var(--ink)]">Open receipt</span> — that is the
        full chain (card, settle, revoke). Don’t open the rogue receipt after a
        full pay.
      </p>
      <p className="mono mt-6 text-[11px] uppercase tracking-[0.14em] text-[var(--mute)]">
        Press 1 → 2 → 3 → 4 · each beat explains first · keys re-run that beat
        only
      </p>
      <HowWeProveDisclosure />
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onEnter}
          className="border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 text-[12px] uppercase tracking-[0.14em] text-[var(--paper)]"
        >
          Enter the demo
        </button>
        <Link
          href="/controls"
          className="text-[12px] uppercase tracking-[0.14em] text-[var(--ink)]/70 transition hover:text-[var(--ink)]"
        >
          Set the rules →
        </Link>
      </div>
    </OverlayShell>
  );
}

export function DemoPhaseBriefing({
  phase,
  onContinue,
}: {
  phase: DemoPhase;
  onContinue: () => void;
}) {
  const copy = PHASE_COPY[phase];

  return (
    <OverlayShell onDismiss={onContinue}>
      <p className="mono text-[11px] uppercase tracking-[0.18em] text-[var(--mute)]">
        {copy.label}
      </p>
      <h2 className="display mt-3 text-[clamp(1.8rem,4vw,2.6rem)] leading-[0.95]">
        {copy.title}
      </h2>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <p className="mono text-[11px] uppercase tracking-[0.16em] text-[var(--block)]">
            Before
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--block)]">
            {copy.before}
          </p>
        </div>
        <div>
          <p className="mono text-[11px] uppercase tracking-[0.16em] text-[var(--pass)]">
            After
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--pass)]">
            {copy.after}
          </p>
        </div>
      </div>

      <div className="mt-8 border-t border-[var(--line)] pt-6">
        <p className="mono text-[11px] uppercase tracking-[0.16em] text-[var(--mute)]">
          How we test
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--ink)]/75">
          {copy.howWeTest}
        </p>
      </div>

      <div className="mt-6 border-t border-[var(--line)] pt-6">
        <p className="mono text-[11px] uppercase tracking-[0.16em] text-[var(--mute)]">
          How
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--ink)]/75">
          {copy.how}
        </p>
        {copy.camel ? (
          <div className="mt-5">
            <p className="text-[13px] leading-relaxed text-[var(--ink)]/55">
              Lab backup — Google DeepMind / Debenedetti et al.{" "}
              <a
                href={CAMEL_PAPER}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:underline"
              >
                Defeating Prompt Injections by Design
              </a>{" "}
              (arXiv:2503.18813).
            </p>
            <div className="mt-4 grid grid-cols-2 gap-6">
              <div>
                <p className="display text-[clamp(1.8rem,3vw,2.4rem)] leading-none text-[var(--block)]">
                  300
                </p>
                <p className="mt-1 text-[12px] leading-snug text-[var(--ink)]/50">
                  successful injections without CaMeL
                </p>
              </div>
              <div>
                <p className="display text-[clamp(1.8rem,3vw,2.4rem)] leading-none text-[var(--pass)]">
                  0
                </p>
                <p className="mt-1 text-[12px] leading-snug text-[var(--ink)]/50">
                  with CaMeL (Gemini 2.5 Pro · AgentDojo)
                </p>
              </div>
            </div>
            <p className="mono mt-3 text-[11px] tracking-[0.1em] text-[var(--mute)]">
              Attack success collapses · utility stays near 84% undefended
            </p>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="mt-8 border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 text-[12px] uppercase tracking-[0.14em] text-[var(--paper)]"
      >
        Continue
      </button>
    </OverlayShell>
  );
}

export function DemoComplete({
  receiptId,
  blocked,
  onStay,
}: {
  receiptId: string | null;
  blocked?: boolean;
  onStay: () => void;
}) {
  return (
    <OverlayShell onDismiss={onStay}>
      <p className="mono text-[11px] uppercase tracking-[0.18em] text-[var(--mute)]">
        04 · Audit
      </p>
      <h2 className="display mt-3 text-[clamp(2.2rem,5vw,3.2rem)] leading-[0.95]">
        Rail sealed
      </h2>
      <p className="mt-5 text-[15px] leading-relaxed text-[var(--ink)]/75">
        This beat only summarizes the receipt. Next, inspect the sealed hash
        chain — that is the proof. Policy and treasury live under Controls.
      </p>
      {blocked ? (
        <p className="mt-4 text-[14px] leading-relaxed text-[var(--mute)]">
          Spend was stopped by policy (e.g. daily cap). The receipt still proves
          the block.
        </p>
      ) : null}
      <HowWeProveDisclosure />
      <div className="mt-8 flex flex-wrap items-center gap-4">
        {receiptId ? (
          <Link
            href={`/audit/${receiptId}`}
            className="border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 text-[12px] uppercase tracking-[0.14em] text-[var(--paper)]"
          >
            Open sealed receipt
          </Link>
        ) : null}
        <Link
          href="/controls"
          className="border border-[var(--line)] px-5 py-3 text-[12px] uppercase tracking-[0.14em] text-[var(--ink)]"
        >
          Set the rules
        </Link>
        <button
          type="button"
          onClick={onStay}
          className="text-[12px] uppercase tracking-[0.14em] text-[var(--ink)]/60 transition hover:text-[var(--ink)]"
        >
          Stay on theater
        </button>
      </div>
    </OverlayShell>
  );
}
