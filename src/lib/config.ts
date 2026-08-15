export const MANDATE = {
  principal: "Apex Fabrication Pte Ltd",
  agentId: "procure-01",
  capSgd: 12_000,
  maxPerTx: 12_000,
  merchants: ["helix-materials.sg"] as const,
  sku: "ALU-6061-T6",
  skuName: "Aluminium 6061-T6 plate, mill finish",
  merchantHost: "helix-materials.sg",
  merchantName: "Helix Materials",
  priceSgd: 8_420,
  quantity: "4.2 t",
} as const;

export const XSGD = {
  symbol: "XSGD",
  address: "0xb2F85b7AB3c2b6f62DF06dE6aE7D09c010a5096E",
  decimals: 6,
} as const;

function trim(v: string | undefined) {
  return (v ?? "").trim();
}

/**
 * Server env — Amplify build writes `.env.production` from console vars
 * before `next build`, so these static reads get inlined into SSR bundles.
 * Do not put secrets in next.config `env` (that ships to the browser).
 */
export function agentWalletAddress() {
  return trim(process.env.AGENT_WALLET_ADDRESS);
}

export function merchantWalletAddress() {
  return (
    trim(process.env.MERCHANT_WALLET_ADDRESS) ||
    trim(process.env.CROSSMINT_WALLET_ADDRESS) ||
    ""
  );
}

export function agentPrivateKey() {
  return trim(process.env.AGENT_PRIVATE_KEY);
}

export function x402Network() {
  return trim(process.env.X402_NETWORK) || "eip155:43114";
}

export function avalancheChainId() {
  const net = x402Network();
  if (net === "eip155:43113") return 43113;
  return 43114;
}

export function avalancheRpcUrl() {
  return avalancheChainId() === 43113
    ? "https://api.avax-test.network/ext/bc/C/rpc"
    : "https://api.avax.network/ext/bc/C/rpc";
}

export function snowtraceAddressUrl(address: string) {
  const base =
    avalancheChainId() === 43113
      ? "https://testnet.snowtrace.io"
      : "https://snowtrace.io";
  return `${base}/address/${address}`;
}

export function snowtraceTxUrl(txHash: string) {
  const base =
    avalancheChainId() === 43113
      ? "https://testnet.snowtrace.io"
      : "https://snowtrace.io";
  return `${base}/tx/${txHash}`;
}

export function snowtraceTokenUrl(holder: string) {
  const base =
    avalancheChainId() === 43113
      ? "https://testnet.snowtrace.io"
      : "https://snowtrace.io";
  return `${base}/token/${XSGD.address}?a=${holder}`;
}

export function straitsxHost() {
  return trim(process.env.STRAITSX_API_HOST) || "https://api-sandbox.straitsx.com";
}

export function straitsxCardMcpUrl() {
  return (
    trim(process.env.STRAITSX_CARD_MCP_URL) ||
    "https://card.straitsx.ai/sandbox/sse"
  );
}

export function facilitatorUrl() {
  return (
    trim(process.env.X402_FACILITATOR_URL) ||
    "https://facilitator.ultravioletadao.xyz"
  );
}

export function mandateExpiryIso() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(16, 0, 0, 0);
  return d.toISOString();
}
