import { MANDATE, mandateExpiryIso } from "@/lib/config";

export type Mandate = {
  capSgd: number;
  maxPerTx: number;
  merchants: readonly string[];
  sku: string;
  expiresAt: string;
  principal: string;
  agentId: string;
};

export function currentMandate(): Mandate {
  return {
    capSgd: MANDATE.capSgd,
    maxPerTx: MANDATE.maxPerTx,
    merchants: MANDATE.merchants,
    sku: MANDATE.sku,
    expiresAt: mandateExpiryIso(),
    principal: MANDATE.principal,
    agentId: MANDATE.agentId,
  };
}

export type SpendIntent = {
  sku: string;
  merchant: string;
  amountSgd: number;
  extraActions?: string[];
};

export type MandateResult =
  | { ok: true; mandate: Mandate }
  | { ok: false; reason: string; code: string };

export function evaluateMandate(intent: SpendIntent, mandate = currentMandate()): MandateResult {
  if (new Date(mandate.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: "Mandate expired", code: "EXPIRED" };
  }
  if (intent.amountSgd > mandate.maxPerTx || intent.amountSgd > mandate.capSgd) {
    return {
      ok: false,
      reason: `Amount S$${intent.amountSgd} exceeds cap S$${mandate.capSgd}`,
      code: "CAP",
    };
  }
  if (!mandate.merchants.includes(intent.merchant)) {
    return {
      ok: false,
      reason: `Merchant ${intent.merchant} is not whitelisted`,
      code: "MERCHANT",
    };
  }
  if (intent.sku !== mandate.sku) {
    return {
      ok: false,
      reason: `SKU ${intent.sku} is outside mandate ${mandate.sku}`,
      code: "SKU",
    };
  }
  if (intent.extraActions && intent.extraActions.length > 0) {
    return {
      ok: false,
      reason: `Untrusted extra actions blocked: ${intent.extraActions.join(", ")}`,
      code: "EXTRA",
    };
  }
  return { ok: true, mandate };
}
