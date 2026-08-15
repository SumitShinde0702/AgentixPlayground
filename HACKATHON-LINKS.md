# AgentiX hackathon — reference links

Organizers: **do not focus on StraitsX business API** this weekend (enhanced KYB won’t clear). **Focus on Card MCP.**

## Card MCP (use these)

| Env | SSE URL | Notes |
| --- | --- | --- |
| Sandbox | https://card.straitsx.ai/sandbox/sse | Tool `get_card_sandbox` — Avalanche **Fuji** `43113`, test XSGD, no whitelist |
| Production | https://card.straitsx.ai/production/sse | Tool `get_card_prod` — Avalanche **mainnet** `43114`, real XSGD, **wallet must be whitelisted** |

Flow (both): MCP tool → cardapi URL + x402 requirements → HTTP 402 → EIP-3009 `TransferWithAuthorization` for XSGD → retry with `PAYMENT-SIGNATURE` → `card_opaque_id`, `card_html`, `settlement_tx`.

Amount: **S$5–30** (`CARD_MCP_AMOUNT_SGD`, default 10). Cardholder: letters/spaces only.

To complete sandbox payment locally: put the **Fuji** wallet private key in `AGENT_PRIVATE_KEY` (same address as used for MCP `wallet_address` / `AGENT_WALLET_ADDRESS` if that wallet is on Fuji, or a dedicated Fuji address). Wallet needs **testnet XSGD** on Fuji (`0xd769…c2a5`), not mainnet XSGD.

## Avalanche

| What | Link |
| --- | --- |
| C-Chain mainnet RPC | https://api.avax.network/ext/bc/C/rpc |
| Fuji testnet (ChainList) | https://chainlist.org/chain/43113 |
| Fuji explorer | https://testnet.snowtrace.io |
| Mainnet explorer | https://snowtrace.io |
| XSGD-AVAX (mainnet) | `0xb2F85b7AB3c2b6f62DF06dE6aE7D09c010a5096E` — https://www.straitsx.com/xsgd |

Sandbox MCP cards settle on **Fuji**, not mainnet. Mainnet 30 XSGD ≠ sandbox card payment asset unless you use **production** MCP + whitelist.

## StraitsX business docs (low priority this weekend)

| Doc | Link | Why low priority |
| --- | --- | --- |
| API intro | https://docs.straitsx.com/docs/introduction | Business API / KYB — organizers said skip |
| Getting started / API keys | https://docs.straitsx.com/docs/getting-started | Same — won’t approve enhanced KYB this weekend |

Keep empty in `.env.local`: `STRAITSX_API_KEY`, `STRAITSX_ISSUING_PLAN_ID`, `STRAITSX_CARD_PRODUCT_ID`.

## Internal

- Env template: [`.env.example`](.env.example) — `STRAITSX_CARD_MCP_URL`
- MCP probe log (local): [`mcp-out.txt`](mcp-out.txt)
- Dev Hub (Notion, may need login): https://app.notion.com/p/convergencesummit/AgentiX-Playground-Dev-Hub-3b354aa8ea60806e80acd3c1a43b019f
- Playground: https://www.straitsx.com/agentix-playground
