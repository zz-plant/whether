import { handleImageOptimization } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { refreshOperatingState } from "../lib/operatingState/refreshOperatingState";
import { writeAnalytics } from "../lib/telemetry/analyticsEngine";
import { installWaitUntil } from "../lib/runtime/backgroundWork";
import { withDeadline } from "../lib/withDeadline";
import { sendWeeklyBrief } from "../lib/email/sendWeeklyBrief";
import { deliverSlackBrief } from "../lib/slack/deliverSlackBrief";
import { captureAndStoreBriefScreenshot } from "../lib/export/briefScreenshot";
import { checkRegimeChange } from "../lib/alert/checkRegimeChange";
import { runScheduledAlertDelivery } from "../lib/alert/alertDelivery";
import { runMonthEndPulse } from "../lib/alert/monthEndPulse";
import { refreshMonthlyRegimeHistory } from "../lib/summary/refreshMonthlyRegimeHistory";
import { recordActivationFunnel } from "../lib/telemetry/recordActivationFunnel";
import { sendOpsFailureNotice, type FailedStep } from "../lib/delivery/opsNotice";
import { WHETHER_AGENT_MANIFEST_PATH } from "../lib/agent/discovery";
import { withSpeculationRules } from "../lib/runtime/speculationRules";
import { negotiateMarkdown, withAgentDiscoveryLinks } from "../lib/runtime/agentResponse";
import {
  agentManifestResponse,
  WEBMCP_MANIFEST_PATH,
  MCP_WELL_KNOWN_PATH,
} from "../lib/agentManifest";
import { installBindings } from "./bindings";

/* Durable Object and Workflow classes must be exported from the Worker entry to exist.
   Declared in every environment so one migration list serves all of them, switched on per
   environment by their vars: the ingest coordinator and both workflows are in production
   (WHETHER_INGEST_COORDINATOR, WHETHER_HISTORY_WORKFLOW, WHETHER_BRIEF_FREEZE_WORKFLOW);
   the design-scratch flags remain preview-only. */
export { IngestCoordinator } from "./ingestCoordinator";
export { RegimeHistoryRefreshWorkflow } from "./workflows/regimeHistoryRefresh";
export { WeeklyBriefFreezeWorkflow } from "./workflows/weeklyBriefFreeze";

interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
  EMAIL?: {
    send(msg: {
      to: string;
      from: { email: string; name: string };
      subject: string;
      html: string;
      text: string;
    }): Promise<unknown>;
  };
  WHETHER_CRON_SECRET?: string;
  /* Slack app signing secret. Read by lib/api/slackSignature.ts off globalThis; without it
     the interactive-actions webhook answers 503 in production. */
  SLACK_SIGNING_SECRET?: string;
  SITE_URL?: string;
  /* Data-provider secrets. Read by lib/fred.ts and lib/saasMultiples.ts off globalThis;
     absent, both stay on the keyless paths they have always used. */
  FRED_API_KEY?: string;
  ALPHA_VANTAGE_API_KEY?: string;
  /* Trial infrastructure (see the exports above). The bindings are typed loosely on purpose:
     lib code reaches them through globalThis with structural checks, never through these types. */
  INGEST_COORDINATOR?: unknown;
  WHETHER_INGEST_COORDINATOR?: string;
  REGIME_HISTORY_WORKFLOW?: { create(options?: { id?: string; params?: unknown }): Promise<unknown> };
  WHETHER_HISTORY_WORKFLOW?: string;
  BRIEF_FREEZE_WORKFLOW?: { create(options?: { id?: string; params?: unknown }): Promise<unknown> };
  WHETHER_BRIEF_FREEZE_WORKFLOW?: string;
  GITHUB_TOKEN?: string;
  GITHUB_REPOSITORY?: string;
  WHETHER_DURABLE_KV: { get(key: string): Promise<string | null>; put(key: string, value: string): Promise<void> };
  /* Read by lib/runtime/versionMetadata.ts so /api/health can name the running build. */
  CF_VERSION_METADATA?: { id: string; tag: string; timestamp: string };
}

type ScheduledEvent = { cron: string; scheduledTime: number; type: "scheduled" };
type ExecutionContext = { waitUntil(promise: Promise<unknown>): void; passThroughOnException(): void };

const CRON_STEP_TIMEOUT_MS = 60_000;

/**
 * One `cron-step` row, the stream /trust's run history reads (lib/telemetry/runHistory.ts).
 * The stream name stays on the call's first line: tests/telemetryStreamReachability.test.ts
 * finds a stream's producer by reading `writeAnalytics("<stream>"` out of the source.
 */
const recordCronStep = (label: string, outcome: { ok: boolean; error?: string }, durationMs: number) => {
  writeAnalytics("cron-step", { step: label, ok: outcome.ok, error: outcome.error, durationMs }, {
    doubles: [outcome.ok ? 1 : 0, durationMs],
  });
};

/**
 * Cron steps are independent: a failing ingest should not silently cancel the weekly
 * email and alert delivery that follow it. Each step is a direct library call (no
 * self-fetch through the public edge), bounded by a wall-clock deadline, and its
 * outcome is logged rather than thrown, so one bad dependency degrades a single step.
 */
const runCronStep = async (
  label: string,
  step: () => Promise<{ ok: boolean; error?: string }>,
): Promise<{ ok: boolean; error?: string }> => {
  const startTime = Date.now();
  try {
    const result = await withDeadline(step(), CRON_STEP_TIMEOUT_MS, `cron:${label}`);
    recordCronStep(label, result, Date.now() - startTime);
    if (!result.ok) {
      console.error(`[cron] ${label} failed`, result.error);
    }
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    recordCronStep(label, { ok: false, error: errorMessage }, Date.now() - startTime);
    console.error(`[cron] ${label} failed`, error);
    return { ok: false, error: errorMessage };
  }
};

export default {
  async scheduled(event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    installBindings(env);

    const isDailyIngestion = event.cron === "0 2 * * *";

    /* Every failed step on this run, for the one notice the owner gets at the end of it. */
    const failures: FailedStep[] = [];
    const step = async (label: string, run: () => Promise<{ ok: boolean; error?: string }>) => {
      const outcome = await runCronStep(label, run);
      if (!outcome.ok) failures.push({ step: label, error: outcome.error });
    };

    /* Always refresh operating state to KV with fresh signals. Recorded through the same
       writer as every other step so the trust page's run history shows the ingest itself,
       not only what ran after it. It is not a runCronStep: its result feeds the steps below,
       it never throws (refreshOperatingState returns its failures), and it has no 60s
       deadline, because a forced ingest of every family may legitimately take longer and
       cutting it would cancel the week's sends rather than delay them. */
    const refreshStartedAt = Date.now();
    const refreshResult = await refreshOperatingState({ forceIngest: true });
    recordCronStep(
      "refresh-operating-state",
      { ok: refreshResult.ok, error: refreshResult.ok ? undefined : refreshResult.error },
      Date.now() - refreshStartedAt,
    );
    if (!refreshResult.ok) {
      console.error("[cron] refreshOperatingState failed", refreshResult.error);
      failures.push({ step: "refresh-operating-state", error: refreshResult.error });
    }

    const snapshot = refreshResult.ok ? refreshResult.snapshot : null;
    const weeklyCall = refreshResult.ok ? refreshResult.weeklyCall : null;
    const previousSnapshot = refreshResult.ok ? refreshResult.previousSnapshot : null;

    /* Both crons evaluate bounded-rule tripwires against the fresh signals, so a
       regime flip or threshold crossing pushes the day it lands instead of waiting
       for Monday. Both checks are transition-based (KV last-known state), so
       daily runs stay silent unless something actually crossed. A flash — an
       emergency-sized move in the short rate or the curve between two reads — is
       judged against the previous snapshot for the same reason (lib/alert/flashMoves.ts).
       The brief email remains weekly-only — the cadence promise is weekly; only
       rule firings break cadence. */
    if (!isDailyIngestion && snapshot && weeklyCall) {
      await step("email/send-weekly", () => sendWeeklyBrief({ snapshot, weeklyCall }));

      /* The weekly call as rendered, for the Slack post's image block. Unconfigured is a
         skip and a failure is logged; either way the post below still goes out as text. */
      let briefImageUrl: string | undefined;
      await step("artifact/brief-screenshot", async () => {
        const result = await captureAndStoreBriefScreenshot({ recordDate: snapshot.recordDate });
        briefImageUrl = result.imageUrl;
        return { ok: result.ok, error: result.error };
      });
      await step("slack/deliver-brief", () =>
        deliverSlackBrief({ snapshot, imageUrl: briefImageUrl }),
      );
    }

    // Records the month in progress from the assessment the read path just computed, so the
    // regime history gains months between deploys instead of waiting for a generator run
    // and a merged pull request.
    await step("summary-history", async () => {
      const result = await refreshMonthlyRegimeHistory();
      return { ok: result.ok, error: result.error };
    });

    /* Month-end pulse, judged after the month-in-progress record above so the
       comparison has the current month to work with. Fires once per month, and
       only when the reading differs from the prior month-end: a quiet month-end
       records the pulse and sends nothing. Safe to run daily — the KV last-
       pulsed gate makes a re-run within the month a no-op. */
    if (snapshot && weeklyCall) {
      await step("month-end-pulse", async () => {
        const result = await runMonthEndPulse({ snapshot, weeklyCall });
        return { ok: result.ok, error: result.error };
      });
    }

    /* Monday only, and only where the trial is on: start the Workflow that turns the KV month
       in progress into a pull request. It runs on its own (retried steps, its own log), so the
       cron only has to hand it off. */
    if (!isDailyIngestion && env.WHETHER_HISTORY_WORKFLOW === "1" && env.REGIME_HISTORY_WORKFLOW) {
      const workflow = env.REGIME_HISTORY_WORKFLOW;
      await step("regime-history-workflow", async () => {
        await workflow.create({ id: `regime-history-${new Date().toISOString().slice(0, 10)}`, params: { base: "main" } });
        return { ok: true };
      });
    }

    /* Monday only, where the trial is on: freeze this week's brief into the citable archive
       behind a pull request. The Workflow retries the live read hourly when the data is not
       publishable yet, which the sandboxed routine it replaces never got far enough to need —
       every one of its runs failed at the egress proxy before reaching FRED. */
    if (!isDailyIngestion && env.WHETHER_BRIEF_FREEZE_WORKFLOW === "1" && env.BRIEF_FREEZE_WORKFLOW) {
      const workflow = env.BRIEF_FREEZE_WORKFLOW;
      /* Named for what it measures: handing the workflow to Cloudflare. Whether the
         week was actually frozen is a separate `brief-freeze` row the workflow
         writes itself, because this one is green the moment `create()` resolves. */
      await step("brief-freeze-start", async () => {
        await workflow.create({ id: `brief-freeze-${new Date().toISOString().slice(0, 10)}`, params: { base: "main" } });
        return { ok: true };
      });
    }

    /* The week's activation funnel, recorded so the "which step is leaking" question
       `ROADMAP.md` puts first has an answer that does not require running a credentialed
       script by hand. Monday only, because the unit is an ISO week and a daily re-run
       would keep rewriting a week that is still running. Writes nothing when the read is
       unconfigured, so absent credentials never overwrite last week's counts with zeros. */
    if (!isDailyIngestion) {
      await step("activation-funnel", async () => {
        const result = await recordActivationFunnel();
        return { ok: result.ok, error: result.error };
      });
    }

    if (snapshot && weeklyCall) {
      await step("check-regime-change", () => checkRegimeChange({ snapshot, weeklyCall, previousSnapshot }));
      await step("alert-deliveries", async () => {
        const result = await runScheduledAlertDelivery({ snapshot, weeklyCall, previousSnapshot });
        return { ok: result.errors === 0, error: result.errors > 0 ? `${result.errors} delivery errors` : undefined };
      });
    }

    /* Last, so it covers every step above. Recorded like a step but never added to the list
       it reports on: a notice that failed is on /trust, and there is nobody else to tell. */
    const noticeStartedAt = Date.now();
    const notice = await sendOpsFailureNotice({
      run: `${isDailyIngestion ? "Daily 02:00 UTC run" : "Monday 14:00 UTC run"}, ${new Date(event.scheduledTime).toISOString().slice(0, 10)}`,
      failures,
    });
    if (!notice.ok || notice.sent) {
      recordCronStep("ops-notice", notice, Date.now() - noticeStartedAt);
    }
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    /* Lets library code detach work (e.g. background signal refresh) past the response.
     * Installed per-request on globalThis; concurrent requests in one isolate may hand
     * work to a sibling ctx, which Workers keeps alive just the same. */
    installWaitUntil(ctx.waitUntil.bind(ctx));

    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES
            .input(body)
            .transform(width > 0 ? { width } : {})
            .output({ format, quality });

          return result.response();
        },
      });
    }

    installBindings(env);

    /* Served here rather than from `app/`: vinext enumerates App Router files with
       Node's `glob`, where `*` skips a leading dot, so a route under `app/.well-known/`
       is never registered and the request falls through to the app shell, which answers
       with the HTML page rather than the manifest.
       See lib/agentManifest.ts. installBindings must run first — the manifest reads
       SITE_URL through resolveSiteUrl. Supports standard agent, WebMCP, and MCP paths. */
    if (
      url.pathname === WHETHER_AGENT_MANIFEST_PATH ||
      url.pathname === WEBMCP_MANIFEST_PATH ||
      url.pathname === MCP_WELL_KNOWN_PATH
    ) {
      return agentManifestResponse();
    }

    /* Markdown negotiation: an agent that asks for text/markdown at the homepage is
       served the Markdown brief instead of HTML (lib/runtime/agentResponse.ts).
       Browsers never send that Accept header, so no reader sees a difference. */
    const markdownRequest = negotiateMarkdown(request);
    const response = withSpeculationRules(
      withAgentDiscoveryLinks(await handler.fetch(markdownRequest ?? request, env, ctx)),
    );

    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader && /whether-(company-stage|company-runway|rate-sensitivity|ticker)=/.test(cookieHeader)) {
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "private, no-store");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return response;
  },
};
