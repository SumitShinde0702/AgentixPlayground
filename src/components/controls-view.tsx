"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { ControlsTreasury } from "@/components/controls-treasury";
import type { AgentPolicy } from "@/lib/policy/store";

type Sleep = {
  score: number;
  passed: number;
  total: number;
  checks: { id: string; label: string; ok: boolean }[];
};

type Spend = {
  daySpentSgd: number;
  weekSpentSgd: number;
  hourTxCount: number;
};

type AgentRow = AgentPolicy & {
  sleep: Sleep;
  spend: Spend;
};

type PolicyState = {
  activeAgentId: string;
  policy: AgentPolicy;
  policies: AgentRow[];
};

const NL_EXAMPLES = [
  "Never more than $200 a day, max $50 per purchase",
  "Only helix-materials.sg, anything over $40 needs my approval",
  "Max 3 purchases per hour, auto-revoke after buy",
  "Freeze the agent",
];

function policyVerdict(sleep: Sleep) {
  if (sleep.score >= 85) return "Policy locked";
  if (sleep.score >= 60) return "Policy needs tightening";
  return "Policy incomplete";
}

export function ControlsView() {
  const [data, setData] = useState<PolicyState | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nl, setNl] = useState("");
  const [pending, setPending] = useState<{
    patch: Partial<AgentPolicy>;
    summary: string;
    warnings: string[];
  } | null>(null);
  const [agentName, setAgentName] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/policy");
    const j = (await r.json()) as PolicyState;
    setData(j);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeId = data?.activeAgentId;
  const expanded = data?.policies.find((p) => p.agentId === expandedId) ?? null;
  const treasuryAddress =
    expanded?.treasuryAddress || data?.policy.treasuryAddress;

  function toggleExpand(agentId: string) {
    setPending(null);
    setNl("");
    setExpandedId((cur) => (cur === agentId ? null : agentId));
  }

  async function parseNl(agentId: string) {
    if (!nl.trim()) return;
    setBusy(true);
    try {
      const r = await fetch("/api/policy/nl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: nl, agentId }),
      });
      const j = await r.json();
      setPending({
        patch: j.patch,
        summary: j.summary,
        warnings: j.warnings ?? [],
      });
    } finally {
      setBusy(false);
    }
  }

  async function applyPending(agentId: string) {
    if (!pending) return;
    setBusy(true);
    try {
      await fetch("/api/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pending.patch, agentId }),
      });
      setPending(null);
      setNl("");
      setFlash("Policy saved for this agent.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function saveFields(agentId: string, patch: Partial<AgentPolicy>) {
    setBusy(true);
    try {
      await fetch("/api/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patch, agentId }),
      });
      setFlash("Saved.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function createAgent() {
    if (!agentName.trim()) return;
    setBusy(true);
    try {
      const r = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: agentName }),
      });
      const j = (await r.json()) as { agent?: { id: string } };
      setAgentName("");
      setFlash("Agent created.");
      await load();
      if (j.agent?.id) {
        setExpandedId(j.agent.id);
        setPending(null);
        setNl("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleFreeze(agent: AgentRow) {
    setBusy(true);
    try {
      await fetch("/api/agents/freeze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.agentId,
          frozen: agent.status !== "frozen",
        }),
      });
      setFlash(agent.status === "frozen" ? "Unfrozen." : "Frozen.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function makeActive(agentId: string, label: string) {
    setBusy(true);
    try {
      await fetch("/api/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, setActive: true }),
      });
      setFlash(`${label} is active for the demo.`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function useTreasury(address: string) {
    const target = expandedId || activeId;
    if (!target) return;
    await saveFields(target, { treasuryAddress: address });
  }

  return (
    <>
      <SiteNav />
      <main className="mx-auto min-h-[100dvh] max-w-3xl px-6 pb-28 pt-28 md:px-10">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mute)]">
          Control plane
        </p>
        <h1 className="display mt-4 text-[clamp(2.8rem,7vw,4.8rem)]">
          Bound every
          <br />
          agent spend.
        </h1>
        <p className="mt-6 max-w-[40ch] text-[17px] leading-relaxed text-[var(--ink)]/70">
          Define hard limits, merchant allowlists, and approval thresholds.
          Agents cannot exceed these rails — even when no one is watching.
        </p>

        {flash ? (
          <p className="mt-6 text-[14px] text-[var(--pass)]" role="status">
            {flash}
          </p>
        ) : null}

        <ControlsTreasury
          treasuryAddress={treasuryAddress}
          onUseTreasury={useTreasury}
        />

        <section className="border-t border-[var(--line)] pt-14">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--mute)]">
            Agents
          </p>
          <h2 className="display mt-3 text-[clamp(1.8rem,3.5vw,2.6rem)]">
            Your agents
          </h2>
          <p className="mt-3 max-w-[36ch] text-[15px] text-[var(--ink)]/65">
            Open an agent to set spend limits, approvals, and freeze.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <input
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Agent name"
              className="min-w-[12rem] flex-1 border border-[var(--line)] bg-transparent px-4 py-2.5 text-[15px] outline-none focus:border-[var(--ink)]"
            />
            <button
              type="button"
              disabled={busy || !agentName.trim()}
              onClick={() => void createAgent()}
              className="border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-[12px] uppercase tracking-[0.14em] text-[var(--paper)] disabled:opacity-40"
            >
              Create agent
            </button>
          </div>

          <ul className="mt-12 divide-y divide-[var(--line)] border-t border-[var(--line)]">
            {(data?.policies ?? []).map((p) => {
              const open = expandedId === p.agentId;
              const isActive = p.agentId === activeId;
              return (
                <li key={p.agentId}>
                  <button
                    type="button"
                    onClick={() => toggleExpand(p.agentId)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-4 py-6 text-left transition hover:bg-[var(--paper-deep)]/30"
                  >
                    <div>
                      <p className="text-[1.25rem] font-medium tracking-tight">
                        {p.label}
                      </p>
                      <p className="mt-1 text-[12px] text-[var(--mute)]">
                        <span
                          className={
                            p.status === "frozen"
                              ? "text-[var(--block)]"
                              : "text-[var(--pass)]"
                          }
                        >
                          {p.status}
                        </span>
                        {isActive ? " · demo active" : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 border px-4 py-2.5 text-[12px] uppercase tracking-[0.14em] ${
                        open
                          ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
                          : "border-[var(--ink)] text-[var(--ink)]"
                      }`}
                    >
                      {open ? "Close" : "Set controls"}
                    </span>
                  </button>

                  {open ? (
                    <div className="border-t border-[var(--line)] pb-10 pt-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void toggleFreeze(p)}
                          className={`border px-4 py-2 text-[11px] uppercase tracking-[0.14em] ${
                            p.status === "frozen"
                              ? "border-[var(--pass)] text-[var(--pass)]"
                              : "border-[var(--block)] text-[var(--block)]"
                          }`}
                        >
                          {p.status === "frozen" ? "Unfreeze" : "Freeze"}
                        </button>
                        {!isActive ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void makeActive(p.agentId, p.label)}
                            className="border border-[var(--line)] px-4 py-2 text-[11px] uppercase tracking-[0.14em]"
                          >
                            Make active
                          </button>
                        ) : (
                          <span className="text-[12px] text-[var(--pass)]">
                            Active for Execute demo
                          </span>
                        )}
                      </div>
                      <p className="mono mt-4 break-all text-[10px] text-[var(--mute)]">
                        {p.did}
                      </p>

                      {/* Natural language — above number controls */}
                      <div className="mt-8">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--mute)]">
                          Natural language
                        </p>
                        <p className="mt-2 text-[15px] text-[var(--ink)]/70">
                          Describe hard limits in plain English — they map onto
                          the controls below.
                        </p>
                        <textarea
                          value={nl}
                          onChange={(e) => setNl(e.target.value)}
                          rows={3}
                          placeholder="e.g. Never more than $200 a day, max $50 per purchase…"
                          className="mt-4 w-full resize-y border border-[var(--line)] bg-transparent px-4 py-3 text-[15px] leading-relaxed outline-none focus:border-[var(--ink)]"
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          {NL_EXAMPLES.map((ex) => (
                            <button
                              key={ex}
                              type="button"
                              onClick={() => setNl(ex)}
                              className="border border-[var(--line)] px-3 py-1.5 text-[11px] text-[var(--mute)] transition hover:border-[var(--ink)] hover:text-[var(--ink)]"
                            >
                              {ex}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          disabled={busy || !nl.trim()}
                          onClick={() => void parseNl(p.agentId)}
                          className="mt-4 border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-[12px] uppercase tracking-[0.14em] text-[var(--paper)] disabled:opacity-40"
                        >
                          Set policy
                        </button>
                        {pending ? (
                          <div className="mt-5 border border-[var(--line)] bg-[var(--paper-deep)]/40 px-4 py-4">
                            <p className="text-[14px]">{pending.summary}</p>
                            {pending.warnings.map((w) => (
                              <p
                                key={w}
                                className="mt-2 text-[12px] text-[var(--block)]"
                              >
                                {w}
                              </p>
                            ))}
                            <div className="mt-4 flex gap-3">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void applyPending(p.agentId)}
                                className="border border-[var(--pass)] bg-[var(--pass)] px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-[var(--paper)]"
                              >
                                Apply
                              </button>
                              <button
                                type="button"
                                onClick={() => setPending(null)}
                                className="border border-[var(--line)] px-4 py-2 text-[11px] uppercase tracking-[0.12em]"
                              >
                                Discard
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Controls */}
                      <div className="mt-10 border-t border-[var(--line)] pt-8">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--mute)]">
                          Controls
                        </p>
                        <div className="mt-6 grid gap-6 sm:grid-cols-2">
                          {(
                            [
                              ["maxPerTxSgd", "Per transaction", p.maxPerTxSgd],
                              ["maxPerDaySgd", "Per day", p.maxPerDaySgd],
                              ["maxPerWeekSgd", "Per week", p.maxPerWeekSgd],
                              ["maxTxPerHour", "Tx per hour", p.maxTxPerHour],
                              [
                                "requireApprovalOverSgd",
                                "Approval over",
                                p.requireApprovalOverSgd,
                              ],
                            ] as const
                          ).map(([key, label, value]) => (
                            <label key={key} className="block">
                              <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--mute)]">
                                {label}
                              </span>
                              <input
                                type="number"
                                defaultValue={value}
                                key={`${p.agentId}-${key}-${value}`}
                                onBlur={(e) => {
                                  const n = Number(e.target.value);
                                  if (!Number.isFinite(n) || n === value)
                                    return;
                                  void saveFields(p.agentId, { [key]: n });
                                }}
                                className="mono mt-2 w-full border-b border-[var(--line)] bg-transparent py-2 text-[18px] outline-none focus:border-[var(--ink)]"
                              />
                            </label>
                          ))}
                        </div>
                        <form
                          className="mt-6"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            const merchants = String(fd.get("merchants") ?? "")
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean);
                            const skuAllowlist = String(fd.get("skus") ?? "")
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean);
                            void saveFields(p.agentId, {
                              merchants,
                              skuAllowlist,
                            });
                          }}
                        >
                          <label className="block">
                            <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--mute)]">
                              Approved merchants
                            </span>
                            <input
                              name="merchants"
                              key={`m-${p.agentId}-${p.merchants.join()}`}
                              defaultValue={p.merchants.join(", ")}
                              placeholder="e.g. helix-materials.sg"
                              className="mt-2 w-full border-b border-[var(--line)] bg-transparent py-2 text-[14px] outline-none focus:border-[var(--ink)]"
                            />
                            <p className="mt-2 text-[12px] leading-snug text-[var(--mute)]">
                              Allowlist only. Empty rejects every pay (deny
                              all). Not open to every merchant.
                            </p>
                          </label>
                          <label className="mt-4 block">
                            <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--mute)]">
                              Approved SKUs
                            </span>
                            <input
                              name="skus"
                              key={`s-${p.agentId}-${p.skuAllowlist.join()}`}
                              defaultValue={p.skuAllowlist.join(", ")}
                              placeholder="e.g. ALU-6061-T6"
                              className="mt-2 w-full border-b border-[var(--line)] bg-transparent py-2 text-[14px] outline-none focus:border-[var(--ink)]"
                            />
                            <p className="mt-2 text-[12px] leading-snug text-[var(--mute)]">
                              Allowlist only. Empty rejects every buy (deny
                              all).
                            </p>
                          </label>
                          <button
                            type="submit"
                            className="mt-5 border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-[12px] uppercase tracking-[0.14em] text-[var(--paper)]"
                          >
                            Save allowlists
                          </button>
                        </form>
                        <label className="mt-6 flex items-center gap-3 text-[14px]">
                          <input
                            type="checkbox"
                            checked={p.autoRevokeAfterPurchase}
                            onChange={(e) =>
                              void saveFields(p.agentId, {
                                autoRevokeAfterPurchase: e.target.checked,
                              })
                            }
                          />
                          Auto-revoke card after purchase
                        </label>
                        {p.spend.daySpentSgd > 0 ||
                        p.spend.weekSpentSgd > 0 ||
                        p.spend.hourTxCount > 0 ? (
                          <p className="mono mt-6 text-[11px] text-[var(--mute)]">
                            Spent today S${p.spend.daySpentSgd.toFixed(2)} ·
                            week S${p.spend.weekSpentSgd.toFixed(2)} · hour{" "}
                            {p.spend.hourTxCount} tx
                          </p>
                        ) : null}
                      </div>

                      {/* Policy status */}
                      <div className="mt-10 border-t border-[var(--line)] pt-8">
                        <p
                          className={`display text-[clamp(1.6rem,3vw,2.2rem)] ${
                            p.sleep.score >= 85
                              ? "text-[var(--pass)]"
                              : "text-[var(--ink)]"
                          }`}
                        >
                          {policyVerdict(p.sleep)}
                        </p>
                        <p className="mt-2 max-w-[40ch] text-[14px] text-[var(--ink)]/65">
                          Enforced at mandate check, card issue, and RHA
                          approval — before any XSGD moves.
                        </p>
                        <details className="mt-4 text-[13px] text-[var(--mute)]">
                          <summary className="cursor-pointer uppercase tracking-[0.12em]">
                            Coverage
                          </summary>
                          <ul className="mt-3 space-y-2">
                            {p.sleep.checks.map((c) => (
                              <li
                                key={c.id}
                                className="flex justify-between gap-4 border-b border-[var(--line)] pb-2"
                              >
                                <span>{c.label}</span>
                                <span
                                  className={
                                    c.ok
                                      ? "text-[var(--pass)]"
                                      : "text-[var(--block)]"
                                  }
                                >
                                  {c.ok ? "ok" : "gap"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>

        <p className="mt-16 border-t border-[var(--line)] pt-8 text-[13px] text-[var(--mute)]">
          Treasury → rails OK → one-time card → revoke.{" "}
          <Link
            href="/demo"
            className="text-[var(--ink)] underline-offset-2 hover:underline"
          >
            Prove it in the demo →
          </Link>
        </p>
      </main>
    </>
  );
}
