"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type StickyScrollItem = {
  title: string;
  description: string;
  /** Optional left-column extras (e.g. industry status strip) */
  leftExtra?: React.ReactNode;
  content: React.ReactNode;
};

/**
 * Aceternity-style sticky scroll: left narrative scrolls, right panel sticks
 * and swaps with the active item. On small screens, each fix stacks under its gap.
 */
export function StickyScrollReveal({
  content,
  contentClassName,
}: {
  content: StickyScrollItem[];
  contentClassName?: string;
}) {
  const [activeCard, setActiveCard] = useState(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const nodes = itemRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0),
          );
        if (!visible.length) return;
        const idx = Number(visible[0].target.getAttribute("data-index"));
        if (!Number.isNaN(idx)) setActiveCard(idx);
      },
      { root: null, rootMargin: "-35% 0px -45% 0px", threshold: 0 },
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [content.length]);

  return (
    <div className="relative">
      {/* Mobile: gap then fix, stacked */}
      <div className="flex flex-col gap-14 lg:hidden">
        {content.map((item) => (
          <div key={item.title} className="space-y-6">
            <div>
              <h3 className="display text-[clamp(1.45rem,2.4vw,1.85rem)] leading-tight text-[#e08a6a]">
                {item.title}
              </h3>
              <p className="mt-4 max-w-[40ch] text-[16px] leading-relaxed text-[var(--paper)]/70">
                {item.description}
              </p>
              {item.leftExtra}
            </div>
            <div
              className={cn(
                "border border-white/10 bg-[#111820] p-6",
                contentClassName,
              )}
            >
              {item.content}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: left scroll, right sticky */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_1fr] lg:gap-16 xl:gap-20">
        <div className="relative flex flex-col gap-28 py-4">
          {content.map((item, index) => (
            <div
              key={item.title}
              data-index={index}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              className="min-h-[48vh]"
            >
              <motion.h3
                animate={{ opacity: activeCard === index ? 1 : 0.35 }}
                className="display text-[clamp(1.6rem,2.6vw,2.1rem)] leading-tight text-[#e08a6a]"
              >
                {item.title}
              </motion.h3>
              <motion.p
                animate={{ opacity: activeCard === index ? 0.75 : 0.3 }}
                className="mt-5 max-w-[40ch] text-[17px] leading-relaxed text-[var(--paper)]"
              >
                {item.description}
              </motion.p>
              <motion.div
                animate={{ opacity: activeCard === index ? 1 : 0.35 }}
              >
                {item.leftExtra}
              </motion.div>
            </div>
          ))}
        </div>

        <div className="relative">
          <div
            className={cn(
              "sticky top-28 h-fit border border-white/10 bg-[#111820] p-7 xl:p-8",
              contentClassName,
            )}
          >
            <motion.div
              key={activeCard}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {content[activeCard]?.content}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
