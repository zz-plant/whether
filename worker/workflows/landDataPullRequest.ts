/**
 * The last steps of both data Workflows where WHETHER_AUTOMERGE_DATA_PRS=1: wait for
 * Cloudflare's build of the pull request's branch, then merge it if
 * lib/github/dataPullRequestMerge.ts allows. Durable steps, so a wait of most of an hour costs
 * nothing between checks and survives an isolate eviction.
 *
 * A pull request that cannot be merged is left open and the Workflow fails with the reason,
 * which is what puts it in front of a person: the failing outcome row on /trust and the
 * owner's failure notice.
 */
import type { WorkflowStep } from "cloudflare:workers";
import type { GitHubRepoClient } from "../../lib/github/repoClient";
import { mergeDataPullRequest, readBranchBuild } from "../../lib/github/dataPullRequestMerge";

/** The branch build is queued by the push that opened the pull request; give it time to register. */
const BUILD_START_DELAY = "5 minutes";
/** The deploy gate and a dry-run deploy take under ten minutes; this allows the build to queue behind another for most of an hour. */
const BUILD_WAIT_RETRIES = { limit: 9, delay: "5 minutes", backoff: "constant" as const };
const GITHUB_RETRIES = { limit: 3, delay: "30 seconds", backoff: "exponential" as const };

export const isDataPullRequestAutoMergeOn = (env: { WHETHER_AUTOMERGE_DATA_PRS?: unknown }) =>
  env.WHETHER_AUTOMERGE_DATA_PRS === "1";

export const landDataPullRequest = async ({
  step,
  client,
  number,
  paths,
  title,
}: {
  step: WorkflowStep;
  client: GitHubRepoClient;
  number: number;
  paths: string[];
  title: string;
}): Promise<void> => {
  await step.sleep("give the branch build time to start", BUILD_START_DELAY);

  await step.do("wait for the branch build", { retries: BUILD_WAIT_RETRIES }, async () => {
    const build = await readBranchBuild(client, number);
    if (build.state === "pending") throw new Error("the branch build has not finished");
    return build.state;
  });

  const result = await step.do("merge the pull request", { retries: GITHUB_RETRIES }, () =>
    mergeDataPullRequest({ client, number, paths, title }),
  );
  if (!result.merged) throw new Error(result.reason);
};
