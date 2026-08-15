import { NextResponse } from "next/server";
import { enrollAgent, listRegistryAgents, agents } from "@/lib/identity";
import {
  getActivePolicy,
  listPolicies,
  setActiveAgent,
  sleepScore,
} from "@/lib/policy/store";

export async function GET() {
  void agents.corporate;
  return NextResponse.json({
    agents: listRegistryAgents(),
    policies: listPolicies(),
    active: getActivePolicy(),
  });
}

export async function POST(req: Request) {
  void agents.corporate;
  const body = (await req.json()) as { label?: string; setActive?: boolean };
  const label = body.label?.trim();
  if (!label) {
    return NextResponse.json({ error: "label required" }, { status: 400 });
  }
  const { agent, policy } = enrollAgent({ label });
  if (body.setActive === true) {
    setActiveAgent(agent.id);
  }
  return NextResponse.json({
    ok: true,
    agent,
    policy,
    sleep: sleepScore(policy),
  });
}
