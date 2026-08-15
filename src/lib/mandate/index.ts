import { mandateExpiryIso } from "@/lib/config";
import {
  checkSpendLimits,
  getActivePolicy,
  type AgentPolicy,
} from "@/lib/policy/store";

export type Mandate = {
  capSgd: number;
  maxPerTx: number;
  merchants: readonly string[];
  sku: string;
  expiresAt: string;
  principal: string;
  agentId: string;
};

export function mandateFromPolicy(policy: AgentPolicy): Mandate {
  return {
    capSgd: Math.min(policy.maxPerDaySgd, policy.maxPerWeekSgd),
    maxPerTx: policy.maxPerTxSgd,
    merchants: policy.merchants,
    sku: policy.skuAllowlist[0] ?? "",
    expiresAt: policy.expiresAt || mandateExpiryIso(),
    principal: policy.principal,
    agentId: policy.agentId,
  };
}

export function currentMandate(): Mandate {
  return mandateFromPolicy(getActivePolicy());
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

export function evaluateMandate(
  intent: SpendIntent,
  mandate = currentMandate(),
): MandateResult {
  const policy = getActivePolicy();

  if (policy.status === "frozen") {
    return { ok: false, reason: "Agent is frozen — spending disabled", code: "FROZEN" };
  }

  if (new Date(mandate.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: "Mandate expired", code: "EXPIRED" };
  }

  const limits = checkSpendLimits(intent.amountSgd, policy);
  if (!limits.ok) {
    return { ok: false, reason: limits.reason, code: limits.code };
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
      reason: `Merchant ${intent.merchant} is not on the approved list`,
      code: "MERCHANT",
    };
  }
  if (!policy.skuAllowlist.includes(intent.sku)) {
    return {
      ok: false,
      reason: `SKU ${intent.sku} is not on the approved list`,
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
