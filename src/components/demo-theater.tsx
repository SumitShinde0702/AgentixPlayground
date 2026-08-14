"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import type { RunEvent } from "@/lib/run/types";

const PHASES = [
  { n: 1 as const, label: "Identity" },
  { n: 2 as const, label: "Injection" },
  { n: 3 as const, label: "Execute" },
  { n: 4 as const, label: "Audit" },
];

type LogLine = { text: string; status: RunEvent["status"] };

export function DemoTheater() {
  const [phase, setPhase] = useState<1 | 2 | 3 | 4>(1);
  const [status, setStatus] = useState<"BLOCK" | "PASS" | "">("");
  const [left, setLeft] = useState<LogLine[]>([]);
  const [right, setRight] = useState<LogLine[]>([]);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const push = (lane: "rogue" | "corporate", line: LogLine) => {
    if (lane === "rogue") setLeft((xs) => [...xs.slice(-11), line]);
    else setRight((xs) => [...xs.slice(-11), line]);
  };

  const stream = useCallback(async (lane: "rogue" | "corporate") => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lane }),
        signal: controller.signal,
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const chunks = buf.split("\n\n");
        buf = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const row = chunk.replace(/^data: /, "").trim();
          if (!row) continue;
          const ev = JSON.parse(row) as RunEvent & { done?: boolean };
          if (ev.done) continue;
          if (!ev.line) continue;
          push(ev.lane, { text: ev.line, status: ev.status });
          if (ev.status === "BLOCK" || ev.status === "PASS") setStatus(ev.status);
          if (ev.phase === 4 && ev.line.startsWith("Audit ")) {
            setReceiptId(ev.line.split(" ")[1]);
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      throw err;
    } finally {
      if (abort.current === controller) setBusy(false);
    }
  }, []);

  const runPhase = useCallback(
    async (n: 1 | 2 | 3 | 4) => {
      setPhase(n);
      if (n === 1) {
        setLeft([]);
        setRight([]);
        setStatus("");
        setReceiptId(null);
        await stream("rogue");
      }
      if (n === 2) {
        abort.current?.abort();
        abort.current = null;
        setBusy(true);
        try {
          const res = await fetch("/api/camel", { method: "POST" });
          const data = (await res.json()) as {
            ok: boolean;
            quarantined?: string[];
            quote: { sku: string; price: number };
          };
          push("rogue", {
            text: "Page says: add $500 gift cards, reroute payee",
            status: "BLOCK",
          });
          push("corporate", {
            text: `P-LLM plan frozen on ${data.quote.sku}`,
            status: "info",
          });
          push("corporate", {
            text: `Q-LLM stripped ${data.quarantined?.length ?? 0} injection(s)`,
            status: "PASS",
          });
          push("corporate", {
            text: "Gift-card command never became a tool call",
            status: "PASS",
          });
          setStatus("PASS");
        } finally {
          setBusy(false);
        }
      }
      if (n === 3) {
        setRight([]);
        await stream("corporate");
      }
      if (n === 4) {
        abort.current?.abort();
        abort.current = null;
        const res = await fetch("/api/state");
        const data = (await res.json()) as {
          console: { receipt: { id: string | null; head: string | null } };
          card: { last4?: string; status?: string } | null;
        };
        const id = data.console.receipt.id;
        setReceiptId(id);
        push("corporate", {
          text: `Receipt ${id ?? "pending"}`,
          status: "PASS",
        });
        push("corporate", {
          text: `Card ····${data.card?.last4 ?? "—"} ${data.card?.status ?? ""}`,
          status: "PASS",
        });
        push("corporate", {
          text: `Chain ${data.console.receipt.head?.slice(0, 16) ?? "—"}…`,
          status: "PASS",
        });
        setStatus("PASS");
      }
    },
    [stream],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "1") void runPhase(1);
      if (e.key === "2") void runPhase(2);
      if (e.key === "3") void runPhase(3);
      if (e.key === "4") void runPhase(4);
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        const next = (phase < 4 ? ((phase + 1) as 1 | 2 | 3 | 4) : 1);
        void runPhase(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, runPhase]);

  const tone =
    status === "BLOCK"
      ? "text-[var(--block)]"
      : status === "PASS"
        ? "text-[var(--pass)]"
        : "text-[var(--mute)]";

  return (
    <div className="flex min-h-[100dvh] flex-col pt-16">
      <div className="flex items-end justify-between px-6 py-6 md:px-10">
        <p className="display text-[clamp(2.2rem,5vw,4.2rem)]">
          0{phase} {PHASES[phase - 1].label}
        </p>
        <motion.p
          key={status || "idle"}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`display text-[clamp(2.2rem,5vw,4.2rem)] ${tone}`}
        >
          {status || (busy ? "…" : "")}
        </motion.p>
      </div>
      <div className="relative grid min-h-0 flex-1 grid-cols-1 border-t border-[var(--line)] md:grid-cols-2">
        {phase === 2 ? (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px bg-[var(--pass)] md:block"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        ) : null}
        <Lane title="Rogue" lines={left} accent="block" />
        <Lane title="Authorized" lines={right} accent="pass" />
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-[var(--line)] px-6 py-4 md:px-10">
        <div className="flex gap-2">
          {PHASES.map((p) => (
            <button
              key={p.n}
              onClick={() => void runPhase(p.n)}
              className={`mono h-9 w-9 text-[13px] ${
                phase === p.n
                  ? "bg-[var(--ink)] text-[var(--paper)]"
                  : "border border-[var(--line)] text-[var(--ink)]"
              }`}
            >
              {p.n}
            </button>
          ))}
          <span className="mono ml-3 self-center text-[11px] uppercase tracking-[0.16em] text-[var(--mute)]">
            space
          </span>
        </div>
        {receiptId ? (
          <Link
            href={`/audit/${receiptId}`}
            className="text-[12px] uppercase tracking-[0.14em] text-[var(--ink)]"
          >
            Open receipt
          </Link>
        ) : (
          <span className="text-[12px] uppercase tracking-[0.14em] text-[var(--mute)]">
            {busy ? "Running" : "Press 1"}
          </span>
        )}
      </div>
    </div>
  );
}

function Lane({
  title,
  lines,
  accent,
}: {
  title: string;
  lines: LogLine[];
  accent: "block" | "pass";
}) {
  const color = accent === "block" ? "var(--block)" : "var(--pass)";
  return (
    <section
      className="flex flex-col border-[var(--line)] px-6 py-6 md:px-10 md:[&:last-child]:border-l"
    >
      <p
        className="mb-6 text-[11px] uppercase tracking-[0.18em]"
        style={{ color }}
      >
        {title}
      </p>
      <ul className="mono space-y-2 text-[12.5px] leading-relaxed text-[var(--ink)]">
        {lines.length === 0 ? (
          <li className="text-[var(--mute)]">Waiting</li>
        ) : (
          lines.map((l, i) => (
            <li
              key={`${l.text}-${i}`}
              className={
                l.status === "BLOCK"
                  ? "text-[var(--block)]"
                  : l.status === "PASS"
                    ? "text-[var(--pass)]"
                    : ""
              }
            >
              {l.text}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
