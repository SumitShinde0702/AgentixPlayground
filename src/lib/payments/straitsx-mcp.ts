import { straitsxCardMcpUrl } from "@/lib/config";

/** MCP SSE endpoints from the AgentiX card server. Tools are discovered at runtime. */
export function cardMcpEndpoint() {
  return straitsxCardMcpUrl();
}

export async function listCardMcpTools() {
  const url = cardMcpEndpoint();
  try {
    const res = await fetch(url, {
      headers: { Accept: "text/event-stream" },
      signal: AbortSignal.timeout(800),
    });
    return { url, reachable: res.ok || res.status === 200, status: res.status };
  } catch {
    return { url, reachable: false, status: 0 };
  }
}
