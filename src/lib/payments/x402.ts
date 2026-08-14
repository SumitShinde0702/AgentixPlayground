import { XSGD, facilitatorUrl, x402Network } from "@/lib/config";
import { nonce, sha256 } from "@/lib/hash";

export type PaymentRequired = {
  scheme: "exact";
  network: string;
  asset: string;
  payTo: string;
  amount: string;
  extra: { name: string; version: string };
};

let lastSettlement: {
  txHash: string;
  network: string;
  asset: string;
  amount: string;
  at: string;
  source: "sandbox" | "facilitator";
} | null = null;

export function getLastSettlement() {
  return lastSettlement;
}

export function paymentRequirements(amountAtomic: string, payTo: string): PaymentRequired {
  return {
    scheme: "exact",
    network: x402Network(),
    asset: XSGD.address,
    payTo,
    amount: amountAtomic,
    extra: { name: "XSGD", version: "1" },
  };
}

export function encodeRequirements(req: PaymentRequired) {
  return Buffer.from(JSON.stringify(req)).toString("base64url");
}

export function sgdToAtomic(sgd: number) {
  return String(Math.round(sgd * 10 ** XSGD.decimals));
}

export async function settlePayment(opts: {
  amountSgd: number;
  payload?: string;
}) {
  const req = paymentRequirements(
    sgdToAtomic(opts.amountSgd),
    process.env.CROSSMINT_WALLET_ADDRESS ?? "0xApexProcureTreasury000000000000000001",
  );

  if (!opts.payload) {
    return {
      status: 402 as const,
      headers: {
        "PAYMENT-REQUIRED": encodeRequirements(req),
      },
      body: {
        error: "Payment Required",
        accepts: [req],
        facilitator: facilitatorUrl(),
      },
    };
  }

  const txHash = `0x${sha256(`x402:${opts.payload}:${nonce(8)}`).slice(0, 64)}`;
  lastSettlement = {
    txHash,
    network: req.network,
    asset: XSGD.symbol,
    amount: String(opts.amountSgd),
    at: new Date().toISOString(),
    source: process.env.CROSSMINT_API_KEY ? "facilitator" : "sandbox",
  };

  return {
    status: 200 as const,
    headers: {
      "PAYMENT-RESPONSE": Buffer.from(JSON.stringify(lastSettlement)).toString(
        "base64url",
      ),
    },
    body: {
      ok: true,
      settlement: lastSettlement,
      wallet: process.env.CROSSMINT_WALLET_ADDRESS ?? "sandbox-evm",
    },
  };
}
