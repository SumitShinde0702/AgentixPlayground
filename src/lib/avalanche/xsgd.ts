import {
  XSGD,
  agentWalletAddress,
  avalancheRpcUrl,
  merchantWalletAddress,
  snowtraceAddressUrl,
  snowtraceTokenUrl,
  snowtraceTxUrl,
  x402Network,
} from "@/lib/config";

const BALANCE_OF = "0x70a08231";

function padAddress(addr: string) {
  return addr.replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

export function encodeBalanceOf(owner: string) {
  return `${BALANCE_OF}${padAddress(owner)}`;
}

export function encodeTransfer(to: string, amountAtomic: bigint) {
  const selector = "a9059cbb";
  const amt = amountAtomic.toString(16).padStart(64, "0");
  return `0x${selector}${padAddress(to)}${amt}`;
}

export function sgdToAtomicBig(sgd: number) {
  return BigInt(Math.round(sgd * 10 ** XSGD.decimals));
}

export function atomicToSgd(atomic: bigint) {
  return Number(atomic) / 10 ** XSGD.decimals;
}

export async function ethCall(to: string, data: string): Promise<string> {
  const res = await fetch(avalancheRpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const json = (await res.json()) as { result?: string; error?: { message?: string } };
  if (json.error?.message) throw new Error(json.error.message);
  if (!json.result) throw new Error("Empty eth_call result");
  return json.result;
}

export async function xsgdBalanceOf(owner: string) {
  const raw = await ethCall(XSGD.address, encodeBalanceOf(owner));
  const atomic = BigInt(raw);
  return {
    owner,
    atomic: atomic.toString(),
    amount: atomicToSgd(atomic),
    symbol: XSGD.symbol,
    token: XSGD.address,
    network: x402Network(),
    snowtrace: snowtraceTokenUrl(owner),
    addressUrl: snowtraceAddressUrl(owner),
  };
}

export async function liveFundingSnapshot() {
  const agent = agentWalletAddress();
  const merchant = merchantWalletAddress();
  if (!agent) {
    return {
      configured: false as const,
      agent: null,
      merchant: merchant || null,
      balance: null,
      network: x402Network(),
    };
  }
  try {
    const balance = await xsgdBalanceOf(agent);
    return {
      configured: true as const,
      agent,
      merchant: merchant || null,
      balance,
      network: x402Network(),
      merchantUrl: merchant ? snowtraceAddressUrl(merchant) : null,
    };
  } catch (err) {
    return {
      configured: true as const,
      agent,
      merchant: merchant || null,
      balance: null,
      network: x402Network(),
      merchantUrl: merchant ? snowtraceAddressUrl(merchant) : null,
      error: err instanceof Error ? err.message : "balanceOf failed",
    };
  }
}

export { snowtraceTxUrl };
