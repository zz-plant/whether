/**
 * RegimeHistoryRefreshWorkflow — records the month in progress into the repository.
 *
 * Trial scope: the binding exists in every environment, but the Monday cron only starts an
 * instance where WHETHER_HISTORY_WORKFLOW=1 (the preview lane). Each step is retried and
 * observable in the Workflows dashboard, which is the property the scheduled routine lacked:
 * it failed at its PR step while reporting success. A run that cannot open its PR fails here.
 *
 * The work itself is in lib/summary/regimeHistoryPullRequest.ts, where bun tests can reach it;
 * this class only sequences it into durable steps.
 */
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { GitHubRepoClient } from "../../lib/github/repoClient";
import type { KvNamespace } from "../../lib/runtime/kv";
import {
  buildRegimeHistoryFileUpdate,
  openRegimeHistoryPullRequest,
  readStoredMonthlyRegimeHistory,
  type OpenRegimeHistoryPullRequestResult,
} from "../../lib/summary/regimeHistoryPullRequest";

export type RegimeHistoryWorkflowEnv = {
  WHETHER_DURABLE_KV: Pick<KvNamespace, "get">;
  GITHUB_TOKEN?: string;
  GITHUB_REPOSITORY?: string;
};

export type RegimeHistoryWorkflowParams = {
  /** Base branch for the pull request. Defaults to main. */
  base?: string;
};

export const DEFAULT_GITHUB_REPOSITORY = "zz-plant/whether";

export class RegimeHistoryRefreshWorkflow extends WorkflowEntrypoint<RegimeHistoryWorkflowEnv, RegimeHistoryWorkflowParams> {
  async run(event: WorkflowEvent<RegimeHistoryWorkflowParams>, step: WorkflowStep): Promise<OpenRegimeHistoryPullRequestResult> {
    const stored = await step.do("read the month in progress from KV", () =>
      readStoredMonthlyRegimeHistory(this.env.WHETHER_DURABLE_KV),
    );

    const update = await step.do("merge it over the bundled series", async () => buildRegimeHistoryFileUpdate(stored));

    if (!update.changed) {
      return { opened: false, reason: "the bundled series already carries every month KV has" };
    }

    const token = this.env.GITHUB_TOKEN;
    if (!token) {
      // Fail loudly: a workflow that cannot open its pull request has not done its job.
      throw new Error("GITHUB_TOKEN is not configured; the regime history cannot be recorded in the repository");
    }

    return step.do(
      "open the pull request",
      { retries: { limit: 3, delay: "30 seconds", backoff: "exponential" } },
      () =>
        openRegimeHistoryPullRequest({
          client: new GitHubRepoClient({ token, repository: this.env.GITHUB_REPOSITORY ?? DEFAULT_GITHUB_REPOSITORY }),
          update,
          base: event.payload?.base ?? "main",
        }),
    );
  }
}
