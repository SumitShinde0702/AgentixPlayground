import type { AgentPolicy } from "@/lib/policy/store";

export type PolicyNlPatch = Partial<
  Pick<
    AgentPolicy,
    | "maxPerTxSgd"
    | "maxPerDaySgd"
    | "maxPerWeekSgd"
    | "maxTxPerHour"
    | "requireApprovalOverSgd"
    | "merchants"
    | "skuAllowlist"
    | "status"
    | "autoRevokeAfterPurchase"
    | "notes"
  >
>;

function money(m: string) {
  const n = Number(m.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Deterministic NL → policy patch (no API key required). */
export function parsePolicyNl(text: string): {
  patch: PolicyNlPatch;
  summary: string;
  warnings: string[];
} {
  const t = text.toLowerCase();
  const patch: PolicyNlPatch = { notes: text.trim() };
  const summary: string[] = [];
  const warnings: string[] = [];

  if (/\bfreeze\b|\block\b.*agent|\bkill switch\b/.test(t)) {
    patch.status = "frozen";
    summary.push("Freeze agent");
  }
  if (/\bunfreeze\b|\breactivate\b|\bthaw\b/.test(t)) {
    patch.status = "active";
    summary.push("Unfreeze agent");
  }

  const perTx =
    t.match(
      /(?:max|at most|no more than|never more than|cap)\s*(?:of\s*)?\$?\s*([\d,]+(?:\.\d+)?)\s*(?:sgd|\$)?\s*(?:per\s*(?:tx|transaction|purchase|buy)|each)/i,
    ) ||
    t.match(
      /\$?\s*([\d,]+(?:\.\d+)?)\s*(?:sgd)?\s*(?:max\s*)?(?:per\s*(?:tx|transaction|purchase))/i,
    );
  if (perTx) {
    const v = money(perTx[1]);
    if (v != null) {
      patch.maxPerTxSgd = v;
      summary.push(`Per-tx max S$${v}`);
    }
  }

  const perDay = t.match(
    /\$?\s*([\d,]+(?:\.\d+)?)\s*(?:sgd|\$)?\s*(?:per|a|\/)\s*day|daily\s*(?:cap|limit|max)?\s*(?:of\s*)?\$?\s*([\d,]+(?:\.\d+)?)/i,
  );
  if (perDay) {
    const v = money(perDay[1] || perDay[2]);
    if (v != null) {
      patch.maxPerDaySgd = v;
      summary.push(`Daily cap S$${v}`);
    }
  }

  const perWeek = t.match(
    /\$?\s*([\d,]+(?:\.\d+)?)\s*(?:sgd|\$)?\s*(?:per|a|\/)\s*week|weekly\s*(?:cap|limit|max)?\s*(?:of\s*)?\$?\s*([\d,]+(?:\.\d+)?)/i,
  );
  if (perWeek) {
    const v = money(perWeek[1] || perWeek[2]);
    if (v != null) {
      patch.maxPerWeekSgd = v;
      summary.push(`Weekly cap S$${v}`);
    }
  }

  const rate = t.match(
    /(?:max|at most)?\s*(\d+)\s*(?:tx|transactions?|purchases?)\s*(?:per|\/)\s*hour/i,
  );
  if (rate) {
    const v = Number(rate[1]);
    if (Number.isFinite(v)) {
      patch.maxTxPerHour = v;
      summary.push(`${v} tx/hour`);
    }
  }

  const approval = t.match(
    /(?:approve|approval|human|me)\s*(?:needed|required)?\s*(?:for|over|above|anything over)?\s*\$?\s*([\d,]+(?:\.\d+)?)/i,
  ) ||
    t.match(
      /(?:over|above)\s*\$?\s*([\d,]+(?:\.\d+)?)\s*(?:needs?|requires?)\s*(?:approval|me)/i,
    );
  if (approval) {
    const v = money(approval[1]);
    if (v != null) {
      patch.requireApprovalOverSgd = v;
      summary.push(`Approval over S$${v}`);
    }
  }

  if (/only\s+helix|helix-materials\.sg|whitelist\s+helix/.test(t)) {
    patch.merchants = ["helix-materials.sg"];
    summary.push("Merchant: helix-materials.sg only");
  }
  const merchant = t.match(
    /(?:only|merchant|allow)\s+([a-z0-9.-]+\.(?:sg|com|io))/i,
  );
  if (merchant && !patch.merchants) {
    patch.merchants = [merchant[1].toLowerCase()];
    summary.push(`Merchant: ${merchant[1].toLowerCase()}`);
  }

  if (/alu-6061-t6|aluminium|aluminum\s*6061/.test(t)) {
    patch.skuAllowlist = ["ALU-6061-T6"];
    summary.push("SKU: ALU-6061-T6");
  }

  if (/auto-?revoke|revoke after|burn the card/.test(t)) {
    patch.autoRevokeAfterPurchase = true;
    summary.push("Auto-revoke after purchase");
  }

  if (summary.length === 0) {
    warnings.push(
      "Could not parse specific limits — try amounts like “max $50 per purchase, $200 a day”.",
    );
  }

  return {
    patch,
    summary: summary.join(" · ") || "No structured changes detected",
    warnings,
  };
}

export async function parsePolicyNlSmart(text: string): Promise<{
  patch: PolicyNlPatch;
  summary: string;
  warnings: string[];
  source: "openai" | "regex";
}> {
  const fallback = parsePolicyNl(text);
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return { ...fallback, source: "regex" };
  }

  try {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: key });
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const res = await client.chat.completions.create({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a procurement CFO policy parser. Extract agent spending controls from natural language.
Return JSON only with optional fields:
maxPerTxSgd, maxPerDaySgd, maxPerWeekSgd, maxTxPerHour, requireApprovalOverSgd (numbers),
merchants (string[]), skuAllowlist (string[]), status ("active"|"frozen"),
autoRevokeAfterPurchase (boolean), summary (short plain English of changes).
Only include fields the user clearly asked to change. Amounts are SGD.`,
        },
        { role: "user", content: text },
      ],
    });
    const raw = res.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as PolicyNlPatch & { summary?: string };
    const {
      summary: aiSummary,
      ...rest
    } = parsed as PolicyNlPatch & { summary?: string };
    const patch: PolicyNlPatch = { ...rest, notes: text.trim() };
    return {
      patch,
      summary:
        typeof aiSummary === "string" && aiSummary
          ? aiSummary
          : fallback.summary,
      warnings: fallback.warnings.length && Object.keys(rest).length === 0
        ? fallback.warnings
        : [],
      source: "openai",
    };
  } catch {
    return { ...fallback, source: "regex", warnings: [...fallback.warnings, "LLM parse failed — used rules"] };
  }
}
