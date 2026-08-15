import { NextResponse } from "next/server";
import { agents } from "@/lib/identity";
import { freezeAgent, getActivePolicy, sleepScore } from "@/lib/policy/store";

export async function POST(req: Request) {
  void agents.corporate;
  const body = (await req.json()) as {
    agentId?: string;
    frozen?: boolean;
  };
  const agentId = body.agentId || getActivePolicy().agentId;
  const frozen = body.frozen !== false;
  try {
    const policy = freezeAgent(agentId, frozen);
    return NextResponse.json({
      ok: true,
      policy,
      sleep: sleepScore(policy),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "freeze failed" },
      { status: 404 },
    );
  }
}
