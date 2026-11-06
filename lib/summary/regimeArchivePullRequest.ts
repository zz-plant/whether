/**
 * The deterministic half of the regime-history Workflow (worker/workflows/regimeHistoryRefresh.ts):
 * rebuild the whole archive from FRED and put it behind one pull request.
 *
 * Until 2026-11-03 the archive was rebuilt only by a scheduled claude.ai routine, which the
 * account's weekly usage cap rejected for weeks at a time and whose prompt committed three of
 * the files the generators write (docs/agents/lessons/automation-and-deploy-gate.md). The
 * Workflow then only copied the month in progress from KV into the month rail, a pull request
 * `tests/summaryDerivedHistory.test.ts` fails whenever the month is not yet in the archive, since
 * the rail must equal the archive's month-ends. This runs the generators' own code instead
 * (`regimeArchiveRebuild.ts`), so the rail, the archive, the Time Machine cache and the
 * `/history` index land together and agree.
 *
 * The base is read at one commit, the base branch's head when the run starts, and the commit
 * is made on top of that same commit — never over this deployment's bundle, which a preview
 * may have built from an older main.
 */
import type { GitHubPullRequest, GitHubRepoClient } from "../github/repoClient";
import { fetchArchiveDatasets, fetchFredSeries } from "./regimeArchiveContext";
import { rebuildRegimeArchive, type RegimeArchiveRebuild } from "./regimeArchiveRebuild";

/** One branch, moved by every run that lands something, so a stalled pull request is updated rather than joined by another. */
const REGIME_ARCHIVE_BRANCH = "automation/regime-archive-rebuild";

/** UTC Tuesday: FRED has Friday's Treasury prints from Monday evening, so the week just ended is complete. */
const WEEKLY_LANDING_DAY = 2;

/**
 * Whether a rebuild's changes are worth a pull request today. It runs daily, but most days'
 * changes are FRED revising the Chicago Fed index's history or a week scored before Friday's
 * print arrived, which next Tuesday's rebuild carries anyway; landing each would be several
 * deploys a week. A month-end is different: `tests/summaryDerivedHistory.test.ts` fails on main
 * from the ninth of the month without it, and its first print is often not on FRED until the
 * second or third business day, so it lands the day it appears.
 */
const landsToday = ({ now, newMonthEnds, landAnyChange = false }: { now: Date; newMonthEnds: string[]; landAnyChange?: boolean }) =>
  landAnyChange || newMonthEnds.length > 0 || now.getUTCDay() === WEEKLY_LANDING_DAY;

type RegimeArchiveSummary = Pick<RegimeArchiveRebuild, "newMonthEnds" | "latest">;

export type RegimeArchiveCommitResult =
  | { committed: false; reason: string }
  | ({ committed: true; branch: string; baseSha: string; commitSha: string; paths: string[] } & RegimeArchiveSummary);

const describeCoverage = ({ newMonthEnds, latest }: RegimeArchiveSummary) =>
  newMonthEnds.length > 0
    ? `month-end ${newMonthEnds.join(", ")}`
    : `weeks through ${latest.week ?? "the last completed week"}`;

/**
 * Fetches the six FRED series, rebuilds every archive file against `base` as it stands, and,
 * when something changed and it lands today, commits the changed files to
 * `REGIME_ARCHIVE_BRANCH` in one commit. Returns only names and shas: a Workflow step's result
 * must stay under 1MiB, and the files are 7MB.
 */
export const commitRegimeArchiveRebuild = async ({
  client,
  base = "main",
  now = new Date(),
  fetcher = fetch,
  landAnyChange = false,
}: {
  client: GitHubRepoClient;
  base?: string;
  now?: Date;
  fetcher?: typeof fetch;
  landAnyChange?: boolean;
}): Promise<RegimeArchiveCommitResult> => {
  const baseSha = await client.getBranchHeadSha(base);
  if (!baseSha) {
    throw new Error(`base branch ${base} not found in ${client.repository}`);
  }

  const rebuild = await rebuildRegimeArchive({
    loadDatasets: () => fetchArchiveDatasets((seriesId) => fetchFredSeries(seriesId, fetcher)),
    now,
    readBase: (path) => client.getFileText(path, baseSha),
  });

  if (rebuild.files.length === 0) {
    return { committed: false, reason: `${base} already carries the archive FRED rebuilds to` };
  }
  if (!landsToday({ now, newMonthEnds: rebuild.newMonthEnds, landAnyChange })) {
    return {
      committed: false,
      reason: `${rebuild.files.length} file(s) changed but no month-end is new; Tuesday's rebuild lands them`,
    };
  }

  const commitSha = await client.commitFiles({
    branch: REGIME_ARCHIVE_BRANCH,
    parentSha: baseSha,
    message: `chore: rebuild the regime archive from FRED (${describeCoverage(rebuild)})`,
    files: rebuild.files,
  });

  return {
    committed: true,
    branch: REGIME_ARCHIVE_BRANCH,
    baseSha,
    commitSha,
    paths: rebuild.files.map((file) => file.path),
    newMonthEnds: rebuild.newMonthEnds,
    latest: rebuild.latest,
  };
};

const buildPullRequestBody = (commit: Extract<RegimeArchiveCommitResult, { committed: true }>, now: Date) =>
  [
    "## Summary",
    `Rebuilds the regime archive from FRED's full history with the generators' own code (\`lib/summary/regimeArchiveRebuild.ts\`), against \`${commit.baseSha.slice(0, 7)}\`.`,
    "",
    `- New month-ends: ${commit.newMonthEnds.length > 0 ? commit.newMonthEnds.join(", ") : "none"}.`,
    `- Newest month-end ${commit.latest.monthEnd ?? "none"}, week ${commit.latest.week ?? "none"}, quarter ${commit.latest.quarter ?? "none"}.`,
    "- Files:",
    ...commit.paths.map((path) => `  - \`${path}\``),
    "",
    "Opened by the `RegimeHistoryRefreshWorkflow` (worker/workflows/regimeHistoryRefresh.ts). Entries that differ from the base only by the run's timestamps keep their stored text, so the diff is the data that changed: new periods, FRED revisions, and copy the summary builders now write differently.",
    "",
    "## Decision delta (required for product-facing changes)",
    "- **What changed this week for operators?**",
    "  - The month rail, `/history`, the Time Machine and the confidence record read the periods above after deploy.",
    "- **What decision should tighten or loosen because of this change?**",
    "  - None. Data only.",
    "- **What should be revisited now?**",
    "  - Nothing, unless a stored period's conditions changed: that is a FRED revision or an engine change, and worth reading.",
    "- **What would flip/reverse this call?**",
    "  - A failing branch build. The suite replays the archive (`tests/regimeArchiveReplay.test.ts`) and checks the derived files against it (`tests/summaryDerivedHistory.test.ts`).",
    "",
    "## Surface + owner (required)",
    "- **Primary surface touched**: the regime archive under `data/`.",
    "- **Requested reviewer/owner for this hotspot**: repo owner.",
    "",
    `_Generated ${now.toISOString()} by the regime history Workflow._`,
  ].join("\n");

type OpenRegimeArchivePullRequestResult = { pullRequest: GitHubPullRequest; alreadyOpen: boolean };

/** Reuses the open pull request for the branch (the commit already moved it), or opens one. */
export const openRegimeArchivePullRequest = async ({
  client,
  commit,
  base = "main",
  now = new Date(),
}: {
  client: GitHubRepoClient;
  commit: Extract<RegimeArchiveCommitResult, { committed: true }>;
  base?: string;
  now?: Date;
}): Promise<OpenRegimeArchivePullRequestResult> => {
  const existing = await client.findOpenPullRequest(commit.branch);
  if (existing) {
    return { pullRequest: existing, alreadyOpen: true };
  }
  const pullRequest = await client.openPullRequest({
    title: `chore: rebuild the regime archive from FRED (${describeCoverage(commit)})`,
    head: commit.branch,
    base,
    body: buildPullRequestBody(commit, now),
  });
  return { pullRequest, alreadyOpen: false };
};
