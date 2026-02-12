import { NextResponse } from "next/server";
import { serverStore } from "../../../lib/serverStore";
import type { DecisionMemoryEntry } from "../../operations/components/decisionMemoryUtils";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId") ?? "anonymous";
  return NextResponse.json({ entries: serverStore.decisionMemoryByClient[clientId] ?? [] });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { clientId?: string; entry?: DecisionMemoryEntry };
  const clientId = body.clientId ?? "anonymous";
  const entry = body.entry;

  if (!entry?.id) {
    return NextResponse.json({ error: "Missing entry payload." }, { status: 400 });
  }

  const current = serverStore.decisionMemoryByClient[clientId] ?? [];
  const exists = current.some((item) => item.id === entry.id);

  if (!exists) {
    serverStore.decisionMemoryByClient[clientId] = [entry, ...current].slice(0, 200);
  }

  return NextResponse.json({
    saved: !exists,
    entries: serverStore.decisionMemoryByClient[clientId] ?? current,
  });
}
