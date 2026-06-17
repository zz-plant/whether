"use client";

import { useSyncExternalStore, useCallback } from "react";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    if (typeof fallback === "string") return raw as T;
    if (typeof fallback === "number") return (Number(raw) || fallback) as T;
    if (typeof fallback === "boolean") return (raw === "true") as T;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
  } catch {
    // storage full or private mode — silently ignore
  }
}

function remove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function dispatch(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new StorageEvent("storage", { key }));
  } catch {
    // ignore
  }
}

/**
 * useState backed by localStorage. Survives page reloads.
 * Uses useSyncExternalStore to avoid hydration flash — the first painted
 * state matches localStorage, not the server fallback.
 *
 * @param key localStorage key
 * @param fallback default value (also determines type: string | number | boolean | object)
 */
export function useLocalStorageState<T extends string | number | boolean | object>(
  key: string,
  fallback: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handler = (e: StorageEvent) => {
        if (e.key === key) onStoreChange();
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
    [key],
  );

  const getSnapshot = useCallback((): T => read(key, fallback), [key, fallback]);

  const getServerSnapshot = useCallback((): T => fallback, [fallback]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const set = useCallback(
    (value: T | ((prev: T) => T)) => {
      const isUpdater = (v: unknown): v is (prev: T) => T => typeof v === "function";
      const next = isUpdater(value)
        ? value(read(key, fallback))
        : value;
      write(key, next);
      dispatch(key);
    },
    [key, fallback],
  );

  const clear = useCallback(() => {
    remove(key);
    dispatch(key);
  }, [key]);

  return [state, set, clear];
}
