/**
 * When a Workflow may merge the data pull request it opened, without a person.
 *
 * The brief freeze and the regime-history refresh each open a pull request that changes one
 * data file, and until this module a person merged every one — w38 through w41 each waited on
 * a click, and a week nobody merged was a week the archive did not carry. The judgment that
 * click made is mechanical, so it is made here, and every condition must hold at the moment of
 * the merge:
 *
 * - The pull request is open and changes exactly the files the Workflow writes. Anyone who
 *   pushes another file to the branch has turned it into a change a person reviews.
 * - Cloudflare's branch build on the head commit finished green. That build runs the deploy
 *   gate — lint, typecheck, the suite, the landmark audit — then a dry-run deploy, so green
 *   means `main` will still build with this file in it. A freeze that moves a pinned test is
 *   caught here, before `main`, which is where it would otherwise block every deploy.
 * - The merge is pinned to that head commit, so a push after the judgment is refused by GitHub.
 *
 * Anything else leaves the pull request open and fails the Workflow, which reports it.
 */
import type { GitHubCheckRun, GitHubPullRequestDetail, GitHubRepoClient } from "./repoClient";

/** The GitHub app Cloudflare's Workers Builds reports its check runs as. */
const WORKERS_BUILDS_APP = "cloudflare-workers-and-pages";

type BranchBuild = { state: "pending" } | { state: "passed" } | { state: "failed"; conclusion: string };

/** Pending until every Workers Builds run on the commit has completed; no run yet is pending too. */
export const judgeBranchBuild = (runs: GitHubCheckRun[]): BranchBuild => {
  const builds = runs.filter((run) => run.appSlug === WORKERS_BUILDS_APP);
  if (builds.length === 0 || builds.some((run) => run.status !== "completed")) return { state: "pending" };
  const failed = builds.find((run) => run.conclusion !== "success");
  return failed ? { state: "failed", conclusion: failed.conclusion ?? "unknown" } : { state: "passed" };
};

export const readBranchBuild = async (client: GitHubRepoClient, number: number): Promise<BranchBuild> => {
  const pullRequest = await client.getPullRequest(number);
  return judgeBranchBuild(await client.listCheckRuns(pullRequest.headSha));
};

type DataPullRequestMergeResult = { merged: true; alreadyMerged: boolean } | { merged: false; reason: string };

/**
 * Merges the pull request if every condition above holds, and says why not otherwise. Never
 * merges on a pending build: the caller waits for the build before asking.
 */
export const mergeDataPullRequest = async ({
  client,
  number,
  paths,
  title,
}: {
  client: GitHubRepoClient;
  number: number;
  /** Every path the Workflow writes. The pull request must change these and nothing else. */
  paths: string[];
  title: string;
}): Promise<DataPullRequestMergeResult> => {
  const pullRequest: GitHubPullRequestDetail = await client.getPullRequest(number);
  if (pullRequest.merged) return { merged: true, alreadyMerged: true };
  if (!pullRequest.open) return { merged: false, reason: `${pullRequest.html_url} was closed without merging` };

  const files = await client.listPullRequestFiles(number);
  const unexpected = files.filter((file) => !paths.includes(file));
  if (files.length === 0 || unexpected.length > 0) {
    const what = files.length === 0 ? "no files" : unexpected.join(", ");
    return { merged: false, reason: `${pullRequest.html_url} changes ${what} beyond its data file; left open for review` };
  }

  const build = judgeBranchBuild(await client.listCheckRuns(pullRequest.headSha));
  if (build.state !== "passed") {
    const what = build.state === "pending" ? "has not finished" : `ended ${build.conclusion}`;
    return { merged: false, reason: `the branch build for ${pullRequest.html_url} ${what}; left open for review` };
  }

  await client.mergePullRequest(number, { sha: pullRequest.headSha, title });
  return { merged: true, alreadyMerged: false };
};
