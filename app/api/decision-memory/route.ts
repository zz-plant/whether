import { NextResponse } from "next/server";
import {
  buildDecisionMemoryEntry,
  type DecisionMemoryPayload,
  toDecisionMemoryCsv,
} from "../../../lib/decisionMemory";
import { getDecisionMemoryRepository } from "../../../lib/storage/decisionMemoryRepository";

export const runtime = "edge";

const asDecisionPayload = (value: unknown): DecisionMemoryPayload | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Partial<DecisionMemoryPayload>;
  if (
    typeof payload.recordDate !== "string"
    || !payload.decision
    || !payload.outcome
    || !payload.assessment
  ) {
    return null;
  }

  return payload as DecisionMemoryPayload;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  const clientId = url.searchParams.get("clientId") ?? undefined;
  const repository = getDecisionMemoryRepository();
  const listed = await repository.list({ limit: 64, clientId });
  const degraded = repository.backendStatus() === "local-fallback";

  if (format === "csv") {
    const csv = toDecisionMemoryCsv(listed.entries);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=decision-memory.csv",
        "x-whether-storage": repository.backendStatus(),
      },
    });
  }

  return NextResponse.json({
    entries: listed.entries,
    count: listed.entries.length,
    degraded,
    backend: repository.backendStatus(),
  });
}

export async function POST(request: Request) {
  const repository = getDecisionMemoryRepository();
  const degraded = repository.backendStatus() === "local-fallback";

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ entries: [], count: 0, error: "invalid-json", degraded, backend: repository.backendStatus() }, { status: 400 });
  }

  const parsed = asDecisionPayload(payload);
  if (!parsed) {
    return NextResponse.json({ entries: [], count: 0, error: "invalid-payload", degraded, backend: repository.backendStatus() }, { status: 400 });
  }

  const entry = buildDecisionMemoryEntry(parsed);
  await repository.append(entry);
  const listed = await repository.list({ limit: 64, clientId: entry.context.clientId });

  return NextResponse.json({
    created: true,
    entry,
    entries: listed.entries,
    count: listed.entries.length,
    degraded,
    backend: repository.backendStatus(),
  });
}
