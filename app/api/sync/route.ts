import { NextResponse } from "next/server";

export const runtime = "edge";

type KvLike = { get(k: string): Promise<string | null>; put(k: string, v: string): Promise<void> };

function getKv(): KvLike | null {
  return (globalThis as { WHETHER_DURABLE_KV?: KvLike }).WHETHER_DURABLE_KV ?? null;
}

type SyncState = Record<string, { value: unknown; ts: number }>;

const SYNC_PREFIX = "sync:";

async function loadState(kv: KvLike, syncId: string): Promise<SyncState> {
  const raw = await kv.get(SYNC_PREFIX + syncId);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

async function saveState(kv: KvLike, syncId: string, state: SyncState): Promise<void> {
  await kv.put(SYNC_PREFIX + syncId, JSON.stringify(state));
}

export async function GET(request: Request) {
  const kv = getKv();
  if (!kv) return NextResponse.json({ ok: false, error: "KV not available" }, { status: 503 });

  const url = new URL(request.url);
  const syncId = url.searchParams.get("id");
  if (!syncId) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const state = await loadState(kv, syncId);
  return NextResponse.json({ ok: true, state });
}

export async function POST(request: Request) {
  const kv = getKv();
  if (!kv) return NextResponse.json({ ok: false, error: "KV not available" }, { status: 503 });

  let body: { id?: string; key?: string; value?: unknown; ts?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { id: syncId, key, value, ts } = body;
  if (!syncId || !key || ts == null) {
    return NextResponse.json({ ok: false, error: "Missing id, key, or ts" }, { status: 400 });
  }

  const state = await loadState(kv, syncId);
  const existing = state[key];
  if (existing && existing.ts >= ts) {
    return NextResponse.json({ ok: true, kept: "server-newer" });
  }

  state[key] = { value, ts };
  await saveState(kv, syncId, state);
  return NextResponse.json({ ok: true });
}
