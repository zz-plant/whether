"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STATE_KEY = "whether_state";
const SYNC_ID_KEY = "whether_sync_id";
const SYNC_SECRET_KEY = "whether_sync_secret";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

type StateBlob = Record<string, { value: unknown; ts: number }>;

function getSyncId(): string {
  if (typeof window === "undefined") return "";
  const existing = localStorage.getItem(SYNC_ID_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(SYNC_ID_KEY, id);
  document.cookie = `${SYNC_ID_KEY}=${id}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  return id;
}

function getSyncSecret(): string {
  if (typeof window === "undefined") return "";
  const existing = localStorage.getItem(SYNC_SECRET_KEY);
  if (existing) return existing;
  const secret = crypto.randomUUID() + crypto.randomUUID();
  localStorage.setItem(SYNC_SECRET_KEY, secret);
  return secret;
}

function loadStateBlob(): StateBlob {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStateBlob(blob: StateBlob) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(blob));
  } catch {}
}

export function useCrossDeviceSync(storageKey: string, _initialValue: unknown) {
  const [synced, setSynced] = useState(false);
  const dirty = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const syncId = getSyncId();
  const syncSecret = getSyncSecret();

  const pullFromServer = useCallback(async () => {
    try {
      const res = await fetch(`/api/sync?id=${encodeURIComponent(syncId)}`, {
        headers: { "x-whether-sync-secret": syncSecret },
      });
      if (!res.ok) return;
      const json = await res.json();
      if (!json.ok || !json.state) return;
      const serverState = json.state as StateBlob;

      const localBlob = loadStateBlob();
      let changed = false;
      let serverValue: unknown = undefined;

      for (const [key, entry] of Object.entries(serverState)) {
        const localEntry = localBlob[key];
        if (!localEntry || entry.ts > localEntry.ts) {
          localBlob[key] = entry;
          changed = true;
          if (key === storageKey) serverValue = entry.value;
        }
      }

      if (changed) {
        saveStateBlob(localBlob);
        return serverValue;
      }
    } catch {}
    return undefined;
  }, [syncId, syncSecret, storageKey]);

  const pushToServer = useCallback(async (blob: StateBlob) => {
    try {
      await Promise.all(
        Object.entries(blob).map(([key, entry]) =>
          fetch("/api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-whether-sync-secret": syncSecret },
            body: JSON.stringify({ id: syncId, key, value: entry.value, ts: entry.ts }),
          })
        )
      );
    } catch {}
  }, [syncId, syncSecret]);

  const flushDirty = useCallback(() => {
    const blob = loadStateBlob();
    const dirtyKeys = dirty.current;
    let hasNew = false;

    dirtyKeys.forEach((key) => {
      const localRaw = localStorage.getItem(key);
      if (!localRaw) return;
      try {
        const parsed = JSON.parse(localRaw);
        blob[key] = { value: parsed, ts: Date.now() };
        hasNew = true;
      } catch {}
    });

    if (hasNew) {
      saveStateBlob(blob);
      pushToServer(blob);
    }
    dirtyKeys.clear();
  }, [pushToServer]);

  const markDirty = useCallback((key: string) => {
    dirty.current.add(key);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flushDirty, 3000);
  }, [flushDirty]);

  useEffect(() => {
    pullFromServer().then(() => {
      setSynced(true);
    });
  }, [pullFromServer]);

  return { synced, markDirty, syncId };
}
