/**
 * Reads the activation funnel back out of Analytics Engine.
 *
 * The funnel itself is declared in `lib/activationFunnel.ts`: every surface dispatches
 * `visited`, `oriented`, `committed` and `returned`, and `/trust` renders the pipeline's
 * own `cron-step` telemetry beside it. Until this module nothing read the activation
 * stream, which left `ROADMAP.md`'s first open item — "fix the funnel leak before adding
 * surface" — unanswerable: the events were written, and the one question they exist to
 * answer could only be asked by running a script by hand with credentials.
 *
 * ## These are events, not people
 *
 * `lib/activationFunnel.ts` carries no identity on purpose: return detection reads one
 * localStorage key holding an ISO week slug, and the product advertises no trackers. That
 * decision is correct and this module does not work around it. It counts *events* per step
 * per ISO week.
 *
 * So there is no conversion rate here, and there should not be one added later. One browser
 * that copies the brief twice on Monday is two `committed` events, and 100 browsers that
 * read and leave are 100 `visited` events — the ratio between those numbers is not the
 * share of people who converted, and printing it as a percentage would be a fabricated
 * funnel.
 *
 * `returned` is the one step that is close to a per-browser number, because
 * `resolveReturnVisit` stores the current ISO week the moment it fires and will not fire
 * again until the week changes: a week holds at most one return per browser. It is still
 * browsers and not people, and `gap` is deliberately bucketed, so a browser returning after
 * four months and one returning after seven days are both just "came back".
 *
 * ## Whole weeks only
 *
 * The two weeks reported are the two most recent *completed* ISO weeks, never the one in
 * flight. This runs on the Monday cron, so the week in flight is two days old and the week
 * before it is seven; comparing those and calling the result a weekly change measures the
 * day of the week, not the readership. An earlier version reported the running week and
 * labelled it "so far this week", which is honest about the week and still lies about the
 * comparison. Reporting only closed weeks costs one week of freshness and buys a delta
 * that means something.
 *
 * ## Same three states as the pipeline read
 *
 * `unconfigured` (no read credentials) and a week with zero visits mean opposite things and
 * are never collapsed: one says we cannot see, the other says we saw nothing. This is
 * `lib/telemetry/runHistory.ts`'s contract, kept identical so the two readers are used the
 * same way.
 */
import { z } from "zod";

import { cachedLoader } from "./cachedLoader";
import { formatIsoWeekSlug, getIsoWeekInfo } from "../isoWeek";
import { isActivationEvent } from "../activationFunnel";
import {
  buildStreamQuery,
  queryAnalyticsEngine,
  queryWindowPaged,
  resolveAnalyticsReadConfig,
  type AnalyticsReadConfig,
} from "./analyticsQuery";

const FUNNEL_STEPS = ["visited", "oriented", "committed", "returned"] as const;
type FunnelStep = (typeof FUNNEL_STEPS)[number];

/** `returned` is the north star; the rest exist to say which step is leaking. */
const NORTH_STAR: FunnelStep = "returned";

/** Completed weeks reported: the most recent one against the one before it. */
const COMPLETE_WEEKS = 2;

const REPORT_TIMEOUT_MS = 4_000;
const CACHE_MS = 15 * 60 * 1000;
const ROW_LIMIT = 5_000;
const MAX_QUERIES = 64;
const MIN_SLICE_MS = 60 * 60 * 1000;

export type FunnelWeek = {
  /** `2026-w39`. */
  week: string;
  counts: Record<FunnelStep, number>;
  /**
   * Commitments by what the reader did — copy the Slack brief, the email, the meeting
   * slide, the brief, or subscribe. This is the only place the product learns *which*
   * artifact travelled, and so the answer to which format is worth keeping.
   */
  commitments: Record<string, number>;
};

export type ActivationFunnelReport =
  | { status: "ok"; generatedAt: string; weeks: FunnelWeek[] }
  | { status: "unconfigured" }
  | { status: "unavailable"; reason: string };

const emptyCounts = (): Record<FunnelStep, number> => ({ visited: 0, oriented: 0, committed: 0, returned: 0 });

/** Analytics Engine stamps rows as "YYYY-MM-DD HH:MM:SS" in UTC; normalise to ISO. */
const toIsoTimestamp = (value: string): string | null => {
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(" ", "T")}Z` : value;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
};

/** Monday 00:00 UTC of the ISO week `now` falls in. */
const weekMondayUtc = (now: Date): Date => {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day;
};

/**
 * The `COMPLETE_WEEKS` most recent *completed* ISO weeks up to `now`, oldest first.
 *
 * Aligned to ISO Mondays rather than a rolling seven days, because a rolling window
 * straddles two week slugs and the comparison stops reading as one. Bounded above at the
 * Monday of the week `now` falls in, so the week still running is never in the set.
 */
export const funnelWeekSlugs = (now: Date): string[] => {
  const firstMonday = completeWeekStart(now);
  return Array.from({ length: COMPLETE_WEEKS }, (_, index) => {
    const monday = new Date(firstMonday);
    monday.setUTCDate(monday.getUTCDate() + index * 7);
    return formatIsoWeekSlug(getIsoWeekInfo(monday));
  });
};

/** Monday 00:00 UTC of the earliest completed ISO week at `now`. */
const completeWeekStart = (now: Date): Date => {
  const monday = weekMondayUtc(now);
  monday.setUTCDate(monday.getUTCDate() - COMPLETE_WEEKS * 7);
  return monday;
};

/**
 * The window to read: whole completed weeks only, ending where the running week begins.
 *
 * The end is exclusive in the query, so the seven days of the in-flight week are not
 * fetched and then discarded by the bucket lookup.
 */
const funnelWindow = (now: Date): { startIso: string; endIso: string } => ({
  startIso: completeWeekStart(now).toISOString(),
  endIso: weekMondayUtc(now).toISOString(),
});

const activationRowSchema = z.object({ timestamp: z.string(), blob2: z.string().nullable().optional() });
type ActivationRow = z.infer<typeof activationRowSchema>;

/**
 * The aggregation, over already-fetched rows.
 *
 * Split out from the query so the arithmetic — the part with an opinion in it — is
 * testable without a fetcher, a dataset, or a token.
 */
export const summarizeActivationRows = (rows: ActivationRow[], now: Date): FunnelWeek[] => {
  const slugs = funnelWeekSlugs(now);
  const buckets = new Map<string, FunnelWeek>(
    slugs.map((week) => [week, { week, counts: emptyCounts(), commitments: {} }]),
  );

  for (const row of rows) {
    const iso = toIsoTimestamp(row.timestamp);
    if (!iso || !row.blob2) continue;

    let payload: unknown;
    try {
      payload = JSON.parse(row.blob2);
    } catch {
      continue;
    }
    /*
     * Re-checked with the same guard the intake used rather than trusted: this is a remote
     * API, and a row whose step is not one of the four would otherwise be counted against
     * whichever bucket happened to match.
     */
    if (!isActivationEvent(payload)) continue;

    const week = formatIsoWeekSlug(getIsoWeekInfo(new Date(iso)));
    const bucket = buckets.get(week);
    if (!bucket) continue;

    bucket.counts[payload.step] += 1;
    if (payload.step === "committed") {
      bucket.commitments[payload.commitment] = (bucket.commitments[payload.commitment] ?? 0) + 1;
    }
  }

  return [...buckets.values()];
};

type LoadOptions = {
  fetcher?: typeof fetch;
  now?: Date;
  timeoutMs?: number;
  /** Injectable for tests; defaults to the read credentials on globalThis / process.env. */
  config?: AnalyticsReadConfig | null;
};

const queryActivation = async (
  config: AnalyticsReadConfig,
  options: Required<Omit<LoadOptions, "config">>,
): Promise<ActivationFunnelReport> => {
  /*
   * Paged rather than a single capped query, and the paging reader refuses instead of
   * returning a short count: a fortnight denser than one response would otherwise be
   * reported as a whole fortnight, which is the failure mode `runHistory.ts` calls out for
   * the `cron-step` stream and this reader has no reason to repeat.
   */
  const result = await queryWindowPaged<typeof activationRowSchema>({
    window: funnelWindow(options.now),
    minSliceMs: MIN_SLICE_MS,
    maxQueries: MAX_QUERIES,
    maxRows: ROW_LIMIT * MAX_QUERIES,
    run: (slice) =>
      queryAnalyticsEngine({
        config,
        sql: buildStreamQuery({
          dataset: config.dataset,
          stream: "activation",
          window: slice,
          columns: ["timestamp", "blob2"],
          limit: ROW_LIMIT,
        }),
        rowSchema: activationRowSchema,
        rowLimit: ROW_LIMIT,
        fetcher: options.fetcher,
        timeoutMs: options.timeoutMs,
      }),
  });

  if (!result.ok) return { status: "unavailable", reason: result.reason };

  return {
    status: "ok",
    generatedAt: options.now.toISOString(),
    weeks: summarizeActivationRows(result.rows, options.now),
  };
};

const activationLoader = cachedLoader<ActivationFunnelReport>({
  label: "activation-funnel",
  ttlMs: CACHE_MS,
  failureReason: "activation funnel read failed",
});

export const resetActivationFunnelCacheForTests = () => activationLoader.reset();

/** Never throws: whatever reads this must not go down with the telemetry API. */
export const loadActivationFunnelReport = async (options: LoadOptions = {}): Promise<ActivationFunnelReport> => {
  const config = options.config === undefined ? resolveAnalyticsReadConfig() : options.config;
  if (!config) return { status: "unconfigured" };

  const now = options.now ?? new Date();
  const timeoutMs = options.timeoutMs ?? REPORT_TIMEOUT_MS;
  return activationLoader.load(now, timeoutMs, () =>
    queryActivation(config, { fetcher: options.fetcher ?? fetch, now, timeoutMs }),
  );
};

/**
 * The shape the formatter needs. Narrower than `ActivationFunnelReport` on purpose: the
 * stored record in `recordActivationFunnel.ts` carries `weeks` and no status, and it is the
 * `/trust` section's actual source. One function, two callers, no second copy of the
 * sentence — and the `status: "ok"` in the type means a caller holding a failed or
 * unconfigured read cannot format a line out of it at all.
 */
type FunnelLineInput = { status: "ok"; weeks: FunnelWeek[] };

/**
 * One line a human can act on, or null when there is nothing true to say.
 *
 * Deliberately not a percentage, and deliberately not a headcount — see the note at the top
 * of this file. "Returns", not "readers": a browser that comes back twice records two, and
 * an earlier version of this line said "5 readers came back" off the back of that same
 * number.
 */
export const formatActivationFunnelLine = (report: FunnelLineInput): string | null => {
  const [previous, current] = report.weeks;
  if (!previous || !current) return null;

  const returned = current.counts[NORTH_STAR];
  const before = previous.counts[NORTH_STAR];
  if (returned === 0 && before === 0) return null;

  // Both weeks are closed, so the newest one is simply "last week".
  if (returned === 0) return `No returns recorded last week; ${before} the week before.`;

  const delta = returned - before;
  const move = delta === 0 ? "unchanged from the week before" : `${delta > 0 ? "+" : ""}${delta} vs the week before`;
  return `${returned} return${returned === 1 ? "" : "s"} recorded last week (${move})`;
};
