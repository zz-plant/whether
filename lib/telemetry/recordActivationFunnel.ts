/**
 * Cron write path for the week's activation funnel.
 *
 * `lib/telemetry/activationFunnelReport.ts` can read the funnel; this puts the answer
 * somewhere it survives the read, so the number is available without every reader
 * spending a round trip on the Analytics Engine SQL API, and so a single weekly run fixes
 * the figure rather than each surface computing its own slightly different one.
 *
 * It follows `lib/summary/refreshMonthlyRegimeHistory.ts`: write the current state, let the
 * next run converge it, and treat "cannot see" as a state to report rather than a value to
 * invent. The three outcomes stay distinct — a written report, a run that could not read,
 * and a run with nothing to write — because "0 readers came back" and "we have no read
 * credentials" are opposite facts and storing either as the other is how a dashboard starts
 * lying.
 *
 * The stored record is aggregate counts with no identity, which is the same property the
 * browser-side events have. It is not a growth report and should not be turned into one.
 */
import { getWhetherKv } from "../runtime/kv";
import {
  loadActivationFunnelReport,
  type ActivationFunnelReport,
  type FunnelWeek,
} from "./activationFunnelReport";

export const ACTIVATION_FUNNEL_KV_KEY = "summary:activation-funnel";

/** Enough to tell a fresh record from a stale one, and to render the last few weeks. */
const MAX_STORED_WEEKS = 12;

type StoredWeek = FunnelWeek & { generatedAt: string };

type StoredActivationFunnel = {
  generatedAt: string;
  weeks: StoredWeek[];
};

const isFunnelWeek = (value: unknown): value is FunnelWeek => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<FunnelWeek>;
  return (
    typeof candidate.week === "string" &&
    !!candidate.counts &&
    typeof candidate.counts.visited === "number" &&
    typeof candidate.counts.oriented === "number" &&
    typeof candidate.counts.committed === "number" &&
    typeof candidate.counts.returned === "number" &&
    !!candidate.commitments &&
    typeof candidate.commitments === "object"
  );
};

/** Validated on the way out of KV, so a hand-edited or truncated value cannot render as a week. */
export const parseStoredActivationFunnel = (raw: string | null): StoredActivationFunnel | null => {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Partial<StoredActivationFunnel>;
    if (typeof candidate.generatedAt !== "string" || !Array.isArray(candidate.weeks)) return null;
    const weeks = candidate.weeks.filter(isFunnelWeek);
    if (weeks.length === 0) return null;
    return { generatedAt: candidate.generatedAt, weeks: weeks as StoredWeek[] };
  } catch {
    return null;
  }
};

export const readStoredActivationFunnel = async (): Promise<StoredActivationFunnel | null> => {
  const kv = getWhetherKv();
  if (!kv) return null;
  try {
    return parseStoredActivationFunnel(await kv.get(ACTIVATION_FUNNEL_KV_KEY));
  } catch {
    return null;
  }
};

/** One week per slug: a re-run inside the same ISO week replaces that week rather than adding one. */
const mergeWeeks = (stored: StoredWeek[], incoming: FunnelWeek[], generatedAt: string): StoredWeek[] => {
  const byWeek = new Map<string, StoredWeek>();
  for (const week of stored) byWeek.set(week.week, week);
  for (const week of incoming) byWeek.set(week.week, { ...week, generatedAt });

  return [...byWeek.values()]
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-MAX_STORED_WEEKS);
};

type RecordActivationFunnelResult = {
  ok: boolean;
  wrote: boolean;
  error?: string;
  /** Present when a read succeeded, so a caller can log the headline without re-reading. */
  report?: ActivationFunnelReport;
};

export const recordActivationFunnel = async (
  deps: { read?: () => Promise<ActivationFunnelReport> } = {},
): Promise<RecordActivationFunnelResult> => {
  const read = deps.read ?? loadActivationFunnelReport;
  const kv = getWhetherKv();
  if (!kv) return { ok: false, wrote: false, error: "no KV binding" };

  let report: ActivationFunnelReport;
  try {
    report = await read();
  } catch (error) {
    return { ok: false, wrote: false, error: error instanceof Error ? error.message : String(error) };
  }

  /*
   * Nothing is written for a read that did not happen. Overwriting last week's counts with
   * an absence would be the one failure this whole module exists to prevent: the next
   * reader would see zeros and conclude the ritual stopped.
   */
  if (report.status !== "ok") {
    return { ok: false, wrote: false, error: report.status === "unconfigured" ? "no Analytics Engine read credentials" : report.reason, report };
  }

  try {
    const stored = (await readStoredActivationFunnel()) ?? { generatedAt: report.generatedAt, weeks: [] };
    const weeks = mergeWeeks(stored.weeks, report.weeks, report.generatedAt);

    await kv.put(ACTIVATION_FUNNEL_KV_KEY, JSON.stringify({ generatedAt: report.generatedAt, weeks } satisfies StoredActivationFunnel));
    return { ok: true, wrote: true, report };
  } catch (error) {
    return { ok: false, wrote: false, error: error instanceof Error ? error.message : String(error), report };
  }
};
