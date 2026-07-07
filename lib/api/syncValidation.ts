const MAX_SYNC_STATE_BYTES = 24_000;
const MAX_SYNC_KEY_LENGTH = 96;
const MAX_CLOCK_SKEW_MS = 7 * 24 * 60 * 60 * 1000;

const ALLOWED_EXACT_KEYS = new Set([
  "whether-company-metrics",
  "whether-decision-log",
]);

const ALLOWED_PREFIXES = [
  "whether-",
];

export const isAllowedSyncKey = (key: string) =>
  key.length > 0
  && key.length <= MAX_SYNC_KEY_LENGTH
  && !key.includes("..")
  && !key.includes(":")
  && (ALLOWED_EXACT_KEYS.has(key) || ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix)));

export const validateSyncTimestamp = (ts: unknown, now = Date.now()) => {
  if (typeof ts !== "number" || !Number.isFinite(ts) || ts <= 0) return false;
  return Math.abs(ts - now) <= MAX_CLOCK_SKEW_MS;
};

export const validateSyncStateSize = (state: unknown) =>
  new TextEncoder().encode(JSON.stringify(state)).length <= MAX_SYNC_STATE_BYTES;
