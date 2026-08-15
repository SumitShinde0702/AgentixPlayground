"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { SiteNav } from "@/components/site-nav";

const CHART_CONTEXT = `
flowchart TB
  subgraph External
    Human["Treasury operator"]
    Agent["Equipped AI agent"]
    MCP["StraitsX Card MCP SSE"]
    AVAX["Avalanche C-Chain · XSGD"]
    LLM["OpenAI optional Q-LLM"]
  end
  subgraph GateX["GateX process"]
    UI["App Router UI"]
    API["API routes"]
    Core["Lib: policy · identity · camel · cards · x402 · audit"]
  end
  Human --> UI
  Agent -->|"SKILL.md tools"| API
  UI --> API
  API --> Core
  Core --> MCP
  Core --> AVAX
  Core -.-> LLM
`;

const CHART_COMPONENTS = `
flowchart LR
  subgraph UI
    Controls["/controls"]
    Skill["/skill"]
    Demo["/demo"]
    Console["/console"]
    Supplier["/supplier"]
    AuditUI["/audit/id"]
  end
  subgraph API
    GW["/api/gateway/*"]
    Run["/api/run SSE"]
    Freeze["/api/agents/freeze"]
    PolicyAPI["/api/policy"]
  end
  subgraph Domain
    Policy["policy/store"]
    Mandate["evaluateMandate"]
    Identity["identity did:key"]
    Camel["camel.runCamel"]
    Cards["payments/cards"]
    MCPClient["straitsx-mcp"]
    X402["payments/x402"]
    Audit["audit hash chain"]
  end
  Controls --> Freeze
  Controls --> PolicyAPI
  Skill --> GW
  Demo --> Run
  GW --> Mandate
  GW --> Cards
  GW --> Audit
  Freeze --> Policy
  PolicyAPI --> Policy
  Mandate --> Policy
  Run --> Identity
  Run --> Camel
  Run --> Mandate
  Run --> Cards
  Run --> X402
  Run --> Audit
  Cards --> MCPClient
`;

const CHART_SPEND = `
sequenceDiagram
  autonumber
  actor Agent as Equipped agent
  participant GW as GateX gateway
  participant Pol as Policy/Mandate
  participant MCP as Card MCP
  participant Chain as Avalanche
  participant Aud as Audit log
  Agent->>GW: POST /api/gateway/check
  GW->>Pol: evaluateMandate
  alt FROZEN / CAP / deny
    Pol-->>GW: ok false + code
    GW-->>Agent: DENIED
  else PASS
    Pol-->>GW: ok true
    GW-->>Agent: PASS
    Agent->>GW: POST /api/gateway/pay
    GW->>MCP: issue one-time XSGD card
    MCP->>Chain: EIP-3009 when keyed
    MCP-->>GW: opaque id + settlement_tx?
    GW->>GW: RHA + recordSpend + revokeCard
    GW->>Aud: seal receiptId
    GW-->>Agent: card summary + receiptId
  end
`;

const CHART_FREEZE = `
flowchart TD
  A["POST /api/agents/freeze"] --> B["policy.status = frozen"]
  B --> C{"evaluateMandate"}
  C -->|FROZEN| D["gateway/check DENIED"]
  C -->|FROZEN| E["gateway/pay blocked"]
  C -->|FROZEN| F["issueCard rejected"]
  B --> G["RHA declines FROZEN"]
  H["Unfreeze"] --> I["status active"]
  I --> C
`;

const CHART_CAMEL = `
flowchart TB
  Mandate["Frozen mandate"] --> PLLM["P-LLM planner · no raw HTML"]
  HTML["Untrusted supplier HTML"] --> QLLM["Q-LLM extract · no tools"]
  QLLM --> Cap["Capability sku price merchant"]
  Cap --> Assert["Assert vs mandate"]
  PLLM --> Assert
  Assert -->|ok| Tools["Card / pay tools"]
  Assert -->|fail| Block["BLOCK · injection never toolized"]
`;

const CHART_MCP = `
flowchart LR
  Intent["Pay intent"] --> Issue["cards.issueCard"]
  Issue --> Pref["Card MCP SSE"]
  Pref --> CardAPI["cardapi + x402 reqs"]
  CardAPI --> Pay402["HTTP 402"]
  Pay402 --> EIP["EIP-3009 TransferWithAuthorization"]
  EIP --> Retry["Retry PAYMENT-SIGNATURE"]
  Retry --> Out["opaque_id + settlement_tx"]
  Out --> Settle["x402.settlePayment"]
`;

const CHART_RUN = `
sequenceDiagram
  participant UI as /demo
  participant Run as runLane
  participant ID as identity
  participant C as camel
  participant M as mandate
  participant Card as cards+MCP
  participant X as x402
  participant A as audit
  UI->>Run: SSE rogue or corporate
  Run->>ID: challenge + verify
  alt rogue
    ID-->>UI: BLOCK
  else corporate
    Run->>C: quarantine HTML
    Run->>M: evaluateMandate
    Run->>Card: issue + RHA
    Run->>X: settle
    Run->>Card: revoke
    Run->>A: seal receipt
  end
`;

const CHART_ER = `
erDiagram
  AGENT ||--o| POLICY : has
  POLICY ||--o{ SPEND_LEDGER : records
  AGENT ||--o{ AUDIT_LOG : opens
  AUDIT_LOG ||--|{ AUDIT_LINK : contains
  AUDIT_LOG ||--o| CARD : references
  CARD ||--o| SETTLEMENT : may_have
  AGENT {
    string agentId
    string did
    string status
  }
  POLICY {
    string agentId PK
    string status
    number maxPerTxSgd
    number maxPerDaySgd
  }
  AUDIT_LOG {
    string id PK
    string head
  }
  AUDIT_LINK {
    string hash PK
    string prev
    string type
  }
  CARD {
    string opaqueId
    string last4
    string status
  }
`;

const CHART_SIGNED = `
sequenceDiagram
  participant Agent
  participant GW as Gateway
  Note over Agent: Ed25519 bound to did:key
  Agent->>Agent: payload = intent + ts + nonce
  Agent->>Agent: sig = Sign(payload)
  Agent->>GW: POST check + did + sig
  GW->>GW: verify registry + skew + replay
  alt invalid
    GW-->>Agent: 401
  else valid
    GW->>GW: evaluateMandate
    GW-->>Agent: PASS or policy DENY
  end
`;

const CHART_AWS = `
flowchart TB
  subgraph Clients
    Browser
    AgentSkill["Agent + skill"]
  end
  subgraph AWS
    ALB["ALB / CloudFront"]
    ECS["ECS Fargate · Next.js"]
    SM["Secrets Manager"]
    RDS["RDS Postgres · policy"]
    DDB["DynamoDB · audit chains"]
    S3["S3 · receipt exports"]
  end
  subgraph External
    MCP["StraitsX Card MCP"]
    AVAX["Avalanche RPC"]
  end
  Browser --> ALB --> ECS
  AgentSkill --> ALB
  ECS --> SM
  ECS --> RDS
  ECS --> DDB
  ECS --> S3
  ECS --> MCP
  ECS --> AVAX
`;

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-[var(--line)] pt-12">
      <p className="mono text-[11px] uppercase tracking-[0.18em] text-[var(--mute)]">
        {eyebrow}
      </p>
      <h2 className="display mt-3 text-[clamp(1.6rem,3vw,2.2rem)] text-[var(--ink)]">
        {title}
      </h2>
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}

export default function ArchitecturePage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto min-h-[100dvh] max-w-5xl px-6 pb-28 pt-28 md:px-10">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mute)]">
          Technical architecture
        </p>
        <h1 className="display mt-4 text-[clamp(2.4rem,5vw,3.8rem)] text-[var(--ink)]">
          GateX system design
        </h1>
        <p className="mt-5 max-w-[58ch] text-[16px] leading-relaxed text-[var(--mute)]">
          Control/data flows, trust boundaries, and component ownership for the
          AgentiX deployment. Card MCP–first; one-time XSGD cards; hash-chained
          audit.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/ARCHITECTURE.md"
            className="border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 text-[12px] uppercase tracking-[0.14em] text-[var(--paper)]"
          >
            Download ARCHITECTURE.md
          </a>
          <a
            href="/openapi/gateway.yaml"
            className="border border-[var(--line)] px-5 py-3 text-[12px] uppercase tracking-[0.14em]"
          >
            OpenAPI gateway.yaml
          </a>
          <Link
            href="/controls"
            className="border border-[var(--line)] px-5 py-3 text-[12px] uppercase tracking-[0.14em]"
          >
            /controls
          </Link>
          <Link
            href="/demo"
            className="border border-[var(--line)] px-5 py-3 text-[12px] uppercase tracking-[0.14em]"
          >
            /demo
          </Link>
        </div>

        <nav className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border border-[var(--line)] px-4 py-3 text-[12px] text-[var(--mute)]">
          {[
            ["context", "Context"],
            ["components", "Components"],
            ["spend", "Spend flow"],
            ["freeze", "Freeze/deny"],
            ["camel", "CaMeL"],
            ["mcp", "Card MCP"],
            ["theater", "Theater"],
            ["data", "Data model"],
            ["authn", "Signed authN"],
            ["aws", "AWS target"],
            ["threats", "Threats"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={`#${href}`}
              className="uppercase tracking-[0.12em] hover:text-[var(--ink)]"
            >
              {label}
            </a>
          ))}
        </nav>

        <Section id="context" eyebrow="01 · Context" title="System context">
          <p className="max-w-[56ch] text-[15px] leading-relaxed text-[var(--mute)]">
            Humans fund and freeze. Equipped agents only talk to the gateway.
            GateX talks to StraitsX Card MCP and Avalanche; optional OpenAI for
            Q-LLM extract.
          </p>
          <MermaidDiagram chart={CHART_CONTEXT} />
        </Section>

        <Section id="components" eyebrow="02 · Components" title="In-process map">
          <p className="max-w-[56ch] text-[15px] leading-relaxed text-[var(--mute)]">
            UI routes call API routes; domain libs own policy, identity, CaMeL,
            cards, settlement, and audit. Policy + receipts persist in SQLite
            (<code className="mono text-[12px]">data/gatex.sqlite</code>).
          </p>
          <MermaidDiagram chart={CHART_COMPONENTS} />
          <div className="overflow-x-auto border border-[var(--line)]">
            <table className="w-full min-w-[36rem] text-left text-[13px]">
              <thead className="border-b border-[var(--line)] bg-[var(--paper-deep)]/50 text-[11px] uppercase tracking-[0.12em] text-[var(--mute)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Module</th>
                  <th className="px-3 py-2 font-medium">Path</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)] text-[var(--ink)]/80">
                {[
                  ["Policy", "src/lib/policy/store.ts", "Caps, ledger, freeze"],
                  ["Mandate", "src/lib/mandate/", "evaluateMandate codes"],
                  ["Identity", "src/lib/identity/", "did:key registry"],
                  ["CaMeL", "src/lib/camel/", "Quarantine + assert"],
                  ["Cards / MCP", "src/lib/payments/", "Issue · RHA · revoke"],
                  ["x402 / XSGD", "src/lib/payments/x402.ts", "Settle + Snowtrace"],
                  ["Audit", "src/lib/audit/", "Hash-linked chain"],
                  ["Run", "src/lib/run/", "Demo SSE pipeline"],
                ].map(([m, p, r]) => (
                  <tr key={m}>
                    <td className="px-3 py-2 font-medium text-[var(--ink)]">{m}</td>
                    <td className="mono px-3 py-2 text-[12px]">{p}</td>
                    <td className="px-3 py-2 text-[var(--mute)]">{r}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="spend" eyebrow="03 · Sequence" title="Equipped agent spend">
          <p className="max-w-[56ch] text-[15px] leading-relaxed text-[var(--mute)]">
            Mandatory skill path: check → (deny or) pay → receipt. Pay always
            revokes the one-time card before returning.
          </p>
          <MermaidDiagram chart={CHART_SPEND} />
          <div className="border border-[var(--line)] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--mute)]">
              Trust zones
            </p>
            <ul className="mt-2 space-y-1 text-[13px] text-[var(--mute)]">
              <li>
                <span className="text-[var(--pass)]">Trusted</span> — controls,
                gateway, P-LLM/mandate, audit
              </li>
              <li>
                <span className="text-[var(--block)]">Untrusted</span> — supplier
                HTML, injection strings
              </li>
              <li>
                <span className="text-[#d4a017]">External</span> — Card MCP,
                Avalanche RPC
              </li>
            </ul>
          </div>
        </Section>

        <Section id="freeze" eyebrow="04 · Control" title="Freeze → deny">
          <MermaidDiagram chart={CHART_FREEZE} />
          <p className="mono text-[12px] text-[var(--mute)]">
            Also: CAP · DAY · WEEK · RATE · MERCHANT · SKU · APPROVAL · EXPIRED
          </p>
        </Section>

        <Section id="camel" eyebrow="05 · Isolation" title="CaMeL control vs data">
          <p className="max-w-[56ch] text-[15px] leading-relaxed text-[var(--mute)]">
            Dual-LLM pattern (DeepMind CaMeL): untrusted page never reaches the
            privileged planner as free text that can become a tool.
          </p>
          <MermaidDiagram chart={CHART_CAMEL} />
          <p className="text-[13px] text-[var(--mute)]">
            Ref:{" "}
            <a
              href="https://arxiv.org/abs/2503.18813"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--ink)] underline-offset-2 hover:underline"
            >
              arXiv:2503.18813
            </a>
          </p>
        </Section>

        <Section id="mcp" eyebrow="06 · Rails" title="Card MCP → Avalanche">
          <MermaidDiagram chart={CHART_MCP} />
          <div className="overflow-x-auto border border-[var(--line)]">
            <table className="w-full min-w-[32rem] text-left text-[13px]">
              <thead className="border-b border-[var(--line)] bg-[var(--paper-deep)]/50 text-[11px] uppercase tracking-[0.12em] text-[var(--mute)]">
                <tr>
                  <th className="px-3 py-2">Env</th>
                  <th className="px-3 py-2">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {[
                  ["STRAITSX_CARD_MCP_URL", "MCP SSE"],
                  ["AGENT_WALLET_ADDRESS", "MCP wallet + balanceOf"],
                  ["AGENT_PRIVATE_KEY", "EIP-3009 signer"],
                  ["MERCHANT_WALLET_ADDRESS", "x402 payTo"],
                  ["X402_NETWORK", "eip155:43113 / 43114"],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td className="mono px-3 py-2 text-[12px]">{k}</td>
                    <td className="px-3 py-2 text-[var(--mute)]">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="theater" eyebrow="07 · Demo" title="Theater pipeline">
          <p className="max-w-[56ch] text-[15px] leading-relaxed text-[var(--mute)]">
            <code className="mono text-[12px]">POST /api/run</code> streams{" "}
            <code className="mono text-[12px]">runLane</code> over SSE. Keys 1–4
            map to identity, injection, execute, audit.
          </p>
          <MermaidDiagram chart={CHART_RUN} />
        </Section>

        <Section id="data" eyebrow="08 · Schema" title="Logical data model">
          <p className="max-w-[56ch] text-[15px] leading-relaxed text-[var(--mute)]">
            Today these are in-process maps. Production maps 1:1 onto Postgres /
            DynamoDB rows so freeze + receipts survive restart.
          </p>
          <MermaidDiagram chart={CHART_ER} />
        </Section>

        <Section id="authn" eyebrow="09 · AuthN" title="Signed gateway requests">
          <p className="max-w-[56ch] text-[15px] leading-relaxed text-[var(--mute)]">
            Shipped: optional shared{" "}
            <code className="mono text-[12px]">x-gatex-key</code>. Design next:
            per-agent Ed25519 over intent + timestamp + nonce so a leaked org
            key alone cannot spend.
          </p>
          <MermaidDiagram chart={CHART_SIGNED} />
        </Section>

        <Section id="aws" eyebrow="10 · Target" title="AWS persistence shape">
          <p className="max-w-[56ch] text-[15px] leading-relaxed text-[var(--mute)]">
            Hackathon: Amplify Hosting (memory on SSR) + local SQLite.
            Hire-signal target: RDS for policy/spend,
            DynamoDB or Postgres JSONB for audit links, Secrets Manager for
            keys, ECS/App Runner for the Next process.
          </p>
          <MermaidDiagram chart={CHART_AWS} />
          <div className="overflow-x-auto border border-[var(--line)]">
            <table className="w-full min-w-[32rem] text-left text-[13px]">
              <thead className="border-b border-[var(--line)] bg-[var(--paper-deep)]/50 text-[11px] uppercase tracking-[0.12em] text-[var(--mute)]">
                <tr>
                  <th className="px-3 py-2">Concern</th>
                  <th className="px-3 py-2">Now</th>
                  <th className="px-3 py-2">AWS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {[
                  ["Policy / freeze", "SQLite (local file)", "RDS Postgres"],
                  ["Spend ledger", "SQLite", "Postgres / DynamoDB"],
                  ["Audit chain", "SQLite", "DynamoDB or JSONB + S3"],
                  ["Secrets", ".env", "Secrets Manager"],
                ].map(([a, b, c]) => (
                  <tr key={a}>
                    <td className="px-3 py-2 font-medium text-[var(--ink)]">{a}</td>
                    <td className="px-3 py-2 text-[var(--mute)]">{b}</td>
                    <td className="px-3 py-2 text-[var(--mute)]">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="threats" eyebrow="11 · Threats" title="Threat → mitigation">
          <div className="overflow-x-auto border border-[var(--line)]">
            <table className="w-full min-w-[36rem] text-left text-[13px]">
              <thead className="border-b border-[var(--line)] bg-[var(--paper-deep)]/50 text-[11px] uppercase tracking-[0.12em] text-[var(--mute)]">
                <tr>
                  <th className="px-3 py-2">Threat</th>
                  <th className="px-3 py-2">Mitigation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {[
                  ["Spoofed agent", "DID registry + planned signed intents"],
                  ["Prompt injection → tool", "CaMeL quarantine; P-LLM never sees HTML"],
                  ["Frozen agent still pays", "evaluateMandate / RHA refuse FROZEN"],
                  ["Standing card theft", "One-time card + mandatory revoke"],
                  ["Tampered receipt", "verifyChain hash links"],
                ].map(([t, m]) => (
                  <tr key={t}>
                    <td className="px-3 py-2 font-medium text-[var(--ink)]">{t}</td>
                    <td className="px-3 py-2 text-[var(--mute)]">{m}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <section className="mt-14 border-t border-[var(--line)] pt-10">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--mute)]">
            Gateway API
          </p>
          <ul className="mt-4 space-y-2 text-[14px] text-[var(--ink)]/80">
            <li>
              <code className="mono text-[12px]">GET /api/gateway</code> —
              manifest
            </li>
            <li>
              <code className="mono text-[12px]">POST /api/gateway/check</code> —{" "}
              check_spend
            </li>
            <li>
              <code className="mono text-[12px]">POST /api/gateway/pay</code> —
              request_pay
            </li>
            <li>
              <code className="mono text-[12px]">
                GET /api/gateway/receipt/[id]
              </code>{" "}
              — sealed chain
            </li>
          </ul>
          <p className="mt-4 text-[13px] text-[var(--mute)]">
            Machine-readable contract:{" "}
            <a
              href="/openapi/gateway.yaml"
              className="text-[var(--ink)] underline-offset-2 hover:underline"
            >
              /openapi/gateway.yaml
            </a>
          </p>
        </section>

        <p className="mt-16 text-[13px] text-[var(--mute)]">
          Source of truth:{" "}
          <a href="/ARCHITECTURE.md" className="underline-offset-2 hover:underline">
            ARCHITECTURE.md
          </a>
          . Hackathon MCP notes: see repo{" "}
          <span className="mono text-[12px]">HACKATHON-LINKS.md</span>.
        </p>
      </main>
    </>
  );
}
