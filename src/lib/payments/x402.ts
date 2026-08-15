import {
  XSGD,
  facilitatorUrl,
  merchantWalletAddress,
  x402Network,
} from "@/lib/config";
import { nonce, sha256 } from "@/lib/hash";

export type PaymentRequired = {
  scheme: "exact";
  network: string;
  asset: string;
  payTo: string;
  amount: string;
  extra: { name: string; version: string };
};

export type Settlement = {
  txHash: string;
  network: string;
  asset: string;
  amount: string;
  at: string;
  source: "simulated" | "avalanche";
  payTo: string;
  snowtrace?: string;
};

let lastSettlement: Settlement | null = null;
let livePending: {
  txHash: string;
  amountSgd: number;
  payTo: string;
  network: string;
} | null = null;

export function getLastSettlement() {
  return lastSettlement;
}

export function getLivePending() {
  return livePending;
}

function snowtraceBase(network: string) {
  return network === "eip155:43113"
    ? "https://testnet.snowtrace.io"
    : "https://snowtrace.io";
}

export function recordLiveSettlement(opts: {
  txHash: string;
  amountSgd: number;
  payTo: string;
  network?: string;
}) {
  const network = opts.network ?? x402Network();
  livePending = {
    txHash: opts.txHash,
    amountSgd: opts.amountSgd,
    payTo: opts.payTo,
    network,
  };
  lastSettlement = {
    txHash: opts.txHash,
    network,
    asset: XSGD.symbol,
    amount: String(opts.amountSgd),
    at: new Date().toISOString(),
    source: "avalanche",
    payTo: opts.payTo,
    snowtrace: `${snowtraceBase(network)}/tx/${opts.txHash}`,
  };
  return lastSettlement;
}

export function paymentRequirements(
  amountAtomic: string,
  payTo: string,
): PaymentRequired {
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

function payToAddress() {
  return (
    merchantWalletAddress() ||
    "0xApexProcureTreasury000000000000000001"
  );
}

export async function settlePayment(opts: {
  amountSgd: number;
  payload?: string;
}) {
  const payTo = payToAddress();
  const req = paymentRequirements(sgdToAtomic(opts.amountSgd), payTo);

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

  if (livePending) {
    const network = livePending.network || req.network;
    lastSettlement = {
      txHash: livePending.txHash,
      network,
      asset: XSGD.symbol,
      amount: String(opts.amountSgd),
      at: new Date().toISOString(),
      source: "avalanche",
      payTo: livePending.payTo || payTo,
      snowtrace: `${snowtraceBase(network)}/tx/${livePending.txHash}`,
    };
    livePending = null;
  } else {
    const txHash = `0x${sha256(`x402:${opts.payload}:${nonce(8)}`).slice(0, 64)}`;
    lastSettlement = {
      txHash,
      network: req.network,
      asset: XSGD.symbol,
      amount: String(opts.amountSgd),
      at: new Date().toISOString(),
      source: "simulated",
      payTo,
    };
  }

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
      wallet: payTo,
    },
  };
}
