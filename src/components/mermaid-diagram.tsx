"use client";

import { useEffect, useId, useRef } from "react";

export function MermaidDiagram({
  chart,
  className = "",
}: {
  chart: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reactId = useId().replace(/:/g, "");

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const el = ref.current;
      if (!el) return;

      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "neutral",
        securityLevel: "loose",
        fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif",
        flowchart: { curve: "basis", padding: 12 },
        sequence: { actorMargin: 28, messageMargin: 32 },
      });

      const id = `mermaid-${reactId}-${Math.random().toString(36).slice(2, 8)}`;
      try {
        const { svg } = await mermaid.render(id, chart.trim());
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
        }
      } catch (err) {
        if (!cancelled && ref.current) {
          ref.current.innerHTML = `<pre class="mono text-[12px] text-red-700 whitespace-pre-wrap">${String(err)}</pre>`;
        }
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [chart, reactId]);

  return (
    <div
      ref={ref}
      className={`overflow-x-auto rounded-none border border-[var(--line)] bg-white p-4 [&_svg]:mx-auto [&_svg]:max-w-full ${className}`}
    />
  );
}
