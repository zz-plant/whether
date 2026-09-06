"use client";

import { parseDecisionMemoryEntry, type DecisionMemoryEntry } from "../../lib/decisionMemory";
import { STORAGE_KEYS } from "../../lib/storage/keys";

export const DECISION_MEMORY_UPDATED_EVENT = "whether-decision-memory-updated";
const LOCAL_CACHE_LIMIT = 64;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * What a POST to /api/decision-memory answered, validated rather than cast.
 * `entry` is null when the body carried no entry this client can read;
 * `degraded` means the server wrote to its in-memory fallback, so the browser
 * cache is the copy that outlives the request.
 */
export const readDecisionMemorySaveResponse = (
  payload: unknown,
): { entry: DecisionMemoryEntry | null; degraded: boolean } => {
  if (!isRecord(payload)) return { entry: null, degraded: false };
  return {
    entry: parseDecisionMemoryEntry(payload.entry),
    degraded: payload.degraded === true,
  };
};

const readCachedEntries = (raw: string | null): DecisionMemoryEntry[] => {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((candidate) => parseDecisionMemoryEntry(candidate))
    .filter((entry): entry is DecisionMemoryEntry => entry !== null);
};

/**
 * Mirrors an entry the server actually created into the browser cache the
 * memory panel and the staleness panel read, and tells them it changed.
 *
 * Three surfaces used to carry their own copy of this block, and the fourth
 * (the plan stress test on the brief) carried none — it reported a save that
 * had never been stored anywhere. One helper, called only with the server's
 * entry, so the cache never holds an id the server does not.
 */
export const rememberDecisionMemoryEntry = (clientId: string, entry: DecisionMemoryEntry) => {
  try {
    const key = STORAGE_KEYS.decisionMemory(clientId);
    const existing = readCachedEntries(window.localStorage.getItem(key));
    const deduped = existing.filter((candidate) => candidate.id !== entry.id);
    window.localStorage.setItem(key, JSON.stringify([entry, ...deduped].slice(0, LOCAL_CACHE_LIMIT)));
  } catch {
    // A full or unavailable localStorage must not fail the save — the server has the entry.
  }
  window.dispatchEvent(new CustomEvent(DECISION_MEMORY_UPDATED_EVENT));
};
