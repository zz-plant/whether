import { withDeadline } from "../withDeadline";

type Unavailable = { status: "unavailable"; reason: string };

/**
 * A telemetry read for a page that must not go down with the telemetry API: bounded by a
 * deadline, never throws, and a good answer is remembered for `ttlMs` while a failed one is not
 * remembered at all, so the next request tries again.
 *
 * `runHistory.ts` (the cron-step rows on /trust) and `activationFunnelReport.ts` each wrote this
 * out in full; the read, its configuration check and its shape stay with them.
 */
export const cachedLoader = <T extends { status: string }>({
  label,
  ttlMs,
  failureReason,
}: {
  /** Names the deadline in its error. */
  label: string;
  ttlMs: number;
  /** The reason given for a throw that carries no message. */
  failureReason: string;
}) => {
  let cached: { at: number; value: Promise<T | Unavailable> } | null = null;

  return {
    reset: () => {
      cached = null;
    },

    load: async (now: Date, timeoutMs: number, read: () => Promise<T>): Promise<T | Unavailable> => {
      if (cached && now.getTime() - cached.at < ttlMs) return cached.value;

      const value = withDeadline(read(), timeoutMs, label).catch((error: unknown): Unavailable => ({
        status: "unavailable",
        reason: error instanceof Error ? error.message : failureReason,
      }));

      cached = { at: now.getTime(), value };
      const resolved = await value;
      if (resolved.status !== "ok") cached = null;
      return resolved;
    },
  };
};
