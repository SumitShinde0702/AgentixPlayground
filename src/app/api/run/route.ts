import { NextRequest } from "next/server";
import { runLane, type RunLane } from "@/lib/run";
import { sleep } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { lane?: RunLane };
  const lane: RunLane = body.lane === "rogue" ? "rogue" : "corporate";
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        for await (const ev of runLane(lane)) {
          send(ev);
          await sleep(220);
        }
        send({ done: true, lane });
      } catch (err) {
        send({
          t: 0,
          lane,
          phase: 1,
          status: "BLOCK",
          line: err instanceof Error ? err.message : "Run failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
