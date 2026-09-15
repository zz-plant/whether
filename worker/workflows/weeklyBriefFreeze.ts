/**
 * WeeklyBriefFreezeWorkflow — records this week's brief into the citable archive.
 *
 * Trial scope: the binding exists in every environment, but the Monday cron only starts an
 * instance where WHETHER_BRIEF_FREEZE_WORKFLOW=1 (the preview lane). It replaces the
 * scheduled routine that ran `scripts/freezeWeeklyBrief.ts` in a sandbox whose egress proxy
 * denies FRED: every one of those runs failed before it had a week to write, and the archive
 * that is meant to prove weekly cadence stayed at one entry.
 *
 * The first step is the one that used to fail, so it is the one with the patient retry: if
 * the live read is not publishable yet — fallback data, a stale record date — the step
 * throws and the platform tries again an hour later, up to five times, which no cron step
 * bounded to sixty seconds could do. The remaining steps are the same GitHub sequence the
 * regime-history Workflow uses, with the same reasons for reading the base branch at run time.
 */
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { installBindings } from "../bindings";
import { GitHubRepoClient } from "../../lib/github/repoClient";
import { assembleCurrentWeekBrief } from "../../lib/report/publishedBriefRecord";
import {
  buildPublishedBriefUpdateAgainstBase,
  openPublishedBriefPullRequest,
  type OpenPublishedBriefPullRequestResult,
} from "../../lib/report/publishedBriefPullRequest";
import { DEFAULT_GITHUB_REPOSITORY } from "./regimeHistoryRefresh";

type WeeklyBriefFreezeWorkflowEnv = Record<string, unknown> & {
  GITHUB_TOKEN?: string;
  GITHUB_REPOSITORY?: string;
};

type WeeklyBriefFreezeWorkflowParams = {
  /** Base branch for the pull request. Defaults to main. */
  base?: string;
};

/** Five hourly attempts covers a data provider that is down for a Monday afternoon. */
const ASSEMBLE_RETRIES = { limit: 5, delay: "1 hour", backoff: "constant" as const };

export class WeeklyBriefFreezeWorkflow extends WorkflowEntrypoint<WeeklyBriefFreezeWorkflowEnv, WeeklyBriefFreezeWorkflowParams> {
  async run(
    event: WorkflowEvent<WeeklyBriefFreezeWorkflowParams>,
    step: WorkflowStep,
  ): Promise<OpenPublishedBriefPullRequestResult> {
    /* The report path reads KV and provider keys off globalThis; a Workflow instance may be
       the first thing to run in its isolate, so nothing has installed them yet. */
    installBindings(this.env);

    const assembled = await step.do("assemble this week's brief from live data", { retries: ASSEMBLE_RETRIES }, async () => {
      const result = await assembleCurrentWeekBrief({ route: "workflow:brief-freeze" });
      if (!result.ok) {
        throw new Error(`not ready to publish: ${result.reason}`);
      }
      return { record: result.record, slug: result.slug };
    });

    const token = this.env.GITHUB_TOKEN;
    if (!token) {
      // Fail loudly: a workflow that cannot open its pull request has not done its job.
      throw new Error("GITHUB_TOKEN is not configured; the week cannot be recorded in the repository");
    }

    const client = new GitHubRepoClient({ token, repository: this.env.GITHUB_REPOSITORY ?? DEFAULT_GITHUB_REPOSITORY });
    const base = event.payload?.base ?? "main";
    const retries = { retries: { limit: 3, delay: "30 seconds", backoff: "exponential" as const } };

    const update = await step.do("merge it over the archive on the base branch", retries, () =>
      buildPublishedBriefUpdateAgainstBase({ client, base, record: assembled.record }),
    );

    if (!update.changed) {
      return { opened: false, reason: `${base} already carries week ${assembled.slug}` };
    }

    return step.do("open the pull request", retries, () => openPublishedBriefPullRequest({ client, update, base }));
  }
}
