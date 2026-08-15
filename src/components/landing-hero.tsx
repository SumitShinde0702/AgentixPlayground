"use client";

import DecryptedText from "@/components/ui/decrypted-text";
import { MovingBorderButton } from "@/components/ui/moving-border";
import { motion } from "motion/react";
import Link from "next/link";

export function LandingHero() {
  return (
    <section className="relative min-h-[100dvh] overflow-hidden bg-[#0a0e14]">
      {/* Anchor low so the boat stays in frame (object-cover otherwise crops it) */}
      <div
        className="absolute inset-0 bg-cover bg-[center_85%]"
        style={{ backgroundImage: "url(/sea-storm/sea-storm/sea-storm.jpg)" }}
        aria-hidden
      />
      <video
        className="landing-hero-video absolute inset-0 h-full w-full object-cover object-[center_85%]"
        autoPlay
        muted
        loop
        playsInline
        poster="/sea-storm/sea-storm/sea-storm.jpg"
        aria-hidden
      >
        <source src="/sea-storm/sea-storm/sea-storm.mp4" type="video/mp4" />
      </video>
      {/* Soft edges only — keep the beam + boat clear */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,transparent_32%,rgba(6,10,16,0.4)_78%,rgba(6,10,16,0.65)_100%)]"
        aria-hidden
      />
      {/* Light bottom wash for type; short so the ship isn't buried */}
      <div
        className="absolute inset-x-0 bottom-0 h-[28%] bg-gradient-to-t from-[rgba(6,10,16,0.72)] to-transparent"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-[100dvh] flex-col justify-end px-6 pb-16 pt-24 md:px-10 md:pb-20">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="display max-w-[11ch] text-[clamp(3.4rem,8vw,8.2rem)] text-[var(--paper)]"
        >
          Secure-Procure
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-[34ch] text-[17px] leading-snug text-[var(--paper)]/90 md:text-[19px]"
        >
          <DecryptedText
            text="Agents that buy, without being hijacked."
            animateOn="view"
            sequential
            speed={28}
            className="text-[var(--paper)]"
            encryptedClassName="text-[var(--paper)]/45"
          />
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mt-10"
        >
          <MovingBorderButton
            as={Link}
            href="/demo"
            duration={2800}
            borderClassName="bg-[radial-gradient(#e7ebe6_40%,transparent_60%)]"
            className="bg-[var(--paper)] text-[var(--ink)]"
          >
            Run the live demo
          </MovingBorderButton>
        </motion.div>
      </div>
    </section>
  );
}
