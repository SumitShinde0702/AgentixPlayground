"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";

const CAMEL_PAPER = "https://arxiv.org/abs/2503.18813";
const WELCOME_KEY = "gatex-demo-welcome";

export type DemoPhase = 1 | 2 | 3 | 4;

const PHASE_COPY: Record<
  DemoPhase,
  {
    label: string;
    title: string;
    before: string;
    after: string;
    how: string;
    camel?: boolean;
  }
> = {
  1: {
    label: "01 · Identity",
    title: "Wrong key never pays",
    before: "Rogue bot signs with any key and looks like your buyer.",
    after: "Wrong DID blocked; mandate never opens.",
    how: "Corporate registry checks signed agent identity before policy or pay.",
  },
  2: {
    label: "02 · Injection",
    title: "Page text is not a tool",
    before: "Supplier HTML (“add gift cards”) becomes a tool call.",
    after: "Injection quarantined; only typed SKU reaches pay.",
    how: "CaMeL splits control from untrusted data — Q-LLM sees the page with no tools; P-LLM never sees raw HTML.",
    camel: true,
  },
  3: {
    label: "03 · Execute",
    title: "Policy then one-time card",
    before: "Agent holds standing spend power / wallet risk.",
    after: "One-time XSGD card only after policy PASS.",
    how: "check_spend → Card MCP → x402 / Avalanche; no standing Visa on the agent.",
  },
  4: {
    label: "04 · Audit",
    title: "Seal and revoke",
    before: "Card or secret may still be reusable.",
    after: "Receipt sealed; card already revoked.",
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
      <div className="max-h-[min(90dvh,40rem)] w-full max-w-xl overflow-y-auto border border-[var(--line)] bg-[var(--paper)] p-7 text-[var(--ink)] shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-10">
        {children}
      </div>
    </div>
  );
}

export function shouldShowDemoWelcome(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(WELCOME_KEY) !== "1";
  } catch {
    return true;
  }
}

export function markDemoWelcomeSeen() {
  try {
    sessionStorage.setItem(WELCOME_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function DemoWelcome({ onEnter }: { onEnter: () => void }) {
  const dismiss = () => {
    markDemoWelcomeSeen();
    onEnter();
  };

  return (
    <OverlayShell onDismiss={dismiss}>
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
      <p className="mono mt-6 text-[11px] uppercase tracking-[0.14em] text-[var(--mute)]">
        After enter · press 1–4 or space · each beat explains first
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={dismiss}
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
          How
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--ink)]/75">
          {copy.how}
        </p>
        {copy.camel ? (
          <div className="mt-5">
            <p className="text-[13px] leading-relaxed text-[var(--ink)]/55">
              Proven by Google DeepMind / Debenedetti et al. —{" "}
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
                <p className="display text-[clamp(1.8rem,3vw,2.4rem)] leading-none text-[var(--pass)]">
                  77%
                </p>
                <p className="mt-1 text-[12px] leading-snug text-[var(--ink)]/50">
                  tasks solved with provable security (CaMeL)
                </p>
              </div>
              <div>
                <p className="display text-[clamp(1.8rem,3vw,2.4rem)] leading-none text-[var(--ink)]/40">
                  84%
                </p>
                <p className="mt-1 text-[12px] leading-snug text-[var(--ink)]/50">
                  same benchmark, undefended utility ceiling
                </p>
              </div>
            </div>
            <p className="mono mt-3 text-[11px] tracking-[0.1em] text-[var(--mute)]">
              AgentDojo · near undefended utility, with a guarantee
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
