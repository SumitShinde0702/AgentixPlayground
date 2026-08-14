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

export function x402Network() {
  return process.env.X402_NETWORK ?? "eip155:43113";
}

export function straitsxHost() {
  return process.env.STRAITSX_API_HOST ?? "https://api-sandbox.straitsx.com";
}

export function straitsxCardMcpUrl() {
  return process.env.STRAITSX_CARD_MCP_URL ?? "https://card.straitsx.ai/sandbox/sse";
}

export function facilitatorUrl() {
  return (
    process.env.X402_FACILITATOR_URL ??
    "https://facilitator.ultravioletadao.xyz"
  );
}

export function mandateExpiryIso() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(16, 0, 0, 0);
  return d.toISOString();
}
