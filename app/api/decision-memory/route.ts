import { NextResponse } from "next/server";
import { buildDecisionMemoryEntry, toDecisionMemoryCsv, type DecisionMemoryPayload } from "../../../lib/decisionMemory";
import { serverStore } from "../../../lib/serverStore";

export const runtime = "edge";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  const entries = serverStore.snapshot.decisionMemory;

  if (format === "csv") {
    return new Response(toDecisionMemoryCsv(entries), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="decision-memory.csv"',
      },
    });
  }

  return NextResponse.json({ entries, count: entries.length });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as DecisionMemoryPayload;

  if (!payload.recordDate || !payload.decision || !payload.outcome || !payload.assessment) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const entry = buildDecisionMemoryEntry(payload);

  serverStore.save({
    ...serverStore.snapshot,
    decisionMemory: [entry, ...serverStore.snapshot.decisionMemory].slice(0, 500),
  });

  return NextResponse.json({ created: true, entry, count: serverStore.snapshot.decisionMemory.length });
}
