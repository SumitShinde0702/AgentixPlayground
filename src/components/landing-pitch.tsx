"use client";

import { CamelDiagram } from "@/components/camel-diagram";
import { SkillTerminalDemo } from "@/components/skill-terminal-demo";
import ScrollReveal from "@/components/ui/scroll-reveal";
import { FlipWords } from "@/components/ui/flip-words";
import { MovingBorderButton } from "@/components/ui/moving-border";
import { StickyScrollReveal } from "@/components/ui/sticky-scroll-reveal";
import { TracingBeam } from "@/components/ui/tracing-beam";
import { motion } from "motion/react";
import Link from "next/link";

const pitch = [
  {
    id: "controls",
    title: "Controls",
    body: "Connect treasury. Set spend, rate, and approval rules in plain language. Freeze anytime.",
  },
  {
    id: "skill",
    title: "Skill",
    body: "Equip GateX in Cursor or any skill-aware agent. Their buys hit your gateway first. Policy runs before a one-time card.",
  },
  {
    id: "identity",
    title: "Identity",
    body: "A rogue bot signs with the wrong key. The registry blocks it. The mandate stays untouched.",
  },
  {
    id: "injection",
    title: "Injection",
    body: "Supplier HTML hides “add $500 in gift cards”. CaMeL keeps that string out of the privileged path.",
  },
  {
    id: "execute",
    title: "Execute",
    body: "A verified agent draws from XSGD treasury, gets a one-time card, passes RHA, then settles on Avalanche with x402.",
  },
  {
    id: "audit",
    title: "Audit",
    body: "Open the receipt. The card is already revoked.",
  },
] as const;

const flipWords = ["control", "equip", "block", "isolate", "settle", "revoke"];

const CAMEL_PAPER = "https://arxiv.org/abs/2503.18813";

function StatusStrip({
  label,
  tone,
}: {
  label: string;
  tone: "danger" | "warn" | "ok";
}) {
  const toneClass =
    tone === "danger"
      ? "bg-[#c4452d] text-[#0c1218]"
      : tone === "warn"
        ? "bg-[#d4a017] text-[#0c1218]"
        : "bg-[#14d47c] text-[#004d40]";

  return (
    <motion.p
      initial={{ opacity: 0.35, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`mono mt-5 px-3 py-2 text-[11px] font-semibold tracking-[0.14em] ${toneClass}`}
    >
      {label}
    </motion.p>
  );
}

function InjectionFix() {
  return (
    <div>
      <p className="mono text-[11px] uppercase tracking-[0.16em] text-[var(--paper)]/45">
        Google DeepMind · CaMeL
      </p>
      <a
        href={CAMEL_PAPER}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 block display text-[clamp(1.25rem,2vw,1.55rem)] leading-snug text-[var(--paper)] transition hover:text-[var(--paper)]/80"
      >
        Defeating Prompt Injections by Design
      </a>
      <a
        href={CAMEL_PAPER}
        target="_blank"
        rel="noopener noreferrer"
        className="mono mt-2 inline-block text-[12px] tracking-[0.08em] text-[var(--paper)]/45 underline-offset-4 hover:text-[var(--paper)]/70 hover:underline"
      >
        arXiv:2503.18813
      </a>
      <p className="mt-5 text-[15px] leading-relaxed text-[var(--paper)]/70">
        CaMeL splits control from untrusted data. The Q-LLM has no tools. The
        P-LLM never sees supplier HTML. We run that split before any card is
        issued.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-8 border-t border-white/10 pt-6">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="display text-[clamp(2.4rem,4vw,3.2rem)] leading-none text-[var(--block)]"
          >
            300
          </motion.p>
          <p className="mt-2 text-[13px] leading-snug text-[var(--paper)]/55">
            successful injections without CaMeL
          </p>
        </div>
        <div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="display text-[clamp(2.4rem,4vw,3.2rem)] leading-none text-[var(--paper)]"
          >
            0
          </motion.p>
          <p className="mt-2 text-[13px] leading-snug text-[var(--paper)]/55">
            with CaMeL on AgentDojo (Gemini 2.5 Pro)
          </p>
        </div>
      </div>
      <p className="mono mt-4 text-[11px] tracking-[0.12em] text-[var(--paper)]/40">
        Debenedetti et al. · Google DeepMind · arXiv:2503.18813
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--paper)]/50">
        Attack success collapses. Utility stays near the undefended ceiling.
      </p>

      <ul className="mt-6 space-y-2 text-[14px] leading-relaxed text-[var(--paper)]/65">
        <li>Q-LLM reads the page and returns a typed capability only.</li>
        <li>P-LLM never sees HTML. The mandate stays frozen.</li>
        <li>Gateway pay cannot invent SKUs outside that plan.</li>
      </ul>

      <StatusStrip label="HANDLED · via CaMeL" tone="ok" />
      <Link
        href="#injection"
        className="mt-5 inline-block text-[13px] uppercase tracking-[0.14em] text-[var(--paper)]/55 transition hover:text-[var(--paper)]"
      >
        See isolation →
      </Link>
    </div>
  );
}

function ImpersonationFix() {
  return (
    <div>
      <p className="mono text-[11px] uppercase tracking-[0.16em] text-[var(--paper)]/45">
        GateX · identity rail
      </p>
      <p className="display mt-3 text-[clamp(1.25rem,2vw,1.55rem)] leading-snug text-[var(--paper)]">
        Wrong key never reaches pay
      </p>
      <p className="mt-5 text-[15px] leading-relaxed text-[var(--paper)]/70">
        This closes our rail, not Visa TAP or Mastercard KYA. Signed agent
        identity is checked before policy and before any one-time card.
      </p>
      <ul className="mt-6 space-y-2 text-[14px] leading-relaxed text-[var(--paper)]/65">
        <li>Signed identity is checked against the registry.</li>
        <li>Wrong key means no mandate and no policy PASS.</li>
        <li>A one-time XSGD card is issued only after that gate.</li>
      </ul>
      <StatusStrip label="HANDLED ON RAIL" tone="ok" />
      <Link
        href="#identity"
        className="mt-5 inline-block text-[13px] uppercase tracking-[0.14em] text-[var(--paper)]/55 transition hover:text-[var(--paper)]"
      >
        See identity →
      </Link>
    </div>
  );
}

const stickyContent = [
  {
    title: "! Prompt injection",
    description:
      "Supplier HTML embeds instructions. A single LLM treats them as tools and can gift-card or redirect spend. Scoped cards only cap damage. They do not stop the instruction.",
    leftExtra: <StatusStrip label="NOT HANDLED" tone="danger" />,
    content: <InjectionFix />,
  },
  {
    title: "! Agent impersonation",
    description:
      "A fraudster’s bot presents itself as your shopping agent. Merchant networks cannot tell the difference. Payment-card identity alone does not close agent auth.",
    leftExtra: <StatusStrip label="PARTIALLY HANDLED" tone="warn" />,
    content: <ImpersonationFix />,
  },
];

const rulePipeline = [
  "Policy",
  "check_spend",
  "request_pay",
  "Receipt",
] as const;

export function LandingPitch() {
  return (
    <div className="bg-[#0c1218] text-[var(--paper)]">
      <div className="px-5 py-24 md:px-8 md:py-32 lg:px-10">
        <TracingBeam>
          <section className="pb-20 md:pb-28">
            <p className="mono text-[11px] uppercase tracking-[0.18em] text-[var(--paper)]/45">
              Out of the box
            </p>
            <ScrollReveal textClassName="display mt-4 text-[clamp(2.6rem,5.5vw,5rem)] text-[var(--paper)] leading-[0.95]">
              Spend governance. Built in.
            </ScrollReveal>
            <p className="mt-6 max-w-[42ch] text-[17px] leading-relaxed text-[var(--paper)]/65">
              A rule machine for agent purchases. Policy, identity, isolation,
              one-time cards, and sealed audit sit on the path.
            </p>
            <p className="mt-4 max-w-[42ch] text-[15px] leading-relaxed text-[var(--paper)]/45">
              The product is the gateway and skill. This UI is the control plane
              and live proof.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2">
              {rulePipeline.map((step, i) => (
                <motion.div
                  key={step}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                >
                  {i > 0 ? (
                    <span className="text-[var(--paper)]/25" aria-hidden>
                      →
                    </span>
                  ) : null}
                  <span className="mono text-[12px] tracking-[0.12em] text-[var(--paper)]/70">
                    {step}
                  </span>
                </motion.div>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/controls"
                className="inline-flex items-center border border-white/20 px-5 py-3 text-[13px] uppercase tracking-[0.14em] text-[var(--paper)]/80 transition hover:border-white/50 hover:text-[var(--paper)]"
              >
                Set the rules
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center text-[13px] uppercase tracking-[0.14em] text-[var(--paper)]/55 transition hover:text-[var(--paper)]"
              >
                See it live →
              </Link>
            </div>
          </section>

          <section className="border-t border-white/10 py-20 md:py-28">
            <ScrollReveal textClassName="display text-[clamp(2.6rem,5.5vw,5rem)] text-[var(--paper)] leading-[0.95]">
              The gaps. Closed on this rail.
            </ScrollReveal>
            <p className="mt-6 max-w-[40ch] text-[17px] leading-relaxed text-[var(--paper)]/65">
              Industry leaves these open. GateX closes the spend path.
            </p>

            <div className="mt-14">
              <StickyScrollReveal content={stickyContent} />
            </div>

            <p className="mt-14 max-w-[44ch] text-[15px] leading-relaxed text-[var(--paper)]/45">
              Scoped XSGD cards still cap damage if something else fails. They
              do not replace isolation or identity.
            </p>
          </section>

          <section className="border-t border-white/10 py-28 md:py-36">
            <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-end md:gap-16">
              <ScrollReveal textClassName="display text-[clamp(2.6rem,5.5vw,5rem)] text-[var(--paper)] leading-[0.95]">
                Only a frozen plan can spend.
              </ScrollReveal>
              <p className="max-w-[34ch] text-[17px] leading-relaxed text-[var(--paper)]/65 md:justify-self-end md:pb-2">
                The mandate locks before tools run. Page content cannot rewrite
                who may pay, how much, or where.
              </p>
            </div>
          </section>

          <section className="border-t border-white/10 py-28 md:py-36">
            <div className="grid gap-10 md:grid-cols-[1.05fr_0.95fr] md:items-end md:gap-16">
              <ScrollReveal textClassName="display text-[clamp(2.6rem,5.5vw,5rem)] text-[var(--paper)] leading-[0.95]">
                Card. Protocol. Chain.
              </ScrollReveal>
              <div className="md:justify-self-end">
                <p className="max-w-[34ch] text-[17px] leading-relaxed text-[var(--paper)]/65">
                  StraitsX issues a one-time XSGD card. x402 settles on Avalanche.
                  The credential is revoked before the receipt is sealed.
                </p>
                <div className="mt-10 flex flex-wrap gap-4">
                  <MovingBorderButton
                    as={Link}
                    href="/demo"
                    duration={2800}
                    borderClassName="bg-[radial-gradient(#c4452d_35%,transparent_60%)]"
                    className="border border-white/10 bg-[var(--paper)] text-[var(--ink)]"
                  >
                    Run the live demo
                  </MovingBorderButton>
                  <Link
                    href="/controls"
                    className="inline-flex items-center border border-white/20 px-5 py-3 text-[13px] uppercase tracking-[0.14em] text-[var(--paper)]/80 transition hover:border-white/50 hover:text-[var(--paper)]"
                  >
                    Set the rules
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section className="border-t border-white/10 py-28 md:py-36">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
              <div>
                <ScrollReveal textClassName="display text-[clamp(2.6rem,5.5vw,5rem)] text-[var(--paper)] leading-[0.95]">
                  A skill for your own AI.
                </ScrollReveal>
                <p className="mt-6 max-w-[34ch] text-[17px] leading-relaxed text-[var(--paper)]/65">
                  Drop GateX into Cursor or any skill-aware agent. Buys hit your
                  gateway for check, pay, and receipt. Spend cannot skip policy.
                </p>
              </div>
              <SkillTerminalDemo />
            </div>
          </section>

          <section className="border-t border-white/10 pt-28 pb-8 md:pt-36">
            <h2 className="display text-[clamp(2.6rem,5.5vw,5rem)] text-[var(--paper)]">
              Six beats.
            </h2>
            <p className="mt-6 max-w-[40ch] text-[17px] leading-relaxed text-[var(--paper)]/65">
              Control plane and skill, then identity, isolation, settlement, and
              proof.
            </p>
            <p className="display mt-8 text-[clamp(1.8rem,3.5vw,2.8rem)]">
              <span className="text-[var(--paper)]/45">We </span>
              <FlipWords words={flipWords} className="text-[var(--block)]" />
              <span className="text-[var(--paper)]/45">.</span>
            </p>

            <div className="mt-20 flex flex-col gap-20 md:gap-28">
              {pitch.map((beat, i) => (
                <motion.div
                  key={beat.title}
                  id={beat.id}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{
                    duration: 0.55,
                    delay: 0.04,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="scroll-mt-28 grid gap-6 border-t border-white/10 pt-10 md:grid-cols-[7rem_1fr] md:gap-10"
                >
                  <p className="mono text-[12px] tracking-[0.16em] text-[var(--paper)]/40">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <div>
                    <h3 className="display text-[clamp(1.9rem,3.5vw,2.8rem)] text-[var(--paper)]">
                      {beat.title}
                    </h3>
                    <p className="mt-4 max-w-[48ch] text-[17px] leading-relaxed text-[var(--paper)]/65">
                      {beat.body}
                    </p>
                    {beat.title === "Injection" ? <CamelDiagram /> : null}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </TracingBeam>
      </div>
    </div>
  );
}
