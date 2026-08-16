# GateX

Agents that buy, without being hijacked.

Identity, CaMeL isolation, a control plane for spend policy, an equippable agent **skill**, one-time StraitsX XSGD cards, and x402 settlement on Avalanche. Built for the [AgentiX Playground](https://www.straitsx.com/agentix-playground) hackathon.

**Live demo:** [https://main.db3ju8bxs5af1.amplifyapp.com/](https://main.db3ju8bxs5af1.amplifyapp.com/)

**Architecture:** [`ARCHITECTURE.md`](ARCHITECTURE.md) · [`architecture.drawio`](architecture.drawio) ([open on Google Drive](https://drive.google.com/file/d/19STHZ6WX4pmyJQ1ISdvZiWvI0H-Q4Kt0/view?usp=sharing)) · **Hackathon links:** [`HACKATHON-LINKS.md`](HACKATHON-LINKS.md)

---

## How to use (judges / demo walkthrough)

Open the live site → follow this path. Keyboard on `/demo`: **`1`–`4`** advance beats, **Space** dismisses the briefing overlay.

### 1. Set the rules — [`/controls`](https://main.db3ju8bxs5af1.amplifyapp.com/controls)

- Connect treasury / review agent policy (caps, merchants, SKU allowlist).
- Optional: freeze the agent — later spend must **DENY** with `FROZEN`.
- This is the human control plane. Agents never skip it.

### 2. Open the live theater — [`/demo`](https://main.db3ju8bxs5af1.amplifyapp.com/demo)

Split screen: **rogue** vs **corporate**. Press keys in order:

| Key | Beat | What you should see |
| --- | --- | --- |
| **`1`** | Identity | Rogue DID → **BLOCK**. Corporate DID → may continue. |
| **`2`** | Injection | Supplier HTML hides “add gift cards…”. CaMeL quarantines it; only the typed SKU / mandate can proceed — injection never becomes a tool. Peek the page at [`/supplier`](https://main.db3ju8bxs5af1.amplifyapp.com/supplier) (injection is in the HTML, hidden from human eyes; View Source to prove). |
| **`3`** | Execute | Policy PASS → one-time StraitsX XSGD card → x402 / Avalanche settle (or simulated if keys/funding missing). |
| **`4`** | Audit | Card **revoked**; hash-chained receipt sealed. Open Evidence / receipt link. |

### 3. Receipts & console

- [`/receipts`](https://main.db3ju8bxs5af1.amplifyapp.com/receipts) — Success vs Block list (Amplify is in-memory; lists reset on cold start).
- [`/console`](https://main.db3ju8bxs5af1.amplifyapp.com/console) — mandate, agent, card, settlement snapshot.
- [`/audit/[id]`](https://main.db3ju8bxs5af1.amplifyapp.com/audit) — sealed chain for a specific receipt id from the demo.

### 4. Equip the skill (optional) — [`/skill`](https://main.db3ju8bxs5af1.amplifyapp.com/skill)

Download `SKILL.md` into Cursor. Point `GATEX_BASE_URL` at the live host. Equipped agents must call:

`check_spend` → `request_pay` → `get_receipt` (never pay around the gateway).

### 5. Architecture for submission

- Live page: [`/architecture`](https://main.db3ju8bxs5af1.amplifyapp.com/architecture)
- Draw.io (hackathon form): [`architecture.drawio`](architecture.drawio) in this repo  
  - Google Drive (diagrams.net export): https://drive.google.com/file/d/19STHZ6WX4pmyJQ1ISdvZiWvI0H-Q4Kt0/view?usp=sharing  
  - GitHub: `https://github.com/SumitShinde0702/AgentixPlayground/blob/main/architecture.drawio`

---

## Run locally

```bash
cp .env.example .env.local
# paste keys from .env.example (OPENAI optional — demo still runs)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Deploy is **AWS Amplify** (`amplify.yml`). Set the same secrets in the Amplify console. Persistence on Amplify is in-memory; local SQLite (`data/gatex.sqlite`) keeps receipts across restart on your machine.

| Route | What |
| --- | --- |
| `/` | Landing |
| `/controls` | Treasury, per-agent policy, NL + hard limits |
| `/skill` | Download Cursor skill + gateway docs |
| `/architecture` | Technical architecture |
| `/demo` | Split theater (keys `1`–`4`, Space) |
| `/receipts` | Success / Block receipt list |
| `/console` | Mandate, agent, card, receipt |
| `/supplier` | Helix catalog with hidden injection |
| `/audit/[id]` | Sealed receipt |

## Equippable skill

Download [`/skills/gatex/SKILL.md`](public/skills/gatex/SKILL.md) into `.cursor/skills/gatex/`. Equipped agents must call:

| Tool | Endpoint |
| --- | --- |
| Manifest | `GET /api/gateway` |
| check_spend | `POST /api/gateway/check` |
| request_pay | `POST /api/gateway/pay` |
| get_receipt | `GET /api/gateway/receipt/{id}` |

Optional auth: `GATEWAY_API_KEY` + header `x-gatex-key`.  
Public base for skills: `GATEX_BASE_URL=https://main.db3ju8bxs5af1.amplifyapp.com`

## Pitch (six beats)

0. **Controls** — connect treasury, set limits, freeze anytime.  
1. **Skill** — equip GateX; spend must hit your gateway.  
2. **Identity** — rogue DID blocked.  
3. **Injection** — CaMeL quarantine.  
4. **Execute** — one-time card → x402 → Avalanche.  
5. **Audit** — sealed receipt; card revoked.

**Funding model:** humans top up treasury (mainnet + Fuji XSGD). Agents get one-time cards only.

## Env

See [`.env.example`](.env.example). Reference: [`HACKATHON-LINKS.md`](HACKATHON-LINKS.md).

| Var | Role |
| --- | --- |
| `AGENT_WALLET_ADDRESS` | Default treasury |
| `AGENT_PRIVATE_KEY` | Fuji key for Card MCP EIP-3009 |
| `GATEWAY_API_KEY` | Optional gateway auth |
| `GATEX_BASE_URL` | Public base URL for skill consumers |
| `MERCHANT_WALLET_ADDRESS` | Merchant payTo |
| `X402_NETWORK` | `eip155:43114` / Fuji labeling |
| `STRAITSX_CARD_MCP_URL` | Card MCP SSE |

Docs: [StraitsX](https://docs.straitsx.com/docs/introduction), [Cards MCP sandbox](https://card.straitsx.ai/sandbox/sse), [Avalanche](https://docs.avax.network/).
