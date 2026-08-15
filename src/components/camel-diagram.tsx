"use client";

import { motion } from "motion/react";

const steps = [
  {
    id: "html",
    label: "Supplier HTML",
    detail: "Untrusted page + hidden injection",
    tone: "border-[var(--block)]/50 bg-[var(--block)]/15 text-[var(--paper)]",
    mute: "text-[var(--paper)]/65",
  },
  {
    id: "q",
    label: "Q-LLM",
    detail: "Quarantined · no tools · schema only",
    tone: "border-white/15 bg-white/5 text-[var(--paper)]",
    mute: "text-[var(--paper)]/60",
  },
  {
    id: "cap",
    label: "Capability",
    detail: "{ sku, price } — not a command",
    tone: "border-[var(--pass)]/45 bg-[var(--pass)]/15 text-[var(--paper)]",
    mute: "text-[var(--paper)]/65",
  },
  {
    id: "p",
    label: "P-LLM",
    detail: "Privileged plan · never sees the page",
    tone: "border-white/20 bg-[#1c2834] text-[var(--paper)]",
    mute: "text-[var(--paper)]/65",
  },
] as const;

export function CamelDiagram() {
  return (
    <div className="mt-8 w-full">
      <p className="mono text-[11px] uppercase tracking-[0.16em] text-[var(--paper)]/45">
        Google DeepMind · CaMeL
      </p>
      <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-[var(--paper)]/65">
        Dual-LLM by design: control stays with the Privileged LLM; untrusted
        content only reaches a Quarantined LLM that returns typed capabilities —
        never tool calls.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{
              duration: 0.45,
              delay: i * 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={`relative border p-4 ${step.tone}`}
          >
            <p className="mono text-[11px] tracking-[0.14em] opacity-50">
              {String(i + 1).padStart(2, "0")}
            </p>
            <p className="display mt-2 text-[1.35rem] leading-none">
              {step.label}
            </p>
            <p className={`mt-3 text-[13px] leading-snug ${step.mute}`}>
              {step.detail}
            </p>
            {i < steps.length - 1 ? (
              <span
                className="pointer-events-none absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 text-[var(--paper)]/35 lg:block"
                aria-hidden
              >
                →
              </span>
            ) : null}
          </motion.div>
        ))}
      </div>

      <div className="mt-4 border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="mono text-[12px] leading-relaxed text-[var(--paper)]/55">
          Injection text never becomes a tool. Q-LLM extracts price · P-LLM plan
          stays frozen on the mandate.
        </p>
      </div>
    </div>
  );
}
