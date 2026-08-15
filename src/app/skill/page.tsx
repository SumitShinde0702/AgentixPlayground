import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

export default function SkillPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto min-h-[100dvh] max-w-3xl px-6 pb-28 pt-28 md:px-10">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mute)]">
          Agent skill
        </p>
        <h1 className="display mt-4 text-[clamp(2.6rem,6vw,4.2rem)]">
          Equip Secure-Procure.
        </h1>
        <p className="mt-6 max-w-[42ch] text-[17px] leading-relaxed text-[var(--ink)]/70">
          Drop this skill into Cursor. When an agent buys, it must call your
          gateway — policy, one-time XSGD card, sealed receipt. No bypass.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href="/skills/secure-procure/SKILL.md"
            download="SKILL.md"
            className="border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 text-[12px] uppercase tracking-[0.14em] text-[var(--paper)]"
          >
            Download SKILL.md
          </a>
          <Link
            href="/api/gateway"
            className="border border-[var(--line)] px-5 py-3 text-[12px] uppercase tracking-[0.14em]"
          >
            Gateway manifest
          </Link>
        </div>

        <section className="mt-16 border-t border-[var(--line)] pt-10">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--mute)]">
            Install
          </p>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-[15px] leading-relaxed text-[var(--ink)]/80">
            <li>
              Create{" "}
              <code className="mono text-[13px]">
                .cursor/skills/secure-procure/
              </code>
            </li>
            <li>
              Save the downloaded file as{" "}
              <code className="mono text-[13px]">SKILL.md</code>
            </li>
            <li>
              Set{" "}
              <code className="mono text-[13px]">SECURE_PROCURE_BASE_URL</code>{" "}
              to this host
            </li>
            <li>
              Optional:{" "}
              <code className="mono text-[13px]">GATEWAY_API_KEY</code> + header{" "}
              <code className="mono text-[13px]">x-secure-procure-key</code>
            </li>
          </ol>
        </section>

        <section className="mt-14 border-t border-[var(--line)] pt-10">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--mute)]">
            Tools
          </p>
          <ul className="mt-4 space-y-3 text-[15px] text-[var(--ink)]/80">
            <li>
              <span className="mono text-[13px]">POST /api/gateway/check</span>{" "}
              — policy gate
            </li>
            <li>
              <span className="mono text-[13px]">POST /api/gateway/pay</span> —
              one-time card + RHA
            </li>
            <li>
              <span className="mono text-[13px]">
                GET /api/gateway/receipt/&#123;id&#125;
              </span>{" "}
              — sealed audit
            </li>
          </ul>
        </section>

        <p className="mt-16 text-[13px] text-[var(--mute)]">
          <Link
            href="/controls"
            className="text-[var(--ink)] underline-offset-2 hover:underline"
          >
            Set agent rails
          </Link>
          {" · "}
          <Link
            href="/demo"
            className="text-[var(--ink)] underline-offset-2 hover:underline"
          >
            Run the demo
          </Link>
        </p>
      </main>
    </>
  );
}
