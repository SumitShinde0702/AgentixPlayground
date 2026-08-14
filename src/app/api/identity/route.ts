import { NextRequest, NextResponse } from "next/server";
import {
  agents,
  createChallenge,
  signIdentity,
  verifyIdentity,
  type AgentRole,
} from "@/lib/identity";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { role?: AgentRole };
  const role = body.role === "rogue" ? "rogue" : "corporate";
  const agent = role === "rogue" ? agents.rogue : agents.corporate;
  const challenge = createChallenge();
  const signed = signIdentity(agent, challenge);
  const result = verifyIdentity(signed);
  return NextResponse.json({ role, request: { ...signed, signature: signed.signature }, result });
}
