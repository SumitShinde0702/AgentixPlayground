import { NextResponse } from "next/server";
import { parsePolicyNlSmart } from "@/lib/policy/nl";
import { agents } from "@/lib/identity";

export async function POST(req: Request) {
  void agents.corporate;
  const body = (await req.json()) as { text?: string; agentId?: string };
  const text = body.text?.trim() ?? "";
  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }
  const result = await parsePolicyNlSmart(text);
  return NextResponse.json({
    ...result,
    agentId: body.agentId,
  });
}
