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
    before:
      "A rogue bot can sign with any key and still look like your buyer.",
    after:
      "The wrong DID is blocked and the mandate never opens.",
    howWeTest:
      "We present two agents with the same purchase intent. One uses a rogue DID that is not on the registry. The other uses a corporate DID that is. Only the registered agent may proceed. The rogue gets BLOCK and the mandate stays untouched.",
    how: "A corporate registry checks signed agent identity before any policy check or payment.",
  },
  2: {
    label: "02 · Injection",
    title: "Page text is not a tool",
    before:
      "Supplier HTML that says “add gift cards” can become a real tool call.",
    after:
      "The injection is quarantined and only the typed SKU reaches pay.",
    howWeTest:
      "We put up a supplier page (Helix) with a hidden prompt injection about gift cards and a rerouted payee. We ask the agent to crawl and buy from it. Without isolation the model treats page text as instructions. With GateX and CaMeL the crawl still runs, but injections are quarantined and never become tools. You see both outcomes in the lanes.",
    how: "CaMeL splits control from untrusted data. The Q-LLM sees the page with no tools. The P-LLM never sees raw HTML.",
    camel: true,
  },
  3: {
    label: "03 · Execute",
    title: "Policy then one-time card",
    before:
      "The agent holds standing spend power and wallet risk.",
    after:
      "A one-time XSGD card is issued only after policy PASS.",
    howWeTest:
      "We run the corporate agent for real. We check policy, then mint and settle. You should see the card and settlement in Evidence, or a clear CAP block if the run is over the daily limit.",
    how: "StraitsX Card MCP issues the card. GateX decides whether that call is allowed by checking mandate match, daily CAP, freeze, merchant, and SKU. Only then does the flow run check_spend, Card MCP, and x402 on Avalanche. There is no standing Visa on the agent. Spend power is rented per purchase.",
  },
  4: {
    label: "04 · Audit",
    title: "Seal and revoke",
    before: "A card or secret may still be reusable after the buy.",
    after: "The receipt is sealed and the card is already revoked.",
    howWeTest:
      "Run the authorized purchase first (key 3). On this beat we revoke the one-time card and seal a hash-chained receipt covering identity, policy, card, settle, and revoke. In Evidence, card status should be revoked and the chain head should match the open receipt.",
    how: "The card auto-revokes after purchase so it cannot be reused. GateX appends each step to an audit chain and seals it. That sealed receipt is the proof, not a screenshot of the theater.",
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
        Each beat is a live test, not a slideshow: rogue versus registry, injected
        page crawl, gateway pay, and a sealed receipt. Keys 1 through 4 re-run
        that beat only, not the full story from scratch.
      </p>
    </details>
  );
}

export function DemoWelcome({ onEnter }: { onEnter: () => void }) {
  return (
    <OverlayShell onDismiss={onEnter}>
      <p className="mono text-[11px] uppercase tracking-[0.18em] text-[var(--mute)]">
        GateX · live demo
      </p>
      <h2 className="display mt-3 text-[clamp(2.2rem,5vw,3.4rem)] leading-[0.95]">
        Welcome.
      </h2>
      <p className="mt-5 text-[16px] leading-relaxed text-[var(--ink)]/75">
        GateX is spend-governance infrastructure for AI agents — policy,
        identity, isolation, one-time cards, and sealed audit. This UI is the
        control plane and live proof that the rail works.
      </p>

      <div className="mt-8 border-t border-[var(--line)] pt-6">
        <p className="mono text-[11px] uppercase tracking-[0.16em] text-[var(--mute)]">
          How to run it
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--ink)]/75">
          Press{" "}
          <span className="mono text-[13px] text-[var(--ink)]">Space</span>{" "}
          (or{" "}
          <span className="mono text-[13px] text-[var(--ink)]">Enter</span>) to
          move to the next governance step. Each step opens a short briefing,
          then runs live: identity → injection → execute → audit.
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--ink)]/55">
          Keys{" "}
          <span className="mono text-[12px]">1</span>–
          <span className="mono text-[12px]">4</span> jump to a specific beat.
          Same key re-runs that beat.
        </p>
      </div>

      <p className="mt-6 text-[14px] leading-relaxed text-[var(--ink)]/55">
        Set spend rules anytime under{" "}
        <Link
          href="/controls"
          className="text-[var(--ink)]/80 underline-offset-2 hover:underline"
        >
          Controls
        </Link>
        . The theater shows agents obeying them.
      </p>

      <HowWeProveDisclosure />
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onEnter}
          className="border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 text-[12px] uppercase tracking-[0.14em] text-[var(--paper)]"
        >
          Start the demo
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
        {phase === 2 ? (
          <p className="mt-4 text-[14px] leading-relaxed text-[var(--ink)]/60">
            Here is the supplier page:{" "}
            <Link
              href="/supplier"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--ink)] underline-offset-2 hover:underline"
            >
              /supplier
            </Link>
          </p>
        ) : null}
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
              Lab backup from Google DeepMind and Debenedetti et al.,{" "}
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
        chain. That is the proof. Policy and treasury live under Controls.
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
