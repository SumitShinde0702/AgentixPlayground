import { NextRequest, NextResponse } from "next/server";
import { runCamel } from "@/lib/camel";
import { supplierDocument } from "@/lib/supplier/content";

export async function POST(req: NextRequest) {
  let html = "";
  try {
    const body = (await req.json()) as { html?: string };
    html = body.html ?? "";
  } catch {
    html = "";
  }
  const result = await runCamel(html || supplierDocument());
  return NextResponse.json(result);
}
