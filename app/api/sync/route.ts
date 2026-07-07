import { NextResponse } from "next/server";
import { isAllowedSyncKey, validateSyncStateSize, validateSyncTimestamp } from "../../../lib/api/syncValidation";

export const runtime = "edge";

type KvLike = { get(k: string): Promise<string | null>; put(k: string, v: string): Promise<void> };

function getKv(): KvLike | null {
  return (globalThis as { WHETHER_DURABLE_KV?: KvLike }).WHETHER_DURABLE_KV ?? null;
}

type SyncState = Record<string, { value: unknown; ts: number; secretHash?: string }>;

const SYNC_PREFIX = "sync:";

async function digestSecret(secret: string): Promise<string> {
  const data = new TextEncoder().encode(secret);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function authorizeSync(state: SyncState, secret: string | null): Promise<boolean> {
  if (!secret || secret.length < 16) return false;
  const expected = Object.values(state).find((entry) => entry.secretHash)?.secretHash;
  if (!expected) return true;
  return expected === await digestSecret(secret);
}

function readSyncSecret(request: Request) {
  return request.headers.get("x-whether-sync-secret");
}

const stripSecretHashes = (state: SyncState): Record<string, { value: unknown; ts: number }> =>
  Object.fromEntries(Object.entries(state).map(([key, entry]) => [key, { value: entry.value, ts: entry.ts }]));

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
  if (!kv) {
    return NextResponse.json({ ok: true, state: {}, degraded: true, reason: "KV unavailable — using local storage only" });
  }

  const url = new URL(request.url);
  const syncId = url.searchParams.get("id");
  if (!syncId) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const state = await loadState(kv, syncId);
  if (!await authorizeSync(state, readSyncSecret(request))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, state: stripSecretHashes(state) });
}

export async function POST(request: Request) {
  const kv = getKv();
  if (!kv) {
    return NextResponse.json({ ok: true, degraded: true, reason: "KV unavailable — sync skipped" });
  }

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
  if (!isAllowedSyncKey(key)) {
    return NextResponse.json({ ok: false, error: "invalid_key" }, { status: 400 });
  }
  if (!validateSyncTimestamp(ts)) {
    return NextResponse.json({ ok: false, error: "invalid_timestamp" }, { status: 400 });
  }

  const state = await loadState(kv, syncId);
  const secret = readSyncSecret(request);
  if (!await authorizeSync(state, secret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const existing = state[key];
  if (existing && existing.ts >= ts) {
    return NextResponse.json({ ok: true, kept: "server-newer" });
  }

  state[key] = { value, ts, secretHash: await digestSecret(secret ?? "") };
  if (!validateSyncStateSize(state)) {
    return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413 });
  }
  await saveState(kv, syncId, state);
  return NextResponse.json({ ok: true });
}
