"use client";

import { useState, useEffect, useCallback } from "react";

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

/**
 * useState backed by localStorage. Survives page reloads.
 *
 * @param key localStorage key
 * @param fallback default value (also determines type: string | number | boolean | object)
 */
export function useLocalStorageState<T extends string | number | boolean | object>(
  key: string,
  fallback: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [state, setState] = useState<T>(fallback);

  useEffect(() => {
    const stored = read<T>(key, fallback);
    if (JSON.stringify(stored) !== JSON.stringify(state)) {
      setState(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
        write(key, next);
        return next;
      });
    },
    [key],
  );

  const clear = useCallback(() => {
    remove(key);
    setState(fallback);
  }, [key, fallback]);

  return [state, set, clear];
}
