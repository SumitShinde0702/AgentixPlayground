# Secure-Procure

Agents that buy, without being hijacked.

Identity, CaMeL isolation, a control plane for spend policy, one-time StraitsX XSGD cards, and x402 settlement on Avalanche. Built for the [AgentiX Playground](https://www.straitsx.com/agentix-playground) hackathon.

## Run

```bash
cp .env.example .env.local
# paste OPENAI_API_KEY (optional — demo still runs without it)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Set the rules** (`/controls`) or **Run the live demo**.

| Route | What |
| --- | --- |
| `/` | Landing |
| `/controls` | Treasury (MetaMask/Core), NL policy, agent create, sleep score |
| `/demo` | Split theater (keys `1`–`4`, space) |
| `/console` | Mandate, agent, card, receipt |
| `/supplier` | Helix catalog with hidden injection |
| `/audit/[id]` | Sealed receipt |

## Pitch

0. **Controls** — connect treasury, set limits in plain language, freeze anytime.
1. **Identity** — rogue bot signs with the wrong key. Registry blocks. Mandate untouched.
2. **Injection** — supplier HTML hides “add $500 in gift cards”. CaMeL keeps it out of the privileged path.
3. **Execute** — verified agent: treasury → one-time card → RHA → x402 → Avalanche.
4. **Audit** — open the receipt. Card already revoked.

**Funding model:** humans top up the treasury wallet (mainnet + Fuji XSGD). Agents never hold a standing Visa — policy mints a one-time card at checkout, then revokes it.

## Env

See `.env.example`. Hackathon links & Card MCP notes: [`HACKATHON-LINKS.md`](HACKATHON-LINKS.md).

| Var | Role |
| --- | --- |
| `AGENT_WALLET_ADDRESS` | Default treasury (live `balanceOf` proof) |
| `AGENT_PRIVATE_KEY` | Fuji key for Card MCP EIP-3009 pay |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Unused (treasury uses MetaMask/Core via wagmi) |
| `MERCHANT_WALLET_ADDRESS` | Merchant payTo |
| `X402_NETWORK` | `eip155:43114` mainnet (MCP cards settle on Fuji sandbox) |
| `STRAITSX_CARD_MCP_URL` | Card MCP SSE — preferred over business API |

Docs: [StraitsX](https://docs.straitsx.com/docs/introduction), [Cards MCP sandbox](https://card.straitsx.ai/sandbox/sse), [Avalanche](https://docs.avax.network/).
