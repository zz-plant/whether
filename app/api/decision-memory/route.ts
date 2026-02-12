import { NextResponse } from "next/server";
import { pruneDecisionMemoryEntries, serverStore } from "../../../lib/serverStore";
import type { DecisionMemoryEntry } from "../../operations/components/decisionMemoryUtils";

export const runtime = "nodejs";

const RETENTION_DAYS = 180;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId") ?? "anonymous";
  const current = serverStore.snapshot.decisionMemoryByClient[clientId] ?? [];
  const pruned = pruneDecisionMemoryEntries(current, RETENTION_DAYS);

  if (pruned.length !== current.length) {
    serverStore.save({
      ...serverStore.snapshot,
      decisionMemoryByClient: {
        ...serverStore.snapshot.decisionMemoryByClient,
        [clientId]: pruned,
      },
    });
  }

  return NextResponse.json({ entries: pruned, retentionDays: RETENTION_DAYS });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { clientId?: string; entry?: DecisionMemoryEntry };
  const clientId = body.clientId ?? "anonymous";
  const entry = body.entry;

  if (!entry?.id) {
    return NextResponse.json({ error: "Missing entry payload." }, { status: 400 });
  }

  const current = pruneDecisionMemoryEntries(
    serverStore.snapshot.decisionMemoryByClient[clientId] ?? [],
    RETENTION_DAYS
  );

  const existing = current.find((item) => item.id === entry.id);
  if (existing && JSON.stringify(existing) !== JSON.stringify(entry)) {
    return NextResponse.json(
      { error: "Decision ID already exists with immutable content." },
      { status: 409 }
    );
  }

  const nextEntries = existing ? current : [entry, ...current].slice(0, 500);

  serverStore.save({
    ...serverStore.snapshot,
    decisionMemoryByClient: {
      ...serverStore.snapshot.decisionMemoryByClient,
      [clientId]: nextEntries,
    },
  });

  return NextResponse.json({
    saved: !existing,
    entries: nextEntries,
    retentionDays: RETENTION_DAYS,
  });
}
