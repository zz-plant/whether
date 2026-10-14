/**
 * RegimeHistoryRefreshWorkflow — records the month in progress into the repository.
 *
 * Production scope: the binding exists in every environment, but the Monday cron only starts an
 * instance where WHETHER_HISTORY_WORKFLOW=1 (production and the preview lane). Each step is retried and
 * observable in the Workflows dashboard, which is the property the scheduled routine lacked:
 * it failed at its PR step while reporting success. A run that cannot open its PR fails here.
 * Where WHETHER_AUTOMERGE_DATA_PRS=1 it also merges the PR once its branch build is green
 * (./landDataPullRequest.ts), and a PR it may not merge fails the run instead.
 *
 * The work itself is in lib/summary/regimeHistoryPullRequest.ts, where bun tests can reach it;
 * this class only sequences it into durable steps.
 */
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { GitHubRepoClient } from "../../lib/github/repoClient";
import type { KvNamespace } from "../../lib/runtime/kv";
import {
  buildRegimeHistoryUpdateAgainstBase,
  openRegimeHistoryPullRequest,
  readStoredMonthlyRegimeHistory,
  REGIME_HISTORY_FILE_PATH,
  type OpenRegimeHistoryPullRequestResult,
} from "../../lib/summary/regimeHistoryPullRequest";
import { isDataPullRequestAutoMergeOn, landDataPullRequest } from "./landDataPullRequest";

type RegimeHistoryWorkflowEnv = {
  WHETHER_DURABLE_KV: Pick<KvNamespace, "get">;
  GITHUB_TOKEN?: string;
  GITHUB_REPOSITORY?: string;
  WHETHER_AUTOMERGE_DATA_PRS?: string;
};

type RegimeHistoryWorkflowParams = {
  /** Base branch for the pull request. Defaults to main. */
  base?: string;
};

export const DEFAULT_GITHUB_REPOSITORY = "zz-plant/whether";

export class RegimeHistoryRefreshWorkflow extends WorkflowEntrypoint<RegimeHistoryWorkflowEnv, RegimeHistoryWorkflowParams> {
  async run(event: WorkflowEvent<RegimeHistoryWorkflowParams>, step: WorkflowStep): Promise<OpenRegimeHistoryPullRequestResult> {
    const stored = await step.do("read the month in progress from KV", () =>
      readStoredMonthlyRegimeHistory(this.env.WHETHER_DURABLE_KV),
    );

    const token = this.env.GITHUB_TOKEN;
    if (!token) {
      // Fail loudly: a workflow that cannot open its pull request has not done its job.
      throw new Error("GITHUB_TOKEN is not configured; the regime history cannot be recorded in the repository");
    }

    const client = new GitHubRepoClient({ token, repository: this.env.GITHUB_REPOSITORY ?? DEFAULT_GITHUB_REPOSITORY });
    const base = event.payload?.base ?? "main";
    const retries = { retries: { limit: 3, delay: "30 seconds", backoff: "exponential" as const } };

    // The merge base is the file on the base branch as it stands now, never this
    // deployment's bundle: a preview built from an older commit must not undo main.
    const update = await step.do("merge it over the file on the base branch", retries, () =>
      buildRegimeHistoryUpdateAgainstBase({ client, base, stored }),
    );

    if (!update.changed) {
      return { opened: false, reason: `${base} already carries every month KV has` };
    }

    const opened = await step.do("open the pull request", retries, () => openRegimeHistoryPullRequest({ client, update, base }));
    if (opened.opened && isDataPullRequestAutoMergeOn(this.env)) {
      await landDataPullRequest({
        step,
        client,
        number: opened.pullRequest.number,
        paths: [REGIME_HISTORY_FILE_PATH],
        title: `chore: record the month in progress in the regime history (#${opened.pullRequest.number})`,
      });
    }
    return opened;
  }
}
