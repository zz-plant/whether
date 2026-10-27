"use client";

import { createBrowserSource, useBrowserSource } from "./browserSource";
import { STORAGE_KEYS } from "../../lib/storage/keys";

const PERSISTENT_CLIENT_ID_STORAGE_KEY = STORAGE_KEYS.clientId;

export const createOpaqueId = () => {
  const cryptoRef = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;

  if (cryptoRef?.randomUUID) {
    return cryptoRef.randomUUID();
  }

  if (cryptoRef?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoRef.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join(""),
    ].join("-");
  }

  return `fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getOrCreatePersistentClientId = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = window.localStorage.getItem(PERSISTENT_CLIENT_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const created = createOpaqueId();
  window.localStorage.setItem(PERSISTENT_CLIENT_ID_STORAGE_KEY, created);
  /* A browser that holds this id owns records keyed by it — the decision ledger
     and the push subscription. Ask for persistent storage so an eviction under
     storage pressure cannot silently drop them (2026-10-22). Best-effort: the
     answer is the browser's to give, and nothing here waits on it. */
  try {
    void navigator.storage?.persist?.();
  } catch {
    // Storage probing is best-effort.
  }
  return created;
};

/* One id per browser, so one source per tab rather than one per component: the
   first consumer to render creates the id and every later one reads the same
   string back, which is also what makes the snapshot reference-stable. */
const clientIdSource = createBrowserSource<string | null>({
  read: getOrCreatePersistentClientId,
  serverValue: null,
});

/** Null until hydration finishes, which is also what a browser with storage blocked reports. */
export const usePersistentClientId = () => useBrowserSource(clientIdSource);
