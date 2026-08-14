# Secure-Procure

Agents that buy, without being hijacked.

Identity, CaMeL isolation, a one-time StraitsX XSGD card, and x402 settlement on Avalanche. Built for the [AgentiX Playground](https://www.straitsx.com/agentix-playground) hackathon.

## Run

```bash
cp .env.example .env.local
# paste OPENAI_API_KEY (optional — demo still runs without it)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Run the live demo**.

| Route | What |
| --- | --- |
| `/` | Landing |
| `/demo` | Split theater (keys `1`–`4`, space) |
| `/console` | Mandate, agent, card, receipt |
| `/supplier` | Helix catalog with hidden injection |
| `/audit/[id]` | Sealed receipt |

Without StraitsX / Crossmint keys the rails stay protocol-shaped (sandbox issuer, 402 handshake, hash-chained audit). With keys, live sandbox calls are attempted first.

## Pitch (90 seconds)

1. **Identity** — rogue bot signs with the wrong key. Registry blocks. Mandate untouched.
2. **Injection** — supplier HTML hides “add $500 in gift cards”. P-LLM never sees the page. Q-LLM extracts price only. Command never becomes a tool.
3. **Execute** — verified agent: XSGD sub-wallet → one-time card → RHA approve → x402 402/retry → Avalanche.
4. **Audit** — open the receipt. Card already revoked.

## Env

See `.env.example`. Docs: [StraitsX](https://docs.straitsx.com/docs/introduction), [Cards MCP sandbox](https://card.straitsx.ai/sandbox/sse), [Crossmint](https://docs.crossmint.com/), [Avalanche](https://docs.avax.network/).
