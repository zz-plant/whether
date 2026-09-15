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
import { refreshMonthlyRegimeHistory } from "../lib/summary/refreshMonthlyRegimeHistory";
import { WHETHER_AGENT_MANIFEST_PATH, agentManifestResponse } from "../lib/agentManifest";
import { installBindings } from "./bindings";

/* Durable Object and Workflow classes must be exported from the Worker entry to exist. All
   are trial infrastructure: declared everywhere, used only where the preview lane's vars
   switch them on (WHETHER_INGEST_COORDINATOR, WHETHER_HISTORY_WORKFLOW,
   WHETHER_BRIEF_FREEZE_WORKFLOW). */
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ScheduledEvent = { cron: string; scheduledTime: number; type: "scheduled" };
type ExecutionContext = { waitUntil(promise: Promise<unknown>): void; passThroughOnException(): void };

const CRON_STEP_TIMEOUT_MS = 60_000;

/**
 * Cron steps are independent: a failing ingest should not silently cancel the weekly
 * email and alert delivery that follow it. Each step is a direct library call (no
 * self-fetch through the public edge), bounded by a wall-clock deadline, and its
 * outcome is logged rather than thrown, so one bad dependency degrades a single step.
 */
const runCronStep = async (label: string, step: () => Promise<{ ok: boolean; error?: string }>) => {
  const startTime = Date.now();
  try {
    const result = await withDeadline(step(), CRON_STEP_TIMEOUT_MS, `cron:${label}`);
    const durationMs = Date.now() - startTime;
    writeAnalytics(
      "cron-step",
      { step: label, ok: result.ok, error: result.error, durationMs },
      { doubles: [result.ok ? 1 : 0, durationMs] },
    );
    if (!result.ok) {
      console.error(`[cron] ${label} failed`, result.error);
    }
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    writeAnalytics(
      "cron-step",
      { step: label, ok: false, error: errorMessage, durationMs },
      { doubles: [0, durationMs] },
    );
    console.error(`[cron] ${label} failed`, error);
  }
};

export default {
  async scheduled(event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    installBindings(env);

    const isDailyIngestion = event.cron === "0 2 * * *";

    /* Always refresh operating state to KV with fresh signals. Recorded like every other
       step so the trust page's run history (lib/telemetry/runHistory.ts) shows the ingest
       itself, not only what ran after it; its result feeds the steps below, which is why it
       is not a runCronStep. */
    const refreshStartedAt = Date.now();
    const refreshResult = await refreshOperatingState({ forceIngest: true });
    const refreshDurationMs = Date.now() - refreshStartedAt;
    writeAnalytics(
      "cron-step",
      {
        step: "refresh-operating-state",
        ok: refreshResult.ok,
        error: refreshResult.ok ? undefined : refreshResult.error,
        durationMs: refreshDurationMs,
      },
      { doubles: [refreshResult.ok ? 1 : 0, refreshDurationMs] },
    );
    if (!refreshResult.ok) {
      console.error("[cron] refreshOperatingState failed", refreshResult.error);
    }

    const snapshot = refreshResult.ok ? refreshResult.snapshot : null;
    const weeklyCall = refreshResult.ok ? refreshResult.weeklyCall : null;

    /* Both crons evaluate bounded-rule tripwires against the fresh signals, so a
       regime flip or threshold crossing pushes the day it lands instead of waiting
       for Monday. Both checks are transition-based (KV last-known state), so
       daily runs stay silent unless something actually crossed. The brief email
       remains weekly-only — the cadence promise is weekly; only rule firings
       break cadence. */
    if (!isDailyIngestion && snapshot && weeklyCall) {
      await runCronStep("email/send-weekly", () => sendWeeklyBrief({ snapshot, weeklyCall }));

      /* The weekly call as rendered, for the Slack post's image block. Unconfigured is a
         skip and a failure is logged; either way the post below still goes out as text. */
      let briefImageUrl: string | undefined;
      await runCronStep("artifact/brief-screenshot", async () => {
        const result = await captureAndStoreBriefScreenshot({ recordDate: snapshot.recordDate });
        briefImageUrl = result.imageUrl;
        return { ok: result.ok, error: result.error };
      });
      await runCronStep("slack/deliver-brief", () => deliverSlackBrief({ imageUrl: briefImageUrl }));
    }

    // Records the month in progress from the assessment the read path just computed, so the
    // regime history gains months between deploys instead of waiting for a generator run
    // and a merged pull request.
    await runCronStep("summary-history", async () => {
      const result = await refreshMonthlyRegimeHistory();
      return { ok: result.ok, error: result.error };
    });

    /* Monday only, and only where the trial is on: start the Workflow that turns the KV month
       in progress into a pull request. It runs on its own (retried steps, its own log), so the
       cron only has to hand it off. */
    if (!isDailyIngestion && env.WHETHER_HISTORY_WORKFLOW === "1" && env.REGIME_HISTORY_WORKFLOW) {
      const workflow = env.REGIME_HISTORY_WORKFLOW;
      await runCronStep("regime-history-workflow", async () => {
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
      await runCronStep("brief-freeze-workflow", async () => {
        await workflow.create({ id: `brief-freeze-${new Date().toISOString().slice(0, 10)}`, params: { base: "main" } });
        return { ok: true };
      });
    }

    if (snapshot && weeklyCall) {
      await runCronStep("check-regime-change", () => checkRegimeChange({ snapshot, weeklyCall }));
      await runCronStep("alert-deliveries", async () => {
        const result = await runScheduledAlertDelivery({ snapshot, weeklyCall });
        return { ok: result.errors === 0, error: result.errors > 0 ? `${result.errors} delivery errors` : undefined };
      });
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
       SITE_URL through resolveSiteUrl. */
    if (url.pathname === WHETHER_AGENT_MANIFEST_PATH) {
      return agentManifestResponse();
    }

    const response = await handler.fetch(request, env, ctx);

    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader && /whether-(company-stage|rate-sensitivity|ticker)=/.test(cookieHeader)) {
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
