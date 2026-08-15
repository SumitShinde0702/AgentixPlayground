"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useTransform, useScroll, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

export function TracingBeam({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [svgHeight, setSvgHeight] = useState(0);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const update = () => setSvgHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const y1 = useSpring(
    useTransform(scrollYProgress, [0, 0.8], [50, Math.max(svgHeight, 50)]),
    { stiffness: 500, damping: 90 },
  );
  const y2 = useSpring(
    useTransform(scrollYProgress, [0, 1], [50, Math.max(svgHeight - 200, 50)]),
    { stiffness: 500, damping: 90 },
  );

  return (
    <motion.div
      ref={ref}
      className={cn("relative mx-auto w-full max-w-5xl", className)}
    >
      <div className="absolute top-3 -left-3 md:left-2">
        <motion.div className="ml-[27px] flex h-4 w-4 items-center justify-center rounded-full border border-white/20">
          <motion.div className="h-2 w-2 rounded-full bg-[var(--pass)]" />
        </motion.div>
        <svg
          viewBox={`0 0 20 ${Math.max(svgHeight, 1)}`}
          width="20"
          height={svgHeight}
          className="ml-4 block"
          aria-hidden
        >
          <motion.path
            d={`M 1 0V -36 l 18 24 V ${svgHeight * 0.8} l -18 24V ${svgHeight}`}
            fill="none"
            stroke="rgba(231,235,230,0.14)"
            strokeOpacity="1"
          />
          <motion.path
            d={`M 1 0V -36 l 18 24 V ${svgHeight * 0.8} l -18 24V ${svgHeight}`}
            fill="none"
            stroke="url(#landing-trace-gradient)"
            strokeWidth="1.25"
            className="motion-reduce:hidden"
          />
          <defs>
            <motion.linearGradient
              id="landing-trace-gradient"
              gradientUnits="userSpaceOnUse"
              x1="0"
              x2="0"
              y1={y1}
              y2={y2}
            >
              <stop stopColor="#2c7a62" stopOpacity="0" />
              <stop stopColor="#2c7a62" />
              <stop offset="0.35" stopColor="#c4452d" />
              <stop offset="1" stopColor="#c4452d" stopOpacity="0" />
            </motion.linearGradient>
          </defs>
        </svg>
      </div>
      <div ref={contentRef} className="relative ml-10 md:ml-16">
        {children}
      </div>
    </motion.div>
  );
}
