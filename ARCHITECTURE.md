# GateX — Technical Architecture

**System:** GateX (AgentiX Playground)  
**Stack:** Next.js App Router · TypeScript · StraitsX Card MCP · Avalanche C-Chain (XSGD) · x402 · Ed25519 identity · CaMeL-style dual-LLM isolation  

This document describes control/data flow, trust boundaries, and component ownership. Product pitch lives in the README; this file is the technical map.

---

## 1. System context

```mermaid
C4Context
  title GateX context
  Person(human, "Treasury operator", "Sets policy, freeze, funds XSGD")
  Person(agent, "Equipped AI agent", "Cursor / any skill host")
  System(gatex, "GateX", "Policy gateway + demo theater + audit")
  System_Ext(mcp, "StraitsX Card MCP", "One-time XSGD card issue")
  System_Ext(avax, "Avalanche", "XSGD EIP-3009 / settlement_tx")
  System_Ext(openai, "OpenAI (optional)", "Q-LLM extract in CaMeL")
  Rel(human, gatex, "HTTPS /controls")
  Rel(agent, gatex, "Skill → /api/gateway/*")
  Rel(gatex, mcp, "SSE MCP + cardapi x402")
  Rel(gatex, avax, "RPC balanceOf / TransferWithAuthorization")
  Rel(gatex, openai, "Optional structured extract")
```

If C4 is unavailable in a viewer, equivalent:

```mermaid
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
```

---

## 2. Component map (in-process)

```mermaid
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
    CamelAPI["/api/camel"]
  end
  subgraph Domain
    Policy["policy/store"]
    Mandate["mandate.evaluateMandate"]
    Identity["identity did:key"]
    Camel["camel.runCamel"]
    Cards["payments/cards"]
    MCPClient["payments/straitsx-mcp"]
    X402["payments/x402"]
    XSGD["avalanche/xsgd"]
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
  Cards --> Mandate
  X402 --> XSGD
  Camel -.->|optional| LLM["OpenAI"]
```

| Module | Path | Responsibility |
| --- | --- | --- |
| Policy store | `src/lib/policy/store.ts` | Caps, rate limits, spend ledger, `status: frozen` |
| Mandate | `src/lib/mandate/index.ts` | `evaluateMandate` → PASS / FROZEN / CAP / MERCHANT / SKU / … |
| Identity | `src/lib/identity/index.ts` | Ed25519 agents, registry, challenge/sign/verify |
| CaMeL | `src/lib/camel/index.ts` | Quarantine + structured extract + assert vs frozen plan |
| Cards | `src/lib/payments/cards.ts` | Issue / RHA / revoke; prefers MCP |
| Card MCP | `src/lib/payments/straitsx-mcp.ts` | SSE tools, cardapi 402, EIP-3009 |
| x402 | `src/lib/payments/x402.ts` | Merchant 402 + live/simulated settlement |
| Audit | `src/lib/audit/index.ts` | Hash-linked event log |
| Run | `src/lib/run/index.ts` | Demo theater pipeline generator |
| Skill | `public/skills/gatex/SKILL.md` | Agent-facing contract |

**Persistence:** policy, cards, audit, and spend ledgers are **in-memory** (process restart clears).

---

## 3. Information flow — equipped agent spend

```mermaid
sequenceDiagram
  autonumber
  actor Agent as Equipped agent
  participant GW as GateX gateway
  participant Pol as Policy/Mandate
  participant MCP as Card MCP
  participant Chain as Avalanche
  participant Aud as Audit log

  Agent->>GW: POST /api/gateway/check {sku,merchant,amountSgd}
  GW->>Pol: evaluateMandate
  alt frozen / over limit / bad merchant
    Pol-->>GW: {ok:false, code, reason}
    GW-->>Agent: DENIED
  else PASS
    Pol-->>GW: {ok:true, mandate}
    GW-->>Agent: PASS
    Agent->>GW: POST /api/gateway/pay (same intent)
    GW->>Pol: evaluateMandate again
    GW->>MCP: issue one-time XSGD card
    MCP->>Chain: EIP-3009 TransferWithAuthorization (when keyed)
    MCP-->>GW: card_opaque_id, settlement_tx?
    GW->>GW: RHA authorize
    GW->>Pol: recordSpend
    GW->>GW: revokeCard (always)
    GW->>Aud: append + seal receiptId
    GW-->>Agent: card summary + receiptId
    Agent->>GW: GET /api/gateway/receipt/{id}
    GW-->>Agent: hash chain + verify
  end
```

### Trust boundary

| Zone | Trusted? | Notes |
| --- | --- | --- |
| Human `/controls` | Yes | Sets freeze and caps |
| Gateway API | Yes | Only spend surface for equipped agents |
| Supplier HTML `/supplier` | **No** | May contain prompt injection |
| Q-LLM / extract | Semi | No tools; output schema-constrained |
| P-LLM / frozen plan | Yes | Sees mandate, not raw HTML |
| Card MCP / Avalanche | External | Credentials via env; results verified by tx hash when live |

---

## 4. Freeze → deny path

```mermaid
flowchart TD
  A["POST /api/agents/freeze {agentId, frozen:true}"] --> B["policy.status = frozen"]
  B --> C{"evaluateMandate / checkSpendLimits"}
  C -->|code FROZEN| D["gateway/check → ok:false"]
  C -->|code FROZEN| E["gateway/pay blocked"]
  C -->|code FROZEN| F["issueCard rejected"]
  B --> G["authorizeRha declines FROZEN"]
  H["POST freeze {frozen:false}"] --> I["status active"]
  I --> C
```

Other deny codes (same gate): `CAP`, `DAY`, `WEEK`, `RATE`, `MERCHANT`, `SKU`, `APPROVAL`, `EXPIRED`.  
Identity failures: `UNKNOWN_DID` / bad signature (demo theater phase 1).

---

## 5. CaMeL control vs data path

```mermaid
flowchart TB
  Mandate["Frozen mandate<br/>sku · merchants · maxPerTx"] --> PLLM["P-LLM / planner<br/>NO raw HTML"]
  HTML["Untrusted supplier HTML<br/>+ hidden injection"] --> QLLM["Q-LLM / extract<br/>NO tools"]
  QLLM --> Cap["Capability object<br/>{sku, price, merchant}"]
  Cap --> Assert["Assert vs mandate"]
  PLLM --> Assert
  Assert -->|ok| Tools["Tool path: card / pay"]
  Assert -->|fail| Block["BLOCK · never toolize injection"]
```

Implementation: `src/lib/camel/index.ts` (+ optional OpenAI for extract). Reference: DeepMind CaMeL ([arXiv:2503.18813](https://arxiv.org/abs/2503.18813)).

---

## 6. Demo theater pipeline (`POST /api/run`)

```mermaid
sequenceDiagram
  participant UI as /demo
  participant Run as runLane()
  participant ID as identity
  participant C as camel
  participant M as mandate
  participant Card as cards+MCP
  participant X as x402
  participant A as audit

  UI->>Run: SSE stream lane=rogue|corporate
  Run->>ID: challenge + sign + verify
  alt rogue
    ID-->>UI: BLOCK
    Run->>A: seal identity failure
  else corporate
    Run->>C: runCamel(supplierDocument)
    Run->>M: evaluateMandate
    Run->>Card: issueCard → RHA
    Run->>X: settlePayment
    Run->>Card: revokeCard
    Run->>A: seal receipt
    Run-->>UI: PASS lines + receiptId
  end
```

Phases (UI keys `1`–`4`): Identity → Injection → Execute → Audit.

---

## 7. Card MCP / settlement detail

```mermaid
flowchart LR
  Intent["Pay intent"] --> Issue["cards.issueCard"]
  Issue --> Pref["Prefer Card MCP SSE"]
  Pref -->|sandbox/prod tool| CardAPI["cardapi URL + x402 requirements"]
  CardAPI --> Pay402["HTTP 402"]
  Pay402 --> EIP["EIP-3009 TransferWithAuthorization"]
  EIP --> Retry["Retry with PAYMENT-SIGNATURE"]
  Retry --> Out["card_opaque_id · card_html · settlement_tx"]
  Pref -->|unavailable| Fallback["StraitsX API or local stand-in"]
  Out --> X402["x402.settlePayment uses live tx when present"]
```

| Env | Role |
| --- | --- |
| `STRAITSX_CARD_MCP_URL` | MCP SSE endpoint |
| `CARD_MCP_AMOUNT_SGD` | Prepaid amount 5–30 |
| `AGENT_WALLET_ADDRESS` | MCP wallet + XSGD `balanceOf` |
| `AGENT_PRIVATE_KEY` | Signs EIP-3009 for MCP pay |
| `MERCHANT_WALLET_ADDRESS` | x402 `payTo` |
| `X402_NETWORK` | `eip155:43113` Fuji / `43114` mainnet labeling |
| `GATEWAY_API_KEY` / `GATEX_BASE_URL` | Skill auth + public base |

Sandbox MCP → **Fuji**. Production MCP → **mainnet** (whitelist). See `HACKATHON-LINKS.md`.

---

## 8. Audit chain

```mermaid
flowchart LR
  E1["event n-1 · hash"] --> E2["event n · prevHash + payload"]
  E2 --> E3["event n+1"]
  E3 --> Head["receipt head"]
  Head --> Verify["verifyChain()"]
```

Events include identity, camel, mandate, card issue/revoke, x402, complete. UI: `/audit/[id]`. Gateway: `GET /api/gateway/receipt/{id}`.

---

## 9. API surface (gateway)

| Method | Path | In | Out |
| --- | --- | --- | --- |
| `GET` | `/api/gateway` | — | Tool manifest |
| `POST` | `/api/gateway/check` | intent JSON | `{ok, code, reason?}` |
| `POST` | `/api/gateway/pay` | intent JSON | card summary + `receiptId` |
| `GET` | `/api/gateway/receipt/[id]` | id | chain + verify |

**OpenAPI 3.1 (machine-readable):** [`/openapi/gateway.yaml`](public/openapi/gateway.yaml) — agents, codegen, and partners can generate clients without reading the UI.

Related: `/api/run`, `/api/agents/freeze`, `/api/policy`, `/api/camel`, `/api/identity`, `/api/cards`, `/api/audit/[id]`, `/api/x402/checkout`, `/api/chain/*`.

---

## 10. Data model (logical)

```mermaid
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
    string status "active|frozen"
    number maxPerTxSgd
    number maxPerDaySgd
    string[] merchants
    string[] skuAllowlist
  }
  SPEND_LEDGER {
    string agentId
    number dayTotal
    number weekTotal
    number[] timestamps
  }
  AUDIT_LOG {
    string id PK
    string head
  }
  AUDIT_LINK {
    string hash PK
    string prev
    string type
    json detail
  }
  CARD {
    string opaqueId
    string last4
    string status "issued|revoked"
    string settlementTx
  }
  SETTLEMENT {
    string txHash
    string network
    string source "avalanche|simulated"
  }
```

**Today:** SQLite file (`data/gatex.sqlite` via `better-sqlite3`) for audits, policies, spend ledgers.  
**AWS production target:** see §12.

---

## 11. Signed gateway requests (authN design)

Current: optional shared `GATEWAY_API_KEY` (`x-gatex-key`).  
Hire-signal next step: **per-agent signatures** so check/pay cannot be forged with a leaked org key alone.

```mermaid
sequenceDiagram
  participant Agent
  participant GW as Gateway
  Note over Agent: Ed25519 key bound to did:key
  Agent->>Agent: payload = intent + ts + nonce
  Agent->>Agent: sig = Sign(payload)
  Agent->>GW: POST check {intent, ts, nonce, did, sig}
  GW->>GW: lookup did in registry
  GW->>GW: verify sig + skew + replay nonce
  alt invalid
    GW-->>Agent: 401 / DENIED
  else valid
    GW->>GW: evaluateMandate(intent)
    GW-->>Agent: PASS or policy DENY
  end
```

| Field | Purpose |
| --- | --- |
| `did` | Agent identity (already in `src/lib/identity`) |
| `ts` + `nonce` | Replay protection |
| `sig` | Binds intent to that DID |
| Registry | Only enrolled DIDs spend |

---

## 12. Persistence — AWS target (vs hackathon now)

**Hackathon now:** local SQLite file (`data/gatex.sqlite`); **Amplify deploy** uses in-memory (Lambda).  
**AWS-shaped production** (what you’d build next):

```mermaid
flowchart TB
  subgraph Clients
    Browser
    AgentSkill["Agent + skill"]
  end
  subgraph AWS
    ALB["ALB / CloudFront"]
    ECS["ECS Fargate · Next.js"]
    SM["Secrets Manager<br/>GATEWAY_API_KEY · AGENT_PRIVATE_KEY"]
    RDS["RDS Postgres<br/>policy · spend · agents"]
    DDB["DynamoDB optional<br/>audit chains by receiptId"]
    S3["S3<br/>receipt JSON exports"]
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
```

| Concern | Hackathon | AWS |
| --- | --- | --- |
| Policy / freeze | SQLite file | RDS Postgres row `policies` |
| Spend ledger | SQLite | Postgres or DynamoDB |
| Audit chain | SQLite (+ `/receipts` UI) | DynamoDB (`receiptId`, `seq`) or Postgres JSONB + S3 export |
| Secrets | `.env` | Secrets Manager |
| Compute | Amplify Hosting (SSR / memory) | ECS/Fargate or App Runner |

**Yes, you can store on AWS** — Postgres on RDS is the next step up from local SQLite. Amplify SSR uses in-memory (Lambda FS limits); document the RDS/Dynamo shape for production durability.

---

## 13. Threat model (brief)

| Threat | Mitigation in GateX |
| --- | --- |
| Spoofed agent | DID registry + (planned) signed intents |
| Prompt injection → tool | CaMeL quarantine; P-LLM never sees HTML |
| Frozen agent still pays | `evaluateMandate` / RHA refuse `FROZEN` |
| Standing card theft | One-time card + mandatory revoke |
| Double pay | Pay path should be idempotent (production: idempotency-key header) |
| Tampered receipt | `verifyChain` hash links |

---

## 14. Non-goals / honesty

- Not a custodial bank; humans fund wallets.  
- Not standing agent Visa — one-time card then revoke.  
- Business API / KYB not required for this weekend’s Card MCP path.  
- Without keys/test XSGD, responses may be labeled `simulated` while preserving protocol shape.  
- AWS diagram is the **production target** beyond the shipped SQLite file.  
