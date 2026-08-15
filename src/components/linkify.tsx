import type { ReactNode } from "react";

const URL_RE = /(https?:\/\/[^\s]+)/g;
const TX_RE = /\b(0x[a-fA-F0-9]{64})\b/g;

function linkClass(tone?: "pass" | "block" | "mute") {
  if (tone === "block") return "underline underline-offset-2 text-[var(--block)]";
  if (tone === "pass") return "underline underline-offset-2 text-[var(--pass)]";
  return "underline underline-offset-2 text-[var(--pass)]";
}

/** Turn http(s) URLs (and bare 0x tx hashes when snowtraceBase given) into anchors. */
export function linkify(
  text: string,
  opts?: { snowtraceBase?: string; tone?: "pass" | "block" | "mute" },
): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  const re = new RegExp(URL_RE.source, "g");
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(
        linkifyTxes(text.slice(last, match.index), opts, key),
      );
      key += 10;
    }
    const href = match[1].replace(/[.,;:!?)]+$/, "");
    const trailing = match[1].slice(href.length);
    parts.push(
      <a
        key={`u-${key++}`}
        href={href}
        target="_blank"
        rel="noreferrer"
        className={linkClass(opts?.tone)}
      >
        {href}
      </a>,
    );
    if (trailing) parts.push(trailing);
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push(linkifyTxes(text.slice(last), opts, key));
  }
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function linkifyTxes(
  text: string,
  opts: { snowtraceBase?: string; tone?: "pass" | "block" | "mute" } | undefined,
  keyBase: number,
): ReactNode {
  if (!opts?.snowtraceBase) return text;
  const parts: ReactNode[] = [];
  let last = 0;
  const re = new RegExp(TX_RE.source, "g");
  let match: RegExpExecArray | null;
  let key = keyBase;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const tx = match[1];
    parts.push(
      <a
        key={`t-${key++}`}
        href={`${opts.snowtraceBase}/tx/${tx}`}
        target="_blank"
        rel="noreferrer"
        className={linkClass(opts.tone)}
      >
        {tx.slice(0, 18)}…
      </a>,
    );
    last = match.index + match[0].length;
  }
  if (last === 0) return text;
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

export function snowtraceBaseForNetwork(network?: string | null) {
  if (network === "eip155:43113") return "https://testnet.snowtrace.io";
  return "https://snowtrace.io";
}
