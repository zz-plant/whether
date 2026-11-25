/**
 * How each scheduled run last ended, kept where `/api/health` can read it.
 *
 * Every step writes a `cron-step` row, but Analytics Engine is read back only with an account
 * token, and the failure notice only with `WHETHER_OPS_EMAIL`. Production had neither from
 * 2026-11-02, so both data Workflows failed every day while `/api/health` said "ok". One KV key
 * per run holds the steps that failed the last time it ran, an empty list for a clean run, so
 * health can be read by any monitor without a credential.
 *
 * Step names only, never the error: `/api/health` is public, and an error can carry a URL or
 * an upstream's response. The notice and the `cron-step` row keep the reason.
 */
import { z } from "zod";
import { getWhetherKv, parseStoredJson, readKvValues, type KvNamespace } from "../runtime/kv";
import type { FailedStep } from "./opsNotice";

/** The two crons and the two Workflows they start. */
const SCHEDULED_RUNS = ["daily", "weekly", "regime-history", "brief-freeze"] as const;
type ScheduledRun = (typeof SCHEDULED_RUNS)[number];

/** Nothing else in the namespace starts with `ops:`. */
const keyFor = (run: ScheduledRun) => `ops:last-run:${run}`;

/**
 * Two weeks: a weekly run overwrites its record before then, so a record KV drops is one for a
 * run that stopped running, such as a Workflow switched off. Health then forgets it rather than
 * reporting the last failure of a lane nobody runs.
 */
const RUN_OUTCOME_TTL_SECONDS = 14 * 24 * 60 * 60;

const RunOutcomeSchema = z.object({ at: z.string(), failedSteps: z.array(z.string()) });

type FailingRun = { run: ScheduledRun; at: string; failedSteps: string[] };

/** Records how a run ended. Never throws: a run that cannot record itself has still run. */
export const recordRunOutcome = async (
  run: ScheduledRun,
  failures: readonly FailedStep[],
  { kv = getWhetherKv(), now = new Date() }: { kv?: Pick<KvNamespace, "put"> | null; now?: Date } = {},
): Promise<void> => {
  if (!kv) return;
  const record = { at: now.toISOString(), failedSteps: failures.map(({ step }) => step) };
  try {
    await kv.put(keyFor(run), JSON.stringify(record), { expirationTtl: RUN_OUTCOME_TTL_SECONDS });
  } catch (error) {
    console.error(`[ops] could not record the ${run} run`, error);
  }
};

/**
 * The runs whose last outcome had a failed step. Empty without a KV binding, where nothing was
 * recorded. A failing read rejects: an outage is not a clean record, and the caller says so.
 */
export const readFailingRuns = async (
  { kv = getWhetherKv() }: { kv?: Pick<KvNamespace, "get"> | null } = {},
): Promise<FailingRun[]> => {
  if (!kv) return [];
  const values = await readKvValues(kv, SCHEDULED_RUNS.map(keyFor));
  return SCHEDULED_RUNS.flatMap((run, index) => {
    const record = parseStoredJson(values[index], RunOutcomeSchema);
    return record && record.failedSteps.length > 0 ? [{ run, ...record }] : [];
  });
};
