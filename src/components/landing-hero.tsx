"use client";

import { motion } from "motion/react";
import Link from "next/link";

export function LandingHero() {
  return (
    <section className="relative min-h-[100dvh] overflow-hidden">
      <div className="absolute inset-0 grid grid-cols-2">
        <div className="bg-[var(--block)]/90" />
        <div className="bg-[var(--pass)]/90" />
      </div>
      <div className="absolute inset-0 flex items-end justify-between px-6 pb-10 md:px-10 md:pb-14">
        <span className="display text-[18vw] leading-none text-[var(--paper)]/15 md:text-[9vw]">
          BLOCK
        </span>
        <span className="display text-[18vw] leading-none text-[var(--paper)]/15 md:text-[9vw]">
          PASS
        </span>
      </div>
      <div className="relative z-10 flex min-h-[100dvh] flex-col justify-end px-6 pb-24 pt-24 md:px-10 md:pb-28">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="display max-w-[11ch] text-[var(--paper)] text-[clamp(3.4rem,8vw,8.2rem)]"
        >
          Secure-Procure
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-[28ch] text-[17px] leading-snug text-[var(--paper)]/90 md:text-[19px]"
        >
          Agents that buy, without being hijacked.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mt-10"
        >
          <Link
            href="/demo"
            className="inline-flex bg-[var(--paper)] px-6 py-3 text-[13px] uppercase tracking-[0.14em] text-[var(--ink)] transition-transform active:scale-[0.98]"
          >
            Run the live demo
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
