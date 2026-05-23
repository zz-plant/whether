"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SYNC_ID_KEY = "whether_sync_id";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

function getSyncId(): string {
  const existing = localStorage.getItem(SYNC_ID_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(SYNC_ID_KEY, id);
  document.cookie = `${SYNC_ID_KEY}=${id}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  return id;
}

type SyncState = Record<string, { value: unknown; ts: number }>;

type SyncedKeys = Record<string, unknown>;

export function useCrossDeviceSync(storageKey: string, initialValue: unknown) {
  const [synced, setSynced] = useState(false);
  const dirty = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const syncId = getSyncId();

  const pullFromServer = useCallback(async () => {
    try {
      const res = await fetch(`/api/sync?id=${encodeURIComponent(syncId)}`);
      if (!res.ok) return;
      const json = await res.json();
      if (!json.ok || !json.state) return;
      const serverState = json.state as SyncState;
      const serverEntry = serverState[storageKey];
      if (!serverEntry) return;

      const localRaw = localStorage.getItem(storageKey);
      const localParsed = localRaw ? JSON.parse(localRaw) : null;
      const localTs = typeof localParsed === "object" && localParsed !== null && "_sync_ts" in (localParsed as Record<string, unknown>)
        ? (localParsed as Record<string, unknown>)._sync_ts as number
        : 0;

      if (serverEntry.ts > localTs) {
        localStorage.setItem(storageKey, JSON.stringify(serverEntry.value));
        return serverEntry.value;
      }
    } catch {}
    return undefined;
  }, [syncId, storageKey]);

  const pushToServer = useCallback(async (key: string, value: unknown, ts: number) => {
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: syncId, key, value, ts }),
      });
    } catch {}
  }, [syncId]);

  const flushDirty = useCallback(() => {
    dirty.current.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        const ts = Date.now();
        const wrapped = { ...(typeof parsed === "object" && parsed !== null ? parsed : { _v: parsed }), _sync_ts: ts };
        localStorage.setItem(key, JSON.stringify(wrapped));
        pushToServer(key, parsed, ts);
      } catch {}
    });
    dirty.current.clear();
  }, [pushToServer]);

  const markDirty = useCallback((key: string) => {
    dirty.current.add(key);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flushDirty, 3000);
  }, [flushDirty]);

  useEffect(() => {
    pullFromServer().then((serverValue) => {
      if (serverValue !== undefined) {
        setSynced(true);
        return;
      }
      setSynced(true);
    });
  }, [pullFromServer]);

  return { synced, markDirty, syncId };
}
