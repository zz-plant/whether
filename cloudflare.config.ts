/**
 * The Worker's deployment configuration, read by `cf` and by the Cloudflare Vite plugin, and
 * through it by vinext's build and deploy (`@vinext/cloudflare` deploys with `cf` whenever this
 * file exists). It replaced `wrangler.toml` on 2026-11-03; `cf migrate` wrote the first draft.
 *
 * One Worker, `whether`, in two shapes. Production is every ordinary build. A Worker Preview is a
 * build with `isPreview` set (`cf previews deploy`, or `CLOUDFLARE_PREVIEW_BUILD=true` under
 * vinext); every pushed branch deploys one, at a public URL named after the branch. A Preview
 * inherits nothing from production: Cloudflare gives it its own Durable Object namespace and no
 * secrets, and its cron triggers never fire. What it does share unless told otherwise — KV,
 * Analytics Engine, rate-limit counters, Workflows — it gets its own of here, or does not get at
 * all, so branch code cannot write production data, start a production Workflow or send mail.
 * Until 2026-11-03 the preview shape was a separate `whether-preview` Worker that was never deployed.
 *
 * Secrets are not here. `cf` cannot set one yet, so they are still set with
 * `npx wrangler secret put <NAME> --name whether`; the runbook lists them.
 */
import { bindings, defineConfig, exports, triggers, type WorkerConfig } from "cf/config";

type Shape = "production" | "preview";

const RESOURCES = {
  production: {
    telemetryDataset: "whether_telemetry",
    durableKvId: "cb5c7f5947e94592b4127aa25fa8541d",
    cacheKvId: "2e843b0be3ef42e2a8a863b5e78b0fc4",
    subscribeRateLimitNamespace: "1001",
    publicWriteRateLimitNamespace: "1002",
  },
  preview: {
    telemetryDataset: "whether_telemetry_preview",
    // Created 2026-11-03: the id wrangler.toml named for this lane had never existed.
    durableKvId: "1597e1dc108f46d89ea45043483f4e4c",
    // Dedicated namespace: previews must not share (and poison) the production ISR/data cache.
    cacheKvId: "241a4b51d9aa4eab844ad103c3b78e74",
    subscribeRateLimitNamespace: "1101",
    publicWriteRateLimitNamespace: "1102",
  },
} as const;

const REGIME_HISTORY_WORKFLOW = "whether-regime-history-refresh";
const BRIEF_FREEZE_WORKFLOW = "whether-weekly-brief-freeze";

const buildWorker = (shape: Shape): WorkerConfig => {
  const resources = RESOURCES[shape];

  return {
    name: "whether",
    compatibilityDate: "2026-03-15",
    compatibilityFlags: ["nodejs_compat"],
    entrypoint: "./worker/index.ts",
    previewUrls: true,
    // Render close to the data, not the visitor: each request makes several sequential KV
    // round-trips (materialized model, event logs) plus upstream FRED calls, so Smart
    // Placement's latency profile beats edge placement for this Worker.
    placement: { mode: "smart" },
    // Invocation logs unsampled while we tune cost. Traces (open beta) give spans for every
    // handler invocation, external fetch and KV/DO operation: the evidence the read-deadline
    // and zero-writes invariants lacked in the 2026-08-30 to 2026-09-02 incidents. Spans move to
    // unified volume pricing on December 1, 2026; the sampling rate is the cost knob. Server
    // source maps come from vite.config.ts and `cf deploy` uploads what the build emits.
    observability: {
      enabled: true,
      headSamplingRate: 1,
      traces: { enabled: true, headSamplingRate: 1 },
    },
    assets: { notFoundHandling: "none" },
    // Daily 02:00 UTC ingest, and the weekly send at 14:00 UTC Monday. Weekdays are written as
    // names: Cloudflare counts 1 = Sunday, so the "0 14 * * 1" this replaced sent the Monday
    // brief on Sundays from May to October 2026. tests/cronSchedule.test.ts rejects a numeric
    // weekday, and worker/index.ts treats exactly "0 2 * * *" as the daily run. Cron triggers
    // target production only, so a Preview declares none.
    triggers:
      shape === "production"
        ? [triggers.scheduled({ schedule: "0 2 * * *" }), triggers.scheduled({ schedule: "0 14 * * MON" })]
        : [],
    env: {
      NEXT_PUBLIC_SITE_URL: bindings.text("https://whether.work"),
      WHETHER_INGEST_COORDINATOR: bindings.text("1"),
      GITHUB_REPOSITORY: bindings.text("zz-plant/whether"),
      ...(shape === "production"
        ? {
            WHETHER_HISTORY_WORKFLOW: bindings.text("1"),
            WHETHER_BRIEF_FREEZE_WORKFLOW: bindings.text("1"),
            // Both data Workflows merge their own pull request once Cloudflare's branch build of
            // it is green and it changes only their data files (lib/github/dataPullRequestMerge.ts).
            // "0" hands the merge back to a person without a code change.
            WHETHER_AUTOMERGE_DATA_PRS: bindings.text("1"),
            EMAIL: bindings.sendEmail({}),
            // A Preview's Workflow binding would start the production Workflow, which runs
            // production's code against production's bindings; previews get none.
            REGIME_HISTORY_WORKFLOW: bindings.workflow({
              name: REGIME_HISTORY_WORKFLOW,
              worker: "whether",
              exportName: "RegimeHistoryRefreshWorkflow",
            }),
            BRIEF_FREEZE_WORKFLOW: bindings.workflow({
              name: BRIEF_FREEZE_WORKFLOW,
              worker: "whether",
              exportName: "WeeklyBriefFreezeWorkflow",
            }),
          }
        : {
            // The dataset this shape writes, so the trust page's run history reads its own runs
            // back (lib/telemetry/runHistory.ts). Production reads the default.
            WHETHER_TELEMETRY_DATASET: bindings.text(resources.telemetryDataset),
            // Design-scratch routes under /mockups; production leaves this unset, so they 404 there.
            WHETHER_ENABLE_MOCKUPS: bindings.text("1"),
          }),
      // Telemetry streams (lib/telemetry/analyticsEngine.ts is the single write path). Datasets
      // are created on first write.
      ANALYTICS: bindings.analyticsEngineDataset({ name: resources.telemetryDataset }),
      // Regime alerts, decision events and memory, alert preferences, posture events and
      // ingestion snapshots (lib/runtime/kv.ts). Local dev simulates both namespaces; the
      // `preview_id`s wrangler.toml carried were for `wrangler dev --remote` and were not migrated.
      WHETHER_DURABLE_KV: bindings.kv({ id: resources.durableKvId }),
      // Vinext ISR / data cache (fetch, "use cache", unstable_cache): vite.config.ts's cache.data adapter.
      VINEXT_KV_CACHE: bindings.kv({ id: resources.cacheKvId }),
      // Each Preview gets its own namespace for this class, created by Cloudflare.
      INGEST_COORDINATOR: bindings.durableObject({ worker: "whether", exportName: "IngestCoordinator" }),
      IMAGES: bindings.images({}),
      // The deployed version (id, tag, timestamp), so /api/health can name the running build.
      CF_VERSION_METADATA: bindings.versionMetadata(),
      // lib/runtime/rateLimit.ts. Counters are per key per location and eventually consistent:
      // abuse control, not accounting. The subscribe limiter fronts every path that sends a
      // verification email; the public-write limiter the browser telemetry intake and the
      // per-ticker quote proxy. A namespace is account-wide, hence a separate one for previews.
      WHETHER_SUBSCRIBE_RATE_LIMITER: bindings.rateLimit({
        namespace: resources.subscribeRateLimitNamespace,
        simple: { limit: 5, period: 60 },
      }),
      WHETHER_PUBLIC_WRITE_RATE_LIMITER: bindings.rateLimit({
        namespace: resources.publicWriteRateLimitNamespace,
        simple: { limit: 60, period: 60 },
      }),
      ASSETS: bindings.assets(),
    },
    exports: {
      // Live since wrangler.toml's migration v1 (`new_sqlite_classes`). This declaration replaces
      // that migration history: it names the class as it stands, so it must stay SQLite-backed.
      IngestCoordinator: exports.durableObject({ storage: "sqlite" }),
      ...(shape === "production"
        ? {
            RegimeHistoryRefreshWorkflow: exports.workflow({ name: REGIME_HISTORY_WORKFLOW }),
            WeeklyBriefFreezeWorkflow: exports.workflow({ name: BRIEF_FREEZE_WORKFLOW }),
          }
        : {}),
    },
  };
};

export default defineConfig((ctx) => ({ worker: buildWorker(ctx.isPreview ? "preview" : "production") }));
