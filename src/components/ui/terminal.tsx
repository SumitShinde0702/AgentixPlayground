"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type TerminalProps = {
  commands: string[];
  outputs?: Record<number, string[]>;
  username?: string;
  className?: string;
  typingSpeed?: number;
  delayBetweenCommands?: number;
  initialDelay?: number;
  enableSound?: boolean;
};

function highlightBash(line: string): ReactNode {
  // Lightweight highlight: command, flags, paths, strings
  const parts = line.split(/(\s+|'[^']*'|"[^"]*"|\S+)/).filter(Boolean);
  return parts.map((part, i) => {
    if (/^\s+$/.test(part)) return <span key={i}>{part}</span>;
    if (
      (part.startsWith("'") && part.endsWith("'")) ||
      (part.startsWith('"') && part.endsWith('"'))
    ) {
      return (
        <span key={i} className="text-amber-200/90">
          {part}
        </span>
      );
    }
    if (part.startsWith("-")) {
      return (
        <span key={i} className="text-sky-300/90">
          {part}
        </span>
      );
    }
    if (part.includes("/") || part.startsWith("$") || part.startsWith(".")) {
      return (
        <span key={i} className="text-emerald-300/85">
          {part}
        </span>
      );
    }
    if (i === 0 || (parts[i - 1] && /^\s+$/.test(parts[i - 1]) && !parts.slice(0, i).some((p) => p.trim() && !p.startsWith("-")))) {
      const isCmd =
        i === 0 ||
        parts.slice(0, i).every((p) => /^\s+$/.test(p) || p.startsWith("sudo"));
      if (isCmd || ["curl", "mkdir", "cd", "cat", "echo", "npx"].includes(part)) {
        return (
          <span key={i} className="font-semibold text-[var(--paper)]">
            {part}
          </span>
        );
      }
    }
    return <span key={i}>{part}</span>;
  });
}

export function Terminal({
  commands,
  outputs = {},
  username = "gatex",
  className,
  typingSpeed = 28,
  delayBetweenCommands = 700,
  initialDelay = 400,
  enableSound = false,
}: TerminalProps) {
  void enableSound;
  const [lines, setLines] = useState<
    { kind: "cmd" | "out" | "prompt"; text: string; done?: boolean }[]
  >([]);
  const [started, setStarted] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);

  const scrollBottom = useCallback(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setStarted(true);
      },
      { threshold: 0.35 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let cancelled = false;

    async function run() {
      await new Promise((r) => setTimeout(r, initialDelay));
      for (let ci = 0; ci < commands.length; ci++) {
        if (cancelled) return;
        const cmd = commands[ci] ?? "";
        setLines((prev) => [
          ...prev,
          { kind: "prompt", text: "" },
          { kind: "cmd", text: "", done: false },
        ]);
        scrollBottom();

        for (let i = 0; i <= cmd.length; i++) {
          if (cancelled) return;
          const slice = cmd.slice(0, i);
          setLines((prev) => {
            const next = [...prev];
            const last = next.length - 1;
            if (next[last]?.kind === "cmd") {
              next[last] = { kind: "cmd", text: slice, done: i === cmd.length };
            }
            return next;
          });
          scrollBottom();
          await new Promise((r) => setTimeout(r, typingSpeed));
        }

        const outs = outputs[ci] ?? [];
        for (const out of outs) {
          if (cancelled) return;
          await new Promise((r) => setTimeout(r, 120));
          setLines((prev) => [...prev, { kind: "out", text: out }]);
          scrollBottom();
        }
        await new Promise((r) => setTimeout(r, delayBetweenCommands));
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    started,
    commands,
    outputs,
    typingSpeed,
    delayBetweenCommands,
    initialDelay,
    scrollBottom,
  ]);

  let cmdIndex = -1;

  return (
    <div
      ref={root}
      className={cn(
        "overflow-hidden rounded-lg border border-white/10 bg-[#0a0e12] shadow-[0_20px_60px_rgba(0,0,0,0.45)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 mono text-[11px] text-white/40">
          GateX — bash
        </span>
      </div>
      <div
        ref={scroller}
        className="mono max-h-[320px] overflow-y-auto px-4 py-4 text-[12px] leading-relaxed text-white/75 md:max-h-[380px] md:text-[13px]"
      >
        {lines.map((line, idx) => {
          if (line.kind === "prompt") return null;
          if (line.kind === "cmd") {
            cmdIndex += 1;
            return (
              <div key={idx} className="whitespace-pre-wrap break-all">
                <span className="text-emerald-400/90">{username}</span>
                <span className="text-white/35">@gatex</span>
                <span className="text-white/35">:~$ </span>
                {highlightBash(line.text)}
                {!line.done ? (
                  <span className="ml-0.5 inline-block h-[1em] w-[0.55ch] animate-pulse bg-white/80 align-middle" />
                ) : null}
              </div>
            );
          }
          return (
            <div
              key={idx}
              className="whitespace-pre-wrap break-all text-white/55"
            >
              {line.text}
            </div>
          );
        })}
        {!started ? (
          <div className="text-white/35">
            <span className="text-emerald-400/90">{username}</span>
            <span>@gatex:~$ </span>
            <span className="inline-block h-[1em] w-[0.55ch] animate-pulse bg-white/50 align-middle" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
