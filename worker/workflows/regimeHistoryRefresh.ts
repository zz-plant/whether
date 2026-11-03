/**
 * RegimeHistoryRefreshWorkflow — rebuilds the regime archive from FRED and lands it behind a
 * pull request.
 *
 * Production scope: the binding exists in every environment, but the daily 02:00 UTC cron only
 * starts an instance where WHETHER_HISTORY_WORKFLOW=1 (production and the preview lane). Each
 * step is retried and observable in the Workflows dashboard, which is the property the
 * scheduled routine lacked: it failed at its PR step while reporting success, and from
 * 2026-09-21 the account's usage cap rejected it before it started. A run that cannot open its
 * PR fails here. Where WHETHER_AUTOMERGE_DATA_PRS=1 it also merges the PR once its branch build
 * is green (./landDataPullRequest.ts), and a PR it may not merge fails the run instead.
 *
 * The work itself is in lib/summary/regimeArchivePullRequest.ts, where bun tests can reach it;
 * this class only sequences it into durable steps. The rebuild is one step because its
 * intermediate files (11MB) cannot be a step's result (1MiB); a retry fetches and rebuilds
 * again, which costs about a second of CPU and six FRED requests.
 */
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { installBindings } from "../bindings";
import { GitHubRepoClient } from "../../lib/github/repoClient";
import { sendOpsFailureNotice } from "../../lib/delivery/opsNotice";
import { writeAnalytics } from "../../lib/telemetry/analyticsEngine";
import {
  commitRegimeArchiveRebuild,
  openRegimeArchivePullRequest,
  type RegimeArchiveCommitResult,
} from "../../lib/summary/regimeArchivePullRequest";
import { isDataPullRequestAutoMergeOn, landDataPullRequest } from "./landDataPullRequest";

type RegimeHistoryWorkflowEnv = {
  GITHUB_TOKEN?: string;
  GITHUB_REPOSITORY?: string;
  WHETHER_AUTOMERGE_DATA_PRS?: string;
};

type RegimeHistoryWorkflowParams = {
  /** Base branch for the pull request. Defaults to main. */
  base?: string;
  /** Land any change, not only on Tuesdays or for a new month-end: for a run started by hand. */
  landAnyChange?: boolean;
};

type RegimeHistoryWorkflowResult =
  | Extract<RegimeArchiveCommitResult, { committed: false }>
  | { committed: true; pullRequest: { number: number; html_url: string }; alreadyOpen: boolean; paths: string[] };

export const DEFAULT_GITHUB_REPOSITORY = "zz-plant/whether";

export class RegimeHistoryRefreshWorkflow extends WorkflowEntrypoint<RegimeHistoryWorkflowEnv, RegimeHistoryWorkflowParams> {
  async run(event: WorkflowEvent<RegimeHistoryWorkflowParams>, step: WorkflowStep): Promise<RegimeHistoryWorkflowResult> {
    /* The email binding the failure notice sends through reaches lib/ off globalThis. */
    installBindings(this.env);
    const startedAt = Date.now();
    try {
      const result = await this.refresh(event, step);
      writeAnalytics(
        "cron-step",
        {
          step: "regime-history",
          ok: true,
          detail: result.committed ? `pull request #${result.pullRequest.number}` : result.reason,
          durationMs: Date.now() - startedAt,
        },
        { doubles: [1, Date.now() - startedAt] },
      );
      return result;
    } catch (error) {
      /* Same two reports as the brief freeze: the cron's `regime-history-workflow` row is green
         once Cloudflare accepts the hand-off, so this is the row that knows how it ended. */
      const message = error instanceof Error ? error.message : "Unknown error";
      const durationMs = Date.now() - startedAt;
      writeAnalytics("cron-step", { step: "regime-history", ok: false, error: message, durationMs }, { doubles: [0, durationMs] });
      await sendOpsFailureNotice({ run: "Regime archive pull request", failures: [{ step: "regime-history", error: message }] });
      throw error;
    }
  }

  private async refresh(
    event: WorkflowEvent<RegimeHistoryWorkflowParams>,
    step: WorkflowStep,
  ): Promise<RegimeHistoryWorkflowResult> {
    const token = this.env.GITHUB_TOKEN;
    if (!token) {
      // Fail loudly: a workflow that cannot open its pull request has not done its job.
      throw new Error("GITHUB_TOKEN is not configured; the regime archive cannot be rebuilt into the repository");
    }

    const client = new GitHubRepoClient({ token, repository: this.env.GITHUB_REPOSITORY ?? DEFAULT_GITHUB_REPOSITORY });
    const base = event.payload?.base ?? "main";
    const landAnyChange = event.payload?.landAnyChange === true;
    const retries = { retries: { limit: 3, delay: "30 seconds", backoff: "exponential" as const } };

    const commit = await step.do("rebuild the archive from FRED and commit it", retries, () =>
      commitRegimeArchiveRebuild({ client, base, landAnyChange }),
    );
    if (!commit.committed) {
      return commit;
    }

    const opened = await step.do("open the pull request", retries, () => openRegimeArchivePullRequest({ client, commit, base }));
    if (isDataPullRequestAutoMergeOn(this.env)) {
      await landDataPullRequest({
        step,
        client,
        number: opened.pullRequest.number,
        paths: commit.paths,
        title: `chore: rebuild the regime archive from FRED (#${opened.pullRequest.number})`,
      });
    }
    return { committed: true, pullRequest: opened.pullRequest, alreadyOpen: opened.alreadyOpen, paths: commit.paths };
  }
}
