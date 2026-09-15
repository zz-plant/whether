/**
 * Reads the Worker's own cron telemetry back out of Analytics Engine.
 *
 * `worker/index.ts` writes a `cron-step` event for every scheduled step — signal refresh,
 * weekly email, Slack brief, month-in-progress, alert checks, the two Workflow hand-offs —
 * with whether it succeeded and how long it took. Until this module nothing read that
 * stream: the trust page claimed freshness and fallback transparency while the evidence of
 * what the pipeline actually did sat in a dataset only one SEO script ever queried.
 *
 * The Analytics Engine binding is write-only from a Worker; reads go through the SQL API
 * with an account-scoped token (Account Analytics: Read). Both are secrets, and their
 * absence is a state the page renders as "not configured", never as "no runs" — the two
 * mean opposite things about the pipeline.
 *
 * Bounded and cached: one query per isolate per fifteen minutes under a short deadline, so a
 * slow API costs the page nothing it can notice and the read never becomes a dependency
 * the pipeline itself has.
 */
import { z } from "zod";
import { withDeadline } from "../withDeadline";

export const RUN_HISTORY_WINDOW_DAYS = 30;
export const RUN_HISTORY_CACHE_MS = 15 * 60 * 1000;
export const RUN_HISTORY_TIMEOUT_MS = 2_500;
const DEFAULT_DATASET = "whether_telemetry";
const ROW_LIMIT = 5_000;

/** Operator-facing names for the step labels `runCronStep` writes. Unknown steps show their raw label. */
export const CRON_STEP_LABELS: Record<string, string> = {
  "refresh-operating-state": "Signal refresh",
  "email/send-weekly": "Weekly email",
  "slack/deliver-brief": "Slack brief",
  "artifact/brief-screenshot": "Brief screenshot",
  "summary-history": "Month in progress",
  "check-regime-change": "Regime-change check",
  "alert-deliveries": "Alert deliveries",
  "regime-history-workflow": "Regime history pull request",
  "brief-freeze-workflow": "Brief freeze pull request",
};

export type CronStepSummary = {
  step: string;
  label: string;
  runs: number;
  failures: number;
  lastRunAt: string;
  lastOkAt: string | null;
  lastError: string | null;
};

export type CronRunHistory =
  | {
      status: "ok";
      windowDays: number;
      generatedAt: string;
      steps: CronStepSummary[];
      totalRuns: number;
      totalFailures: number;
    }
  | { status: "unconfigured" }
  | { status: "unavailable"; reason: string };

export type AnalyticsReadConfig = { accountId: string; token: string; dataset: string };

const readSetting = (name: string): string | null => {
  const fromBinding: unknown = Reflect.get(globalThis, name);
  if (typeof fromBinding === "string" && fromBinding.trim() !== "") return fromBinding.trim();
  const fromEnv = typeof process !== "undefined" ? process.env?.[name] : undefined;
  return typeof fromEnv === "string" && fromEnv.trim() !== "" ? fromEnv.trim() : null;
};

/** Dataset names are identifiers, and this one comes from a var; anything else is refused rather than interpolated. */
const isDatasetName = (value: string) => /^[a-z][a-z0-9_]{0,63}$/i.test(value);

export const resolveAnalyticsReadConfig = (): AnalyticsReadConfig | null => {
  const accountId = readSetting("CLOUDFLARE_ACCOUNT_ID");
  const token = readSetting("CLOUDFLARE_ANALYTICS_READ_TOKEN");
  const dataset = readSetting("WHETHER_TELEMETRY_DATASET") ?? DEFAULT_DATASET;
  if (!accountId || !token || !isDatasetName(dataset)) return null;
  return { accountId, token, dataset };
};

/* Validated rather than asserted: this is a remote API response, and an error body would
   otherwise be counted as "zero runs". */
const sqlResponseSchema = z.object({
  data: z.array(z.object({ timestamp: z.string(), blob2: z.string().nullable().optional() })).optional(),
});

const cronStepEventSchema = z.object({
  step: z.string().min(1),
  ok: z.boolean(),
  error: z.string().nullable().optional(),
});

export type CronStepRow = { timestamp: string; blob2?: string | null };

/** Analytics Engine stamps rows as "YYYY-MM-DD HH:MM:SS" in UTC; normalise to ISO. */
const toIsoTimestamp = (value: string): string | null => {
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(" ", "T")}Z` : value;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
};

export const summarizeCronSteps = (
  rows: CronStepRow[],
  options: { windowDays?: number; now?: Date } = {},
): Extract<CronRunHistory, { status: "ok" }> => {
  const summaries = new Map<string, CronStepSummary>();

  for (const row of rows) {
    if (!row.blob2) continue;
    let event: z.infer<typeof cronStepEventSchema>;
    try {
      const parsed = cronStepEventSchema.safeParse(JSON.parse(row.blob2));
      if (!parsed.success) continue;
      event = parsed.data;
    } catch {
      continue;
    }
    const at = toIsoTimestamp(row.timestamp);
    if (!at) continue;

    const summary = summaries.get(event.step) ?? {
      step: event.step,
      label: CRON_STEP_LABELS[event.step] ?? event.step,
      runs: 0,
      failures: 0,
      lastRunAt: at,
      lastOkAt: null,
      lastError: null,
    };
    summary.runs += 1;
    if (at > summary.lastRunAt) summary.lastRunAt = at;
    if (event.ok) {
      if (!summary.lastOkAt || at > summary.lastOkAt) summary.lastOkAt = at;
    } else {
      summary.failures += 1;
      // Rows arrive newest first, so the first failure seen is the latest one.
      summary.lastError ??= event.error ?? "failed";
    }
    summaries.set(event.step, summary);
  }

  const steps = [...summaries.values()].sort((a, b) => b.lastRunAt.localeCompare(a.lastRunAt));
  return {
    status: "ok",
    windowDays: options.windowDays ?? RUN_HISTORY_WINDOW_DAYS,
    generatedAt: (options.now ?? new Date()).toISOString(),
    steps,
    totalRuns: steps.reduce((sum, step) => sum + step.runs, 0),
    totalFailures: steps.reduce((sum, step) => sum + step.failures, 0),
  };
};

export const buildCronStepQuery = (dataset: string, windowDays: number) =>
  [
    "SELECT timestamp, blob2",
    `FROM ${dataset}`,
    "WHERE index1 = 'cron-step'",
    `  AND timestamp > NOW() - INTERVAL '${Math.trunc(windowDays)}' DAY`,
    "ORDER BY timestamp DESC",
    `LIMIT ${ROW_LIMIT}`,
  ].join("\n");

export type LoadCronRunHistoryOptions = {
  fetcher?: typeof fetch;
  now?: Date;
  windowDays?: number;
  timeoutMs?: number;
  /** Injectable for tests; defaults to the secrets on globalThis / process.env. */
  config?: AnalyticsReadConfig | null;
};

const queryCronSteps = async (
  config: AnalyticsReadConfig,
  options: Required<Pick<LoadCronRunHistoryOptions, "fetcher" | "now" | "windowDays">>,
): Promise<CronRunHistory> => {
  const response = await options.fetcher(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.accountId)}/analytics_engine/sql`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${config.token}`, "content-type": "text/plain" },
      body: buildCronStepQuery(config.dataset, options.windowDays),
    },
  );

  if (!response.ok) {
    return { status: "unavailable", reason: `Analytics Engine answered HTTP ${response.status}` };
  }

  const parsed = sqlResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    return { status: "unavailable", reason: "Analytics Engine answered with an unexpected payload" };
  }

  return summarizeCronSteps(parsed.data.data ?? [], { windowDays: options.windowDays, now: options.now });
};

let cached: { at: number; value: Promise<CronRunHistory> } | null = null;

export const resetRunHistoryCacheForTests = () => {
  cached = null;
};

/** Never throws: a page that reads this must not go down with the telemetry API. */
export const loadCronRunHistory = async (options: LoadCronRunHistoryOptions = {}): Promise<CronRunHistory> => {
  const config = options.config === undefined ? resolveAnalyticsReadConfig() : options.config;
  if (!config) return { status: "unconfigured" };

  const now = options.now ?? new Date();
  if (cached && now.getTime() - cached.at < RUN_HISTORY_CACHE_MS) {
    return cached.value;
  }

  const value = withDeadline(
    queryCronSteps(config, {
      fetcher: options.fetcher ?? fetch,
      now,
      windowDays: options.windowDays ?? RUN_HISTORY_WINDOW_DAYS,
    }),
    options.timeoutMs ?? RUN_HISTORY_TIMEOUT_MS,
    "run-history",
  ).catch((error: unknown): CronRunHistory => ({
    status: "unavailable",
    reason: error instanceof Error ? error.message : "run history read failed",
  }));

  cached = { at: now.getTime(), value };
  const resolved = await value;
  // A failed read is not worth remembering for fifteen minutes; the next request tries again.
  if (resolved.status !== "ok") cached = null;
  return resolved;
};
