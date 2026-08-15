import { NextResponse } from "next/server";
import {
  getActiveAgentId,
  getActivePolicy,
  getSpendSnapshot,
  listPolicies,
  setActiveAgent,
  sleepScore,
  upsertPolicy,
  type PolicyPatch,
} from "@/lib/policy/store";
import { agents } from "@/lib/identity";

export async function GET() {
  void agents.corporate;
  const policy = getActivePolicy();
  const policies = listPolicies().map((p) => ({
    ...p,
    sleep: sleepScore(p),
    spend: getSpendSnapshot(p.agentId),
  }));
  return NextResponse.json({
    activeAgentId: getActiveAgentId(),
    policy,
    policies,
    spend: getSpendSnapshot(policy.agentId),
    sleep: sleepScore(policy),
  });
}

export async function POST(req: Request) {
  void agents.corporate;
  const body = (await req.json()) as PolicyPatch & {
    agentId?: string;
    setActive?: boolean;
  };
  const agentId = body.agentId || getActiveAgentId();
  const policy = upsertPolicy({ ...body, agentId });
  if (body.setActive === true) {
    setActiveAgent(agentId);
  }
  return NextResponse.json({
    ok: true,
    activeAgentId: getActiveAgentId(),
    policy,
    sleep: sleepScore(policy),
    spend: getSpendSnapshot(policy.agentId),
  });
}
