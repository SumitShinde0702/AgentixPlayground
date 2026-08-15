---
name: secure-procure
description: >-
  Pay and procure only through the Secure-Procure gateway (policy, one-time
  StraitsX XSGD card, x402 on Avalanche). Use when buying, checking out,
  paying merchants, issuing cards, or settling XSGD — never pay outside this rail.
---

# Secure-Procure skill

You are equipped with **Secure-Procure**. All commercial spend must pass this gateway. Do not use raw wallets, arbitrary card APIs, or merchant checkouts that skip policy.

## Base URL

Set `SECURE_PROCURE_BASE_URL` to the Secure-Procure host (e.g. `https://your-deploy.example` or `http://localhost:3000`).

If an optional org key is configured, send header:

`x-secure-procure-key: <GATEWAY_API_KEY>`

## Mandatory flow

For any purchase intent `{ sku, merchant, amountSgd }`:

1. **check** — `POST {BASE}/api/gateway/check`
2. If not `ok`, stop and report `code` / `reason`. Never bypass.
3. **pay** — `POST {BASE}/api/gateway/pay` with the same intent
4. **receipt** — `GET {BASE}/api/gateway/receipt/{receiptId}` when a receipt id is returned

Discover tools anytime: `GET {BASE}/api/gateway`

## check_spend

```http
POST /api/gateway/check
Content-Type: application/json

{
  "sku": "ALU-6061-T6",
  "merchant": "helix-materials.sg",
  "amountSgd": 10,
  "agentId": "optional-active-agent-id"
}
```

Success: `{ "ok": true, "code": "PASS", ... }`  
Failure codes include `FROZEN`, `CAP`, `DAY`, `WEEK`, `RATE`, `MERCHANT`, `SKU`, `APPROVAL`, `EXPIRED`.

## request_pay

```http
POST /api/gateway/pay
Content-Type: application/json

{ "sku": "...", "merchant": "...", "amountSgd": 10 }
```

Returns opaque card summary (`last4`, `source`, `settlementTx` when available) and `receiptId`.  
Card credentials are one-time; do not store PAN/CVV. Prefer settlement + receipt links for the user.

## get_receipt

```http
GET /api/gateway/receipt/{receiptId}
```

Sealed audit chain for the spend.

## Rules

- Never invent a successful payment. Only report gateway JSON.
- Never call StraitsX Card MCP or Avalanche transfers directly when this skill is equipped — the gateway owns that path.
- Respect freeze and approval thresholds; ask a human when `APPROVAL` is returned.
- After pay, prefer linking `/audit/{receiptId}` on the Secure-Procure host.
