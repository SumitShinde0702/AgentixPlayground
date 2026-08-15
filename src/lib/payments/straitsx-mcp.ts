import { randomBytes } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
import { agentWalletAddress, straitsxCardMcpUrl } from "@/lib/config";

export type McpTool = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
};

export type CardMcpIssuePlan = {
  action: string;
  method: string;
  url: string;
  body: {
    amount_sgd: number;
    cardholder_name: string;
    wallet_address: string;
  };
  environment: {
    chain: string;
    chain_id: number;
    environment: string;
    note: string;
    token: string;
  };
  steps: string[];
  instruction?: string;
};

export type PaymentAccept = {
  scheme: string;
  network: string;
  amount: string;
  asset: `0x${string}`;
  payTo: `0x${string}`;
  maxTimeoutSeconds?: number;
  chainId: number;
  extra: {
    assetTransferMethod: string;
    name: string;
    version: string;
  };
};

export type IssuedMcpCard = {
  card_opaque_id: string;
  card_html?: string;
  settlement_tx: string;
  last4?: string;
  truncated_card_number?: string;
};

function mcpBase() {
  const url = straitsxCardMcpUrl();
  // https://card.straitsx.ai/sandbox/sse → https://card.straitsx.ai
  return url.replace(/\/(sandbox|production)\/sse\/?$/, "");
}

function mcpPathPrefix() {
  const url = straitsxCardMcpUrl();
  if (url.includes("/production/")) return "production";
  return "sandbox";
}

export function cardMcpEndpoint() {
  return straitsxCardMcpUrl();
}

export function cardMcpToolName() {
  return mcpPathPrefix() === "production" ? "get_card_prod" : "get_card_sandbox";
}

export function mcpCardAmountSgd(preferred?: number) {
  const fromEnv = Number(process.env.CARD_MCP_AMOUNT_SGD ?? preferred ?? 10);
  return Math.min(30, Math.max(5, Number.isFinite(fromEnv) ? fromEnv : 10));
}

type Pending = {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
};

/** Minimal MCP SSE client: open stream, POST JSON-RPC to messages endpoint. */
export async function withCardMcpSession<T>(
  fn: (call: (method: string, params?: unknown, id?: number) => Promise<unknown>) => Promise<T>,
): Promise<T> {
  const sseUrl = straitsxCardMcpUrl();
  const res = await fetch(sseUrl, {
    headers: { Accept: "text/event-stream" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok || !res.body) throw new Error(`MCP SSE ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let endpoint: string | null = null;
  let nextId = 1;
  const pending = new Map<number, Pending>();

  const failAll = (err: Error) => {
    for (const p of pending.values()) p.reject(err);
    pending.clear();
  };

  const pump = (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const dataLine = chunk
            .split("\n")
            .find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          const data = dataLine.replace(/^data:\s*/, "").trim();
          if (chunk.includes("event: endpoint")) {
            endpoint = data;
            continue;
          }
          if (!data.startsWith("{")) continue;
          try {
            const msg = JSON.parse(data) as {
              id?: number;
              result?: unknown;
              error?: { message?: string };
            };
            if (typeof msg.id === "number" && pending.has(msg.id)) {
              const p = pending.get(msg.id)!;
              pending.delete(msg.id);
              if (msg.error) p.reject(new Error(msg.error.message ?? "MCP error"));
              else p.resolve(msg.result);
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch (err) {
      failAll(err instanceof Error ? err : new Error("MCP stream failed"));
    }
  })();

  for (let i = 0; i < 50 && !endpoint; i++) {
    await new Promise((r) => setTimeout(r, 50));
  }
  if (!endpoint) {
    await reader.cancel().catch(() => {});
    throw new Error("MCP endpoint not received");
  }

  const sessionPath: string = endpoint;
  const msgUrl = sessionPath.startsWith("http")
    ? sessionPath
    : `${mcpBase()}${sessionPath}`;

  const post = async (body: unknown) => {
    await fetch(msgUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(body),
    });
  };

  const call = (method: string, params?: unknown, id?: number) => {
    const rpcId = id ?? nextId++;
    const promise = new Promise<unknown>((resolve, reject) => {
      pending.set(rpcId, { resolve, reject });
      setTimeout(() => {
        if (pending.has(rpcId)) {
          pending.delete(rpcId);
          reject(new Error(`MCP timeout: ${method}`));
        }
      }, 12_000);
    });
    void post({ jsonrpc: "2.0", id: rpcId, method, params });
    return promise;
  };

  try {
    await call("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "secure-procure", version: "0.1.0" },
    });
    await post({ jsonrpc: "2.0", method: "notifications/initialized" });
    return await fn(call);
  } finally {
    await reader.cancel().catch(() => {});
    failAll(new Error("MCP session closed"));
    await pump.catch(() => {});
  }
}

export async function listCardMcpTools() {
  const url = cardMcpEndpoint();
  try {
    const tools = await withCardMcpSession(async (call) => {
      const result = (await call("tools/list")) as { tools?: McpTool[] };
      return result.tools ?? [];
    });
    return {
      url,
      reachable: true,
      status: 200,
      tools: tools.map((t) => t.name),
      toolName: cardMcpToolName(),
    };
  } catch {
    return {
      url,
      reachable: false,
      status: 0,
      tools: [] as string[],
      toolName: cardMcpToolName(),
    };
  }
}

export async function getCardIssuePlan(opts: {
  walletAddress: string;
  cardholderName: string;
  amountSgd: number;
}): Promise<CardMcpIssuePlan> {
  const tool = cardMcpToolName();
  return withCardMcpSession(async (call) => {
    const result = (await call("tools/call", {
      name: tool,
      arguments: {
        wallet_address: opts.walletAddress,
        cardholder_name: opts.cardholderName,
        amount_sgd: opts.amountSgd,
      },
    })) as { content?: { type: string; text?: string }[] };

    const text = result.content?.find((c) => c.type === "text")?.text;
    if (!text) throw new Error("MCP tool returned no text");
    return JSON.parse(text) as CardMcpIssuePlan;
  });
}

function decodePaymentRequired(header: string | null): {
  accepts: PaymentAccept[];
} {
  if (!header) throw new Error("Missing PAYMENT-REQUIRED");
  let raw = "";
  try {
    raw = Buffer.from(header, "base64url").toString("utf8");
  } catch {
    raw = Buffer.from(header, "base64").toString("utf8");
  }
  return JSON.parse(raw) as { accepts: PaymentAccept[] };
}

/** x402 wire encoding: standard RFC 4648 base64 (not base64url). */
function encodePaymentSignature(payment: unknown) {
  return Buffer.from(JSON.stringify(payment)).toString("base64");
}

function isBase64DecodeError(body: string) {
  return /illegal base64|base64 decode|invalid PAYMENT-SIGNATURE/i.test(body);
}

function normalizePrivateKey(raw: string): `0x${string}` {
  let s = raw.trim().replace(/^["']|["']$/g, "").replace(/\s+/g, "");
  if (s.startsWith("0X")) s = `0x${s.slice(2)}`;
  if (!s.startsWith("0x")) s = `0x${s}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(s)) {
    throw new Error(
      "AGENT_PRIVATE_KEY must be 64 hex chars (optional 0x). Export from MetaMask → Account details → Show private key. No quotes/spaces.",
    );
  }
  return s as `0x${string}`;
}

async function signEip3009Payment(accept: PaymentAccept, from: `0x${string}`) {
  const pk = process.env.AGENT_PRIVATE_KEY?.trim();
  if (!pk) throw new Error("AGENT_PRIVATE_KEY required to pay for MCP card");

  const key = normalizePrivateKey(pk);
  const account = privateKeyToAccount(key);
  if (account.address.toLowerCase() !== from.toLowerCase()) {
    throw new Error(
      `Private key address ${account.address} ≠ wallet ${from}`,
    );
  }

  if (!accept.amount || !/^\d+$/.test(accept.amount)) {
    throw new Error(`Invalid payment amount from 402: ${JSON.stringify(accept.amount)}`);
  }

  const now = Math.floor(Date.now() / 1000);
  const validAfter = BigInt(Math.max(0, now - 60));
  const validBefore = BigInt(now + (accept.maxTimeoutSeconds ?? 300));
  const nonceBytes = randomBytes(32);
  const authNonce = `0x${nonceBytes.toString("hex")}` as `0x${string}`;

  const authorization = {
    from,
    to: accept.payTo,
    value: BigInt(accept.amount),
    validAfter,
    validBefore,
    nonce: authNonce,
  };

  const signature = await account.signTypedData({
    domain: {
      name: accept.extra.name || "XSGD",
      version: accept.extra.version || "2",
      chainId: accept.chainId,
      verifyingContract: accept.asset,
    },
    types: {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "TransferWithAuthorization",
    message: authorization,
  });

  const authPayload = {
    signature,
    authorization: {
      from: authorization.from,
      to: authorization.to,
      value: accept.amount,
      validAfter: authorization.validAfter.toString(),
      validBefore: authorization.validBefore.toString(),
      nonce: authorization.nonce,
    },
  };

  // Compact `accepted` — large headers get truncated (~1KB) and blow up base64 decode.
  // Amount must be present (cardapi → invalid atomic amount "" without it).
  const payment = {
    x402Version: 1,
    scheme: "exact",
    network: accept.network,
    accepted: {
      scheme: accept.scheme,
      network: accept.network,
      amount: accept.amount,
      asset: accept.asset,
      payTo: accept.payTo,
      maxTimeoutSeconds: accept.maxTimeoutSeconds ?? 300,
      extra: {
        name: accept.extra?.name || "XSGD",
        version: accept.extra?.version || "2",
      },
    },
    payload: authPayload,
  };

  return {
    payment,
    encoded: encodePaymentSignature(payment),
    // Classic v1 shape (smaller) — fallback if header still truncates.
    encodedV1: encodePaymentSignature({
      x402Version: 1,
      scheme: "exact",
      network: accept.network,
      payload: authPayload,
    }),
  };
}

export async function issueCardViaMcp(opts: {
  cardholderName: string;
  amountSgd?: number;
  walletAddress?: string;
}): Promise<{
  ok: true;
  plan: CardMcpIssuePlan;
  accept: PaymentAccept;
  card: IssuedMcpCard;
  paid: boolean;
} | {
  ok: false;
  stage: "mcp" | "402" | "pay" | "retry";
  reason: string;
  plan?: CardMcpIssuePlan;
  accept?: PaymentAccept;
}> {
  const wallet =
    (opts.walletAddress || agentWalletAddress() || "").trim() as `0x${string}`;
  if (!wallet) {
    return { ok: false, stage: "mcp", reason: "AGENT_WALLET_ADDRESS missing" };
  }

  const amountSgd = mcpCardAmountSgd(opts.amountSgd);
  let plan: CardMcpIssuePlan;
  try {
    plan = await getCardIssuePlan({
      walletAddress: wallet,
      cardholderName: opts.cardholderName,
      amountSgd,
    });
  } catch (err) {
    return {
      ok: false,
      stage: "mcp",
      reason: err instanceof Error ? err.message : "MCP get_card failed",
    };
  }

  const issueUrl = plan.url;
  const body = {
    amount_sgd: amountSgd,
    cardholder_name: opts.cardholderName,
    wallet_address: wallet,
  };

  let first: Response;
  try {
    first = await fetch(issueUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return {
      ok: false,
      stage: "402",
      reason: err instanceof Error ? err.message : "cardapi unreachable",
      plan,
    };
  }

  if (first.status !== 402) {
    const text = await first.text();
    return {
      ok: false,
      stage: "402",
      reason: `Expected 402, got ${first.status}: ${text.slice(0, 200)}`,
      plan,
    };
  }

  const firstText = await first.text();
  let accept: PaymentAccept;
  try {
    // Prefer JSON body accepts — more reliable than proxy-stripped headers.
    const fromBody = JSON.parse(firstText) as { accepts?: PaymentAccept[] };
    const prHeader =
      first.headers.get("PAYMENT-REQUIRED") ??
      first.headers.get("payment-required");
    const fromHeader = prHeader ? decodePaymentRequired(prHeader).accepts : [];
    accept = fromBody.accepts?.[0] ?? fromHeader[0];
    if (!accept?.amount) {
      throw new Error(
        `No amount in 402 accepts. body=${firstText.slice(0, 240)}`,
      );
    }
  } catch (err) {
    return {
      ok: false,
      stage: "402",
      reason: err instanceof Error ? err.message : "Bad PAYMENT-REQUIRED",
      plan,
    };
  }

  if (!process.env.AGENT_PRIVATE_KEY?.trim()) {
    return {
      ok: false,
      stage: "pay",
      reason:
        "MCP 402 ready — set AGENT_PRIVATE_KEY (Fuji wallet with test XSGD) to complete EIP-3009 payment",
      plan,
      accept,
    };
  }

  let signed: Awaited<ReturnType<typeof signEip3009Payment>>;
  try {
    signed = await signEip3009Payment(accept, wallet);
  } catch (err) {
    return {
      ok: false,
      stage: "pay",
      reason: err instanceof Error ? err.message : "EIP-3009 sign failed",
      plan,
      accept,
    };
  }

  // Spec: standard base64 in PAYMENT-SIGNATURE / X-PAYMENT.
  // Also mirror into JSON body — Apache/proxies sometimes mangle `+` in headers,
  // and oversized headers truncate near ~1KB (illegal base64 at byte ~1076).
  const attempts: {
    name: string;
    headers: Record<string, string>;
    body: Record<string, unknown>;
  }[] = [
    {
      name: "header+body",
      headers: {
        "Content-Type": "application/json",
        "PAYMENT-SIGNATURE": signed.encoded,
        "X-PAYMENT": signed.encoded,
      },
      body: { ...body, payment_signature: signed.encoded },
    },
    {
      name: "body-only",
      headers: { "Content-Type": "application/json" },
      body: { ...body, payment_signature: signed.encoded },
    },
    {
      name: "v1-compact",
      headers: {
        "Content-Type": "application/json",
        "PAYMENT-SIGNATURE": signed.encodedV1,
        "X-PAYMENT": signed.encodedV1,
      },
      body: { ...body, payment_signature: signed.encodedV1 },
    },
  ];

  let lastStatus = 0;
  let lastBody = "";
  let lastAttempt = "";

  for (const attempt of attempts) {
    let second: Response;
    try {
      second = await fetch(issueUrl, {
        method: "POST",
        headers: attempt.headers,
        body: JSON.stringify(attempt.body),
      });
    } catch (err) {
      return {
        ok: false,
        stage: "retry",
        reason: err instanceof Error ? err.message : "cardapi retry failed",
        plan,
        accept,
      };
    }

    lastStatus = second.status;
    lastBody = await second.text();
    lastAttempt = attempt.name;

    if (second.ok) {
      let card: IssuedMcpCard;
      try {
        card = JSON.parse(lastBody) as IssuedMcpCard;
      } catch {
        return {
          ok: false,
          stage: "retry",
          reason: `Unparseable cardapi body: ${lastBody.slice(0, 200)}`,
          plan,
          accept,
        };
      }
      if (!card.card_opaque_id || !card.settlement_tx) {
        return {
          ok: false,
          stage: "retry",
          reason: `Incomplete card payload: ${lastBody.slice(0, 300)}`,
          plan,
          accept,
        };
      }
      return { ok: true, plan, accept, card, paid: true };
    }

    // Only rotate encodings on decode/header failures; other 402s (funds, sig) stop.
    if (!isBase64DecodeError(lastBody)) break;
  }

  return {
    ok: false,
    stage: "retry",
    reason: `cardapi ${lastStatus} (${lastAttempt}): ${lastBody.slice(0, 300)}`,
    plan,
    accept,
  };
}
