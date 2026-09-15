import { z } from "zod";

/**
 * One transport for reading Analytics Engine.
 *
 * Two readers each grew their own: `lib/telemetry/runHistory.ts` and
 * `scripts/seo-page-metrics.ts` posted to the same endpoint with different
 * token env vars, different header casing, a deadline on one side and none on
 * the other, and a dataset guard on one side only — the script interpolated
 * `WHETHER_TELEMETRY_DATASET` straight into a `FROM` clause. They also
 * disagreed about the row cap: one refused at it, the other silently truncated
 * at `LIMIT 5000` and reported the result as complete.
 *
 * This module is the shared half: config resolution, the dataset guard, the
 * POST, schema validation, and a `truncated` flag so a caller can tell a full
 * answer from a clipped one rather than guessing.
 */

const DEFAULT_DATASET = "whether_telemetry";

export type AnalyticsReadConfig = { accountId: string; token: string; dataset: string };

const readSetting = (name: string): string | null => {
  const fromBinding: unknown = Reflect.get(globalThis, name);
  if (typeof fromBinding === "string" && fromBinding.trim() !== "") return fromBinding.trim();
  const fromEnv = typeof process !== "undefined" ? process.env?.[name] : undefined;
  return typeof fromEnv === "string" && fromEnv.trim() !== "" ? fromEnv.trim() : null;
};

/** Dataset names are identifiers, and this one comes from a var; anything else is refused rather than interpolated. */
export const isDatasetName = (value: string) => /^[a-z][a-z0-9_]{0,63}$/i.test(value);

/**
 * The read credentials, from either token name.
 *
 * `CLOUDFLARE_ANALYTICS_READ_TOKEN` is what the Worker's runtime binding is
 * called and `CLOUDFLARE_API_TOKEN` is what the deployment runbook tells an
 * operator to export for scripts. Both name the same permission (Account
 * Analytics: Read), and a reader that accepted only one of them reported
 * "unconfigured" on a machine that was configured.
 */
export const resolveAnalyticsReadConfig = (): AnalyticsReadConfig | null => {
  const accountId = readSetting("CLOUDFLARE_ACCOUNT_ID");
  const token = readSetting("CLOUDFLARE_ANALYTICS_READ_TOKEN") ?? readSetting("CLOUDFLARE_API_TOKEN");
  const dataset = readSetting("WHETHER_TELEMETRY_DATASET") ?? DEFAULT_DATASET;
  if (!accountId || !token || !isDatasetName(dataset)) return null;
  return { accountId, token, dataset };
};

type AnalyticsQueryResult<Row> =
  | { ok: true; rows: Row[]; truncated: boolean }
  | { ok: false; reason: string };

/* The return type is declared rather than inferred: `z.object` widens the row
   type through the optional array, and leaving it inferred is what forced the
   call site to assert the parsed rows back into shape. */
const responseSchema = <Row extends z.ZodTypeAny>(rowSchema: Row): z.ZodType<{ data?: z.infer<Row>[] }> =>
  z.object({ data: z.array(rowSchema).optional() });

type AnalyticsQueryOptions<Row extends z.ZodTypeAny> = {
  config: AnalyticsReadConfig;
  sql: string;
  rowSchema: Row;
  /** The `LIMIT` in `sql`, so the result can report whether it was reached. */
  rowLimit: number;
  fetcher?: typeof fetch;
  timeoutMs?: number;
};

export const queryAnalyticsEngine = async <Row extends z.ZodTypeAny>({
  config,
  sql,
  rowSchema,
  rowLimit,
  fetcher = fetch,
  timeoutMs,
}: AnalyticsQueryOptions<Row>): Promise<AnalyticsQueryResult<z.infer<Row>>> => {
  const controller = typeof AbortController === "function" && timeoutMs ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetcher(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.accountId)}/analytics_engine/sql`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${config.token}`, "content-type": "text/plain" },
        body: sql,
        ...(controller ? { signal: controller.signal } : {}),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { ok: false, reason: `Analytics Engine answered HTTP ${response.status}${detail ? ` ${detail.slice(0, 400)}` : ""}` };
    }

    const parsed = responseSchema(rowSchema).safeParse(await response.json());
    if (!parsed.success) {
      return { ok: false, reason: "Analytics Engine answered with an unexpected payload" };
    }

    const rows = parsed.data.data ?? [];
    return { ok: true, rows, truncated: rows.length >= rowLimit };
  } catch (error) {
    return { ok: false, reason: `Analytics Engine query threw: ${error instanceof Error ? error.message : String(error)}` };
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/** A window of time to read, as the SQL predicate it becomes. */
type AnalyticsWindow = { startIso: string; endIso: string };

const asSqlTimestamp = (iso: string) => iso.replace("T", " ").replace(/\.\d+Z$/, "").replace("Z", "");

export const buildStreamQuery = ({
  dataset,
  stream,
  window,
  columns = ["blob2"],
  orderBy,
  limit,
}: {
  dataset: string;
  stream: string;
  window: AnalyticsWindow;
  columns?: string[];
  orderBy?: string;
  limit: number;
}) =>
  [
    `SELECT ${columns.join(", ")}`,
    `FROM ${dataset}`,
    `WHERE index1 = '${stream.replace(/'/g, "")}'`,
    `  AND timestamp >= toDateTime('${asSqlTimestamp(window.startIso)}')`,
    `  AND timestamp < toDateTime('${asSqlTimestamp(window.endIso)}')`,
    ...(orderBy ? [`ORDER BY ${orderBy}`] : []),
    `LIMIT ${Math.trunc(limit)}`,
  ].join("\n");

/** Split a window into `count` consecutive slices of equal length. */
export const splitWindow = (window: AnalyticsWindow, count: number): AnalyticsWindow[] => {
  const start = Date.parse(window.startIso);
  const end = Date.parse(window.endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || count < 2) return [window];

  const step = (end - start) / count;
  return Array.from({ length: count }, (_, index) => ({
    startIso: new Date(start + step * index).toISOString(),
    endIso: new Date(index === count - 1 ? end : start + step * (index + 1)).toISOString(),
  }));
};

const windowLengthMs = (window: AnalyticsWindow) =>
  Date.parse(window.endIso) - Date.parse(window.startIso);

/**
 * Every row in a window, by splitting the window until no slice is clipped.
 *
 * Analytics Engine's SQL has no cursor, so "the next page" has to be expressed
 * as a narrower time range. A slice that comes back at the row cap is
 * re-queried as four shorter slices, down to `minSliceMs`; below that the data
 * really is denser than the cap and the caller is told, rather than handed a
 * short count that looks complete. The previous behaviour was to refuse the
 * whole run the moment one query reached the cap, which made a busy month
 * unreadable rather than slower.
 */
export const queryWindowPaged = async <Row extends z.ZodTypeAny>({
  window,
  minSliceMs,
  maxQueries = 64,
  maxRows = 250_000,
  run,
}: {
  window: AnalyticsWindow;
  minSliceMs: number;
  maxQueries?: number;
  /**
   * How many rows the accumulated result may hold.
   *
   * Refusing at the per-query cap used to bound this implicitly: one query, one
   * cap, one array. Paging removed that bound, so a busy window could gather
   * `maxQueries` capfuls — hundreds of megabytes of JSON blobs — and die of
   * memory instead of returning the actionable refusal it used to.
   */
  maxRows?: number;
  run: (slice: AnalyticsWindow) => Promise<AnalyticsQueryResult<z.infer<Row>>>;
}): Promise<{ ok: true; rows: z.infer<Row>[]; queries: number } | { ok: false; reason: string; queries: number }> => {
  const pending: AnalyticsWindow[] = [window];
  const rows: z.infer<Row>[] = [];
  let queries = 0;

  while (pending.length > 0) {
    const slice = pending.shift()!;
    if (queries >= maxQueries) {
      return {
        ok: false,
        queries,
        reason: `reading the window needed more than ${maxQueries} queries; narrow the window or raise the row limit.`,
      };
    }

    queries += 1;
    const result = await run(slice);
    if (!result.ok) return { ok: false, reason: result.reason, queries };

    if (!result.truncated) {
      if (rows.length + result.rows.length > maxRows) {
        return {
          ok: false,
          queries,
          reason: `the window holds more than ${maxRows} rows; narrow WHETHER_METRICS_WINDOW_DAYS `
            + "rather than reading a set this large into memory.",
        };
      }
      rows.push(...result.rows);
      continue;
    }

    if (windowLengthMs(slice) <= minSliceMs) {
      return {
        ok: false,
        queries,
        reason: `a ${Math.round(windowLengthMs(slice) / 60_000)}-minute slice still hit the row cap, `
          + "so the window holds more events than any single query can return. Raise the row limit.",
      };
    }

    pending.unshift(...splitWindow(slice, 4));
  }

  return { ok: true, rows, queries };
};
