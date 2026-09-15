/**
 * The deterministic half of the regime-history Workflow (worker/workflows/regimeHistoryRefresh.ts).
 *
 * The Worker cron already records the month in progress to KV on every run
 * (refreshMonthlyRegimeHistory.ts); the read path merges that over the bundled snapshot. What
 * never happened without a person was getting that month *into the repository*, where the
 * bundled snapshot lives — the scheduled routine meant to do it kept failing at its PR step
 * while reporting success (CLAUDE.md). This module turns the KV copy into a pull request.
 *
 * Deliberately narrow: it adds or rewrites the months KV knows about and nothing else. The
 * canonical month-end regeneration from FRED history stays with scripts/generateMonthlySummaries.ts.
 *
 * The merge base is the file on the pull request's base branch, read at run time — never the
 * series bundled into the running deployment. A preview deployment can be built from a commit
 * older than main; merging over its bundle and writing the result onto a branch from main
 * would silently drop every month that reached main after the preview was built.
 */
import type { KvNamespace } from "../runtime/kv";
import { GitHubRepoClient, type GitHubPullRequest } from "../github/repoClient";
import {
  MONTHLY_REGIME_HISTORY_KV_KEY,
  mergeMonthlyRegimeHistory,
  monthKeyFor,
  parseMonthlyRegimeHistory,
  type MonthlyRegimeHistoryEntry,
} from "./monthlyRegimeHistory";

export const REGIME_HISTORY_FILE_PATH = "data/summary_monthly_regime_history.json";

type RegimeHistoryFileUpdate = {
  /** False when the current file already carries every month KV has, in the same shape. */
  changed: boolean;
  /** The next file body: two-space JSON with a trailing newline, as the generator scripts write it. */
  content: string;
  /** Month keys (YYYY-MM) that are new or rewritten relative to the current file. */
  changedMonths: string[];
};

export const readStoredMonthlyRegimeHistory = async (kv: Pick<KvNamespace, "get">): Promise<MonthlyRegimeHistoryEntry[]> => {
  const raw = await kv.get(MONTHLY_REGIME_HISTORY_KV_KEY);
  if (!raw) return [];
  try {
    return parseMonthlyRegimeHistory(JSON.parse(raw));
  } catch {
    return [];
  }
};

/** The series as it stands on `branch`. Throws rather than falling back: a Workflow that cannot read its base must not write. */
export const readRegimeHistoryFromBranch = async (
  client: GitHubRepoClient,
  branch: string,
): Promise<MonthlyRegimeHistoryEntry[]> => {
  const file = await client.getFile(REGIME_HISTORY_FILE_PATH, branch);
  if (!file) {
    throw new Error(`${REGIME_HISTORY_FILE_PATH} is missing on ${branch}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(file.content);
  } catch {
    throw new Error(`${REGIME_HISTORY_FILE_PATH} on ${branch} is not JSON`);
  }
  const entries = parseMonthlyRegimeHistory(parsed);
  if (entries.length === 0) {
    throw new Error(`${REGIME_HISTORY_FILE_PATH} on ${branch} did not validate as a regime history`);
  }
  return entries;
};

/** `current` is the series the pull request will replace: the file on the base branch. */
export const buildRegimeHistoryFileUpdate = (
  stored: MonthlyRegimeHistoryEntry[],
  current: MonthlyRegimeHistoryEntry[],
): RegimeHistoryFileUpdate => {
  const next = mergeMonthlyRegimeHistory(current, stored);
  const currentByMonth = new Map(current.map((entry) => [monthKeyFor(entry.record_date), JSON.stringify(entry)]));
  const changedMonths = next
    .filter((entry) => currentByMonth.get(monthKeyFor(entry.record_date)) !== JSON.stringify(entry))
    .map((entry) => monthKeyFor(entry.record_date));

  return {
    changed: changedMonths.length > 0,
    content: `${JSON.stringify(next, null, 2)}\n`,
    changedMonths,
  };
};

export const buildRegimeHistoryUpdateAgainstBase = async ({
  client,
  base = "main",
  stored,
}: {
  client: GitHubRepoClient;
  base?: string;
  stored: MonthlyRegimeHistoryEntry[];
}): Promise<RegimeHistoryFileUpdate> => buildRegimeHistoryFileUpdate(stored, await readRegimeHistoryFromBranch(client, base));

export const regimeHistoryBranchName = (now: Date) => `automation/regime-history-${now.toISOString().slice(0, 10)}`;

const buildRegimeHistoryPullRequestBody = (update: RegimeHistoryFileUpdate, now: Date) =>
  [
    "## Summary",
    `Records the month in progress from the Worker's KV copy of the regime history into the bundled series (\`${REGIME_HISTORY_FILE_PATH}\`). Months added or rewritten: ${update.changedMonths.join(", ")}.`,
    "",
    "Opened by the `RegimeHistoryRefreshWorkflow` (worker/workflows/regimeHistoryRefresh.ts) from the entries `refreshMonthlyRegimeHistory` wrote after live reads. It adds nothing the Worker did not observe: no backfill, no regenerated history. The canonical month-end series is still `scripts/generateMonthlySummaries.ts`'s job.",
    "",
    "## Decision delta (required for product-facing changes)",
    "- **What changed this week for operators?**",
    "  - The month rail and `/history` show this month from the bundled snapshot after deploy, not only from KV.",
    "- **What decision should tighten or loosen because of this change?**",
    "  - None. Data only.",
    "- **What should be revisited now?**",
    "  - Nothing, unless the entry disagrees with what the site showed during the month.",
    "- **What would flip/reverse this call?**",
    "  - A regenerated series from the routine that disagrees with this entry; the regeneration wins.",
    "",
    "## Surface + owner (required)",
    `- **Primary surface touched**: \`${REGIME_HISTORY_FILE_PATH}\`.`,
    "- **Requested reviewer/owner for this hotspot**: repo owner.",
    "",
    `_Generated ${now.toISOString()} by the regime history Workflow._`,
  ].join("\n");

type OpenRegimeHistoryPullRequestInput = {
  client: GitHubRepoClient;
  update: RegimeHistoryFileUpdate;
  base?: string;
  now?: Date;
};

export type OpenRegimeHistoryPullRequestResult =
  | { opened: false; reason: string }
  | { opened: true; pullRequest: GitHubPullRequest; branch: string; alreadyOpen: boolean };

/**
 * Idempotent per day: a re-run after a partial failure reuses the branch and, if a PR is
 * already open for it, reports that PR instead of opening a duplicate.
 */
export const openRegimeHistoryPullRequest = async ({
  client,
  update,
  base = "main",
  now = new Date(),
}: OpenRegimeHistoryPullRequestInput): Promise<OpenRegimeHistoryPullRequestResult> => {
  if (!update.changed) {
    return { opened: false, reason: `${base} already carries every month KV has` };
  }

  const branch = regimeHistoryBranchName(now);

  const existing = await client.findOpenPullRequest(branch);
  if (existing) {
    return { opened: true, pullRequest: existing, branch, alreadyOpen: true };
  }

  const baseSha = await client.getBranchHeadSha(base);
  if (!baseSha) {
    throw new Error(`base branch ${base} not found in ${client.repository}`);
  }

  if ((await client.getBranchHeadSha(branch)) === null) {
    await client.createBranch(branch, baseSha);
  }

  const current = await client.getFile(REGIME_HISTORY_FILE_PATH, branch);
  if (current && current.content === update.content) {
    // The branch already carries this exact file (a re-run after the PR step failed).
  } else {
    await client.putFile({
      path: REGIME_HISTORY_FILE_PATH,
      branch,
      message: `Record ${update.changedMonths.join(", ")} in the regime history from the Worker's month in progress`,
      content: update.content,
      sha: current?.sha,
    });
  }

  const pullRequest = await client.openPullRequest({
    title: `Record ${update.changedMonths.join(", ")} in the regime history`,
    head: branch,
    base,
    body: buildRegimeHistoryPullRequestBody(update, now),
  });

  return { opened: true, pullRequest, branch, alreadyOpen: false };
};
