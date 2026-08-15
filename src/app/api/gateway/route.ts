import { NextResponse } from "next/server";
import { assertGatewayAuth } from "@/lib/gateway/auth";
import { agents } from "@/lib/identity";

export async function GET(req: Request) {
  void agents.corporate;
  const denied = assertGatewayAuth(req);
  if (denied) return denied;

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const base = process.env.GATEX_BASE_URL?.trim() ||
    (host ? `${proto}://${host}` : "http://localhost:3000");

  return NextResponse.json({
    name: "gatex-gateway",
    version: 1,
    baseUrl: base,
    skill: `${base}/skills/gatex/SKILL.md`,
    auth: {
      optionalHeader: "x-gatex-key",
      required: Boolean(process.env.GATEWAY_API_KEY?.trim()),
    },
    tools: [
      {
        name: "check_spend",
        method: "POST",
        path: "/api/gateway/check",
        description: "Evaluate spend against active agent policy (mandate, caps, freeze).",
        body: {
          sku: "string",
          merchant: "string",
          amountSgd: "number",
          agentId: "string?",
        },
      },
      {
        name: "request_pay",
        method: "POST",
        path: "/api/gateway/pay",
        description:
          "Issue one-time card via GateX (Card MCP when configured) after policy + RHA.",
        body: {
          sku: "string",
          merchant: "string",
          amountSgd: "number",
          agentId: "string?",
        },
      },
      {
        name: "get_receipt",
        method: "GET",
        path: "/api/gateway/receipt/{receiptId}",
        description: "Fetch sealed audit chain for a gateway payment.",
      },
    ],
  });
}
