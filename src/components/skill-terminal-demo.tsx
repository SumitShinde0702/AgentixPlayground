"use client";

import Link from "next/link";
import { Terminal } from "@/components/ui/terminal";

const COMMANDS = [
  "mkdir -p .cursor/skills/gatex",
  "curl -o .cursor/skills/gatex/SKILL.md \\",
  "  $GATEX_BASE_URL/skills/gatex/SKILL.md",
  "curl -s -X POST $GATEX_BASE_URL/api/gateway/check \\",
  "  -H 'Content-Type: application/json' \\",
  "  -d '{\"sku\":\"ALU-6061-T6\",\"merchant\":\"helix-materials.sg\",\"amountSgd\":10}'",
  "curl -s -X POST $GATEX_BASE_URL/api/gateway/pay \\",
  "  -H 'Content-Type: application/json' \\",
  "  -d '{\"sku\":\"ALU-6061-T6\",\"merchant\":\"helix-materials.sg\",\"amountSgd\":10}'",
];

/** Flatten related lines into fewer typed commands for cleaner demo. */
const DEMO_COMMANDS = [
  "mkdir -p .cursor/skills/gatex",
  "curl -o .cursor/skills/gatex/SKILL.md $HOST/skills/gatex/SKILL.md",
  `curl -s -X POST $HOST/api/gateway/check -H 'Content-Type: application/json' -d '{"sku":"ALU-6061-T6","merchant":"helix-materials.sg","amountSgd":10}'`,
  `curl -s -X POST $HOST/api/gateway/pay -H 'Content-Type: application/json' -d '{"sku":"ALU-6061-T6","merchant":"helix-materials.sg","amountSgd":10}'`,
];

const DEMO_OUTPUTS: Record<number, string[]> = {
  0: [],
  1: ["Saved SKILL.md — agent will route spend through GateX."],
  2: ['{"ok":true,"code":"PASS"}'],
  3: [
    '{"ok":true,"code":"PAID","card":{"last4":"3710","source":"mcp"},"receiptId":"rcpt_…"}',
  ],
};

void COMMANDS;

export function SkillTerminalDemo() {
  return (
    <div className="w-full">
      <Terminal
        username="gatex"
        commands={DEMO_COMMANDS}
        outputs={DEMO_OUTPUTS}
        typingSpeed={22}
        delayBetweenCommands={600}
        initialDelay={350}
        enableSound={false}
        className="w-full"
      />
      <div className="mt-6 flex flex-wrap gap-4">
        <a
          href="/skills/gatex/SKILL.md"
          download="SKILL.md"
          className="inline-flex items-center border border-white/20 bg-[var(--paper)] px-5 py-3 text-[12px] uppercase tracking-[0.14em] text-[var(--ink)] transition hover:bg-white"
        >
          Download skill
        </a>
        <Link
          href="/skill"
          className="inline-flex items-center border border-white/20 px-5 py-3 text-[12px] uppercase tracking-[0.14em] text-[var(--paper)]/80 transition hover:border-white/50 hover:text-[var(--paper)]"
        >
          Gateway docs
        </Link>
      </div>
    </div>
  );
}
