"use client";

import { createBrowserSource, useBrowserSource } from "./browserSource";

const PERSISTENT_CLIENT_ID_STORAGE_KEY = "whether-client-id";

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
