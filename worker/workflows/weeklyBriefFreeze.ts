/**
 * WeeklyBriefFreezeWorkflow — records this week's brief into the citable archive.
 *
 * The binding exists in every environment; the Monday cron starts an instance wherever
 * WHETHER_BRIEF_FREEZE_WORKFLOW=1, today the preview lane. It replaces the scheduled routine
 * that ran `scripts/freezeWeeklyBrief.ts` in a sandbox whose egress proxy denies FRED: every
 * one of those runs failed before it had a week to write, and the archive that is meant to
 * prove weekly cadence stayed at one entry. Nothing here merges anything — the output is a
 * pull request a person reads.
 *
 * Written to be promoted without a sequencing rule. Production reaches this code the moment
 * the flag is set, and GITHUB_TOKEN is a secret set separately, so the two can arrive in
 * either order: the missing one is refused at the first line of `freeze` and named in the
 * `brief-freeze` row, rather than discovered after a live read and five hourly retries.
 *
 * The first step is the one that used to fail, so it is the one with the patient retry: if
 * the live read is not publishable yet — fallback data, a stale record date — the step
 * throws and the platform tries again an hour later, up to five times, which no cron step
 * bounded to sixty seconds could do. The remaining steps are the same GitHub sequence the
 * regime-history Workflow uses, with the same reasons for reading the base branch at run time.
 */
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { installBindings } from "../bindings";
import { writeAnalytics } from "../../lib/telemetry/analyticsEngine";
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

    const startedAt = Date.now();
    try {
      const result = await this.freeze(event, step);
      /*
       * The trial could not conclude without this. The cron records that it
       * *started* a workflow and nothing recorded what the workflow did, so the
       * trust page's "Scheduled runs" showed a green Monday row whether the week
       * was frozen, refused as stale, or retried for five hours and gave up. A
       * step that reports success for work it did not observe is worse than one
       * that reports nothing, because it is read as evidence.
       */
      writeAnalytics(
        "cron-step",
        { step: "brief-freeze", ok: true, detail: result.opened ? "pull request opened" : result.reason, durationMs: Date.now() - startedAt },
        { doubles: [1, Date.now() - startedAt] },
      );
      return result;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      writeAnalytics(
        "cron-step",
        { step: "brief-freeze", ok: false, error: error instanceof Error ? error.message : "Unknown error", durationMs },
        { doubles: [0, durationMs] },
      );
      throw error;
    }
  }

  /**
   * The live read, as a seam.
   *
   * A test needs to drive the outcome reporting through both a refusal and a
   * missing token, and the alternative was `mock.module` on
   * `publishedBriefRecord` — which patches the registry process-wide and broke
   * `publishedBriefPullRequest.test.ts` the moment both files ran together, in
   * exactly the way docs/agents/lessons/automation-and-deploy-gate.md records. One overridable method costs less than a
   * suite that passes on ordering luck.
   */
  protected assembleWeek(): ReturnType<typeof assembleCurrentWeekBrief> {
    return assembleCurrentWeekBrief({ route: "workflow:brief-freeze" });
  }

  private async freeze(
    event: WorkflowEvent<WeeklyBriefFreezeWorkflowParams>,
    step: WorkflowStep,
  ): Promise<OpenPublishedBriefPullRequestResult> {
    /*
     * Checked before any work, not between the read and the pull request.
     *
     * Fail loudly either way: a workflow that cannot open its pull request has not done
     * its job, and a silent skip is what left the archive at one week with nothing on
     * /trust to say so. But the order matters once the flag is on in production, where
     * the token is a secret an operator sets separately. Below the assemble step, a
     * missing token costs a live provider read and — when the data is not publishable
     * yet — five hourly retries, so the run reports "gave up after five hours" at 7pm
     * for a fact that was true at 2pm. Above it, the failing `brief-freeze` row names
     * the missing secret within seconds of the hand-off.
     */
    const token = this.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GITHUB_TOKEN is not configured; the week cannot be recorded in the repository");
    }

    const assembled = await step.do("assemble this week's brief from live data", { retries: ASSEMBLE_RETRIES }, async () => {
      const result = await this.assembleWeek();
      if (!result.ok) {
        throw new Error(`not ready to publish: ${result.reason}`);
      }
      return { record: result.record, slug: result.slug };
    });

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
