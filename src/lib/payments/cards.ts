import { MANDATE, XSGD, straitsxCardMcpUrl, straitsxHost } from "@/lib/config";
import { nonce } from "@/lib/hash";
import { currentMandate, evaluateMandate } from "@/lib/mandate";
import { getActivePolicy } from "@/lib/policy/store";
import {
  issueCardViaMcp,
  mcpCardAmountSgd,
  type CardMcpIssuePlan,
  type PaymentAccept,
} from "@/lib/payments/straitsx-mcp";

export type VirtualCard = {
  opaqueId: string;
  last4: string;
  status: "active" | "revoked";
  limitSgd: number;
  currency: "XSGD";
  issuedAt: string;
  revokedAt: string | null;
  source: "mcp" | "straitsx" | "local";
  settlementTx?: string;
  cardHtml?: string;
  network?: string;
};

export type PurchaseIntent = {
  sku: string;
  merchant: string;
  amountSgd: number;
  mandateId: string;
};

export type IssueCardResult =
  | {
      ok: true;
      card: VirtualCard;
      mcp: string;
      note: string;
      mcpPlan?: CardMcpIssuePlan;
      paymentAccept?: PaymentAccept;
    }
  | {
      ok: false;
      reason: string;
      code: string;
    };

const cards = new Map<string, VirtualCard>();
let latestCard: VirtualCard | null = null;
let lastMcpAttempt: {
  ok: boolean;
  stage?: string;
  reason?: string;
  plan?: CardMcpIssuePlan;
  accept?: PaymentAccept;
} | null = null;

export function getLatestCard() {
  return latestCard;
}

export function getCard(id: string) {
  return cards.get(id) ?? null;
}

export function getLastMcpAttempt() {
  return lastMcpAttempt;
}

function localIssue(intent: PurchaseIntent): VirtualCard {
  const last4 = String(1000 + Math.floor(Math.random() * 9000));
  const card: VirtualCard = {
    opaqueId: `card_${nonce(6)}`,
    last4,
    status: "active",
    limitSgd: intent.amountSgd,
    currency: "XSGD",
    issuedAt: new Date().toISOString(),
    revokedAt: null,
    source: "local",
  };
  cards.set(card.opaqueId, card);
  latestCard = card;
  return card;
}

function last4FromMcp(card: {
  last4?: string;
  truncated_card_number?: string;
  card_opaque_id: string;
}) {
  if (card.last4) return card.last4.slice(-4);
  if (card.truncated_card_number) return card.truncated_card_number.slice(-4);
  return card.card_opaque_id.slice(-4);
}

async function tryMcpIssue(intent: PurchaseIntent): Promise<VirtualCard | null> {
  const amount = mcpCardAmountSgd(
    Math.min(30, Math.max(5, Math.round(intent.amountSgd) || 10)),
  );
  const result = await issueCardViaMcp({
    cardholderName: "Apex Procure",
    amountSgd: amount,
  });

  if (!result.ok) {
    lastMcpAttempt = {
      ok: false,
      stage: result.stage,
      reason: result.reason,
      plan: result.plan,
      accept: result.accept,
    };
    return null;
  }

  lastMcpAttempt = {
    ok: true,
    plan: result.plan,
    accept: result.accept,
  };

  const card: VirtualCard = {
    opaqueId: result.card.card_opaque_id,
    last4: last4FromMcp(result.card),
    status: "active",
    limitSgd: amount,
    currency: "XSGD",
    issuedAt: new Date().toISOString(),
    revokedAt: null,
    source: "mcp",
    settlementTx: result.card.settlement_tx,
    cardHtml: result.card.card_html,
    network: result.accept.network,
  };
  cards.set(card.opaqueId, card);
  latestCard = card;
  return card;
}

/** Business API path — skip for this hackathon (KYB). Kept as fallback only. */
async function tryStraitsxIssue(intent: PurchaseIntent): Promise<VirtualCard | null> {
  const key = process.env.STRAITSX_API_KEY;
  const plan = process.env.STRAITSX_ISSUING_PLAN_ID;
  const product = process.env.STRAITSX_CARD_PRODUCT_ID;
  if (!key || !plan || !product) return null;

  try {
    const host = straitsxHost();
    const userRes = await fetch(`${host}/v1/issuing-plans/${plan}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-XFERS-APP-API-KEY": key,
      },
      body: JSON.stringify({
        customer_name: MANDATE.principal,
        kyc_full_name: MANDATE.principal,
        date_of_birth: "1985/01/01",
        nationality: "SG",
      }),
    });
    if (!userRes.ok) return null;
    const user = (await userRes.json()) as {
      opaque_id?: string;
      data?: { opaque_id?: string };
    };
    const customerId = user.opaque_id ?? user.data?.opaque_id;
    if (!customerId) return null;

    const cardRes = await fetch(
      `${host}/v1/issuing-plans/${plan}/users/${customerId}/cards`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-XFERS-APP-API-KEY": key,
        },
        body: JSON.stringify({
          card_product_opaque_id: product,
          cardholder_name: MANDATE.principal,
          funding_source: "remote-host",
        }),
      },
    );
    if (!cardRes.ok) return null;
    const body = (await cardRes.json()) as {
      card?: { opaque_id?: string; truncated_card_number?: string };
    };
    const opaqueId = body.card?.opaque_id ?? `sx_${nonce(6)}`;
    const last4 = body.card?.truncated_card_number?.slice(-4) ?? "0000";
    const card: VirtualCard = {
      opaqueId,
      last4,
      status: "active",
      limitSgd: intent.amountSgd,
      currency: "XSGD",
      issuedAt: new Date().toISOString(),
      revokedAt: null,
      source: "straitsx",
    };
    cards.set(card.opaqueId, card);
    latestCard = card;
    return card;
  } catch {
    return null;
  }
}

export async function issueCard(intent: PurchaseIntent): Promise<IssueCardResult> {
  const gate = evaluateMandate({
    sku: intent.sku,
    merchant: intent.merchant,
    amountSgd: intent.amountSgd,
  });
  if (!gate.ok) {
    return { ok: false, reason: gate.reason, code: gate.code };
  }

  // Prefer Card MCP (hackathon path) over business API.
  const mcpCard = await tryMcpIssue(intent);
  if (mcpCard) {
    return {
      ok: true,
      card: mcpCard,
      mcp: straitsxCardMcpUrl(),
      note: `Card MCP issued on ${mcpCard.network ?? "Avalanche"} · tx ${mcpCard.settlementTx?.slice(0, 16)}…`,
      mcpPlan: lastMcpAttempt?.plan,
      paymentAccept: lastMcpAttempt?.accept,
    };
  }

  const apiCard = await tryStraitsxIssue(intent);
  if (apiCard) {
    return {
      ok: true,
      card: apiCard,
      mcp: straitsxCardMcpUrl(),
      note: "StraitsX CMS issued an instant virtual card",
    };
  }

  const card = localIssue(intent);
  const mcpNote = lastMcpAttempt?.reason
    ? `MCP pending (${lastMcpAttempt.stage}): ${lastMcpAttempt.reason}`
    : "Card MCP not completed — local stand-in";
  return {
    ok: true,
    card,
    mcp: straitsxCardMcpUrl(),
    note: mcpNote,
    mcpPlan: lastMcpAttempt?.plan,
    paymentAccept: lastMcpAttempt?.accept,
  };
}

export function revokeCard(opaqueId: string) {
  const card = cards.get(opaqueId);
  if (!card) return { ok: false as const, reason: "Card not found" };
  card.status = "revoked";
  card.revokedAt = new Date().toISOString();
  latestCard = card;
  cards.set(opaqueId, card);
  return { ok: true as const, card };
}

export type RhaRequest = {
  amount: number;
  currency: string;
  merchant: string;
  sku?: string;
  cardOpaqueId?: string;
  intentId?: string;
};

export function authorizeRha(req: RhaRequest) {
  const mandate = currentMandate();
  const policy = getActivePolicy();
  const card = req.cardOpaqueId ? cards.get(req.cardOpaqueId) : latestCard;
  if (!card || card.status !== "active") {
    return { approved: false, reason: "No active one-time card", code: "NO_CARD" };
  }
  if (policy.status === "frozen") {
    return { approved: false, reason: "Agent is frozen", code: "FROZEN" };
  }
  if (req.amount > card.limitSgd || req.amount > mandate.capSgd) {
    return { approved: false, reason: "Amount exceeds scoped card", code: "CAP" };
  }
  if (
    policy.requireApprovalOverSgd > 0 &&
    req.amount > policy.requireApprovalOverSgd
  ) {
    return {
      approved: false,
      reason: `Amount S$${req.amount} needs human approval (over S$${policy.requireApprovalOverSgd})`,
      code: "APPROVAL",
    };
  }
  if (req.merchant && !(mandate.merchants as readonly string[]).includes(req.merchant)) {
    return { approved: false, reason: "Merchant not on mandate", code: "MERCHANT" };
  }
  if (req.sku && !policy.skuAllowlist.includes(req.sku)) {
    return { approved: false, reason: "SKU outside frozen plan", code: "SKU" };
  }
  return {
    approved: true,
    reason: "Mandate match",
    code: "APPROVE",
    card: { last4: card.last4, opaqueId: card.opaqueId },
    asset: XSGD.symbol,
  };
}

export async function fundSubWallet() {
  const key = process.env.STRAITSX_API_KEY;
  if (!key) {
    return {
      ok: true,
      source: "sandbox" as const,
      amount: "12000.00",
      currency: "xsgd",
      status: "completed",
    };
  }
  try {
    const res = await fetch(
      `${straitsxHost()}/v1/sub-wallets/cards-settlement/transfers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-XFERS-APP-API-KEY": key,
        },
        body: JSON.stringify({
          data: {
            attributes: {
              amount: "12000.00",
              currency: "xsgd",
              walletSource: "xsgd",
              idempotencyId: `fund_${nonce(8)}`,
            },
          },
        }),
      },
    );
    if (!res.ok) throw new Error("straitsx fund failed");
    return { ok: true, source: "straitsx" as const, ...(await res.json()) };
  } catch {
    return {
      ok: true,
      source: "sandbox" as const,
      amount: "12000.00",
      currency: "xsgd",
      status: "completed",
    };
  }
}
