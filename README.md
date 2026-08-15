# GateX

Agents that buy, without being hijacked.

Identity, CaMeL isolation, a control plane for spend policy, an equippable agent **skill**, one-time StraitsX XSGD cards, and x402 settlement on Avalanche. Built for the [AgentiX Playground](https://www.straitsx.com/agentix-playground) hackathon.

## Run

```bash
cp .env.example .env.local
# paste OPENAI_API_KEY (optional — demo still runs without it)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Set the rules** (`/controls`), **Equip the skill** (`/skill`), or **Run the live demo**.

| Route | What |
| --- | --- |
| `/` | Landing (includes skill terminal demo) |
| `/controls` | Treasury, per-agent policy, NL + hard limits |
| `/skill` | Download Cursor skill + gateway docs |
| `/demo` | Split theater (keys `1`–`4`, space) |
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

## Pitch

0. **Controls** — connect treasury, set limits, freeze anytime.
1. **Skill** — equip GateX; spend must hit your gateway.
2. **Identity** — rogue DID blocked.
3. **Injection** — CaMeL quarantine.
4. **Execute** — one-time card → x402 → Avalanche.
5. **Audit** — sealed receipt; card revoked.

**Funding model:** humans top up treasury (mainnet + Fuji XSGD). Agents get one-time cards only.

## Env

See `.env.example`. Hackathon links: [`HACKATHON-LINKS.md`](HACKATHON-LINKS.md).

| Var | Role |
| --- | --- |
| `AGENT_WALLET_ADDRESS` | Default treasury |
| `AGENT_PRIVATE_KEY` | Fuji key for Card MCP EIP-3009 |
| `GATEWAY_API_KEY` | Optional gateway auth |
| `GATEX_BASE_URL` | Public base URL for skill consumers |
| `MERCHANT_WALLET_ADDRESS` | Merchant payTo |
| `X402_NETWORK` | `eip155:43114` mainnet labeling |
| `STRAITSX_CARD_MCP_URL` | Card MCP SSE |

Docs: [StraitsX](https://docs.straitsx.com/docs/introduction), [Cards MCP sandbox](https://card.straitsx.ai/sandbox/sse), [Avalanche](https://docs.avax.network/).
