/**
 * The Worker's deployment configuration, read by `cf` and by the Cloudflare Vite plugin, and
 * through it by vinext's build and deploy (`@vinext/cloudflare` deploys with `cf` whenever this
 * file exists). It replaced `wrangler.toml` on 2026-11-03; `cf migrate` wrote the first draft.
 *
 * Two lanes. Production is the default mode (`cf build` and `cf deploy` run Vite in its
 * `production` mode, `cf dev` in `development`; both fall through to it). `--mode preview` is the
 * `whether-preview` Worker, with its own KV namespaces, telemetry dataset and rate-limit counters.
 * That Worker has never been deployed (docs/agents/lessons/automation-and-deploy-gate.md); the
 * branch build validates it with a dry run.
 *
 * Secrets are not here. `cf` cannot set one yet, so they are still set with
 * `npx wrangler secret put <NAME> --name whether`; the runbook lists them.
 */
import { bindings, defineConfig, exports, triggers, type WorkerConfig } from "cf/config";

type Lane = "production" | "preview";

const LANES = {
  production: {
    name: "whether",
    telemetryDataset: "whether_telemetry",
    durableKvId: "cb5c7f5947e94592b4127aa25fa8541d",
    cacheKvId: "2e843b0be3ef42e2a8a863b5e78b0fc4",
    subscribeRateLimitNamespace: "1001",
    publicWriteRateLimitNamespace: "1002",
    workflowSuffix: "",
  },
  preview: {
    name: "whether-preview",
    telemetryDataset: "whether_telemetry_preview",
    durableKvId: "d116663399244346bd302324b485e8f3",
    // Dedicated namespace: preview deploys must not share (and poison) the production ISR/data cache.
    cacheKvId: "241a4b51d9aa4eab844ad103c3b78e74",
    subscribeRateLimitNamespace: "1101",
    publicWriteRateLimitNamespace: "1102",
    workflowSuffix: "-preview",
  },
} as const;

const buildWorker = (lane: Lane): WorkerConfig => {
  const settings = LANES[lane];
  const regimeHistoryWorkflow = `whether-regime-history-refresh${settings.workflowSuffix}`;
  const briefFreezeWorkflow = `whether-weekly-brief-freeze${settings.workflowSuffix}`;

  return {
    name: settings.name,
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
    // weekday, and worker/index.ts treats exactly "0 2 * * *" as the daily run.
    triggers: [triggers.scheduled({ schedule: "0 2 * * *" }), triggers.scheduled({ schedule: "0 14 * * MON" })],
    env: {
      NEXT_PUBLIC_SITE_URL: bindings.text("https://whether.work"),
      WHETHER_INGEST_COORDINATOR: bindings.text("1"),
      WHETHER_HISTORY_WORKFLOW: bindings.text("1"),
      WHETHER_BRIEF_FREEZE_WORKFLOW: bindings.text("1"),
      GITHUB_REPOSITORY: bindings.text("zz-plant/whether"),
      ...(lane === "production"
        ? {
            // Both data Workflows merge their own pull request once Cloudflare's branch build of
            // it is green and it changes only their data files (lib/github/dataPullRequestMerge.ts).
            // "0" hands the merge back to a person without a code change.
            WHETHER_AUTOMERGE_DATA_PRS: bindings.text("1"),
            EMAIL: bindings.sendEmail({}),
          }
        : {
            // The dataset this lane writes, so the trust page's run history reads its own lane
            // back (lib/telemetry/runHistory.ts). Production reads the default.
            WHETHER_TELEMETRY_DATASET: bindings.text(settings.telemetryDataset),
            // Design-scratch routes under /mockups; production leaves this unset, so they 404 there.
            WHETHER_ENABLE_MOCKUPS: bindings.text("1"),
          }),
      // Telemetry streams (lib/telemetry/analyticsEngine.ts is the single write path). Datasets
      // are created on first write.
      ANALYTICS: bindings.analyticsEngineDataset({ name: settings.telemetryDataset }),
      // Regime alerts, decision events and memory, alert preferences, posture events and
      // ingestion snapshots (lib/runtime/kv.ts). Local dev simulates both namespaces; the
      // `preview_id`s wrangler.toml carried were for `wrangler dev --remote` and were not migrated.
      WHETHER_DURABLE_KV: bindings.kv({ id: settings.durableKvId }),
      // Vinext ISR / data cache (fetch, "use cache", unstable_cache): vite.config.ts's cache.data adapter.
      VINEXT_KV_CACHE: bindings.kv({ id: settings.cacheKvId }),
      INGEST_COORDINATOR: bindings.durableObject({ worker: settings.name, exportName: "IngestCoordinator" }),
      REGIME_HISTORY_WORKFLOW: bindings.workflow({
        name: regimeHistoryWorkflow,
        worker: settings.name,
        exportName: "RegimeHistoryRefreshWorkflow",
      }),
      BRIEF_FREEZE_WORKFLOW: bindings.workflow({
        name: briefFreezeWorkflow,
        worker: settings.name,
        exportName: "WeeklyBriefFreezeWorkflow",
      }),
      IMAGES: bindings.images({}),
      // The deployed version (id, tag, timestamp), so /api/health can name the running build.
      CF_VERSION_METADATA: bindings.versionMetadata(),
      // lib/runtime/rateLimit.ts. Counters are per key per location and eventually consistent:
      // abuse control, not accounting. The subscribe limiter fronts every path that sends a
      // verification email; the public-write limiter the browser telemetry intake and the
      // per-ticker quote proxy. A namespace is account-wide, hence one per lane.
      WHETHER_SUBSCRIBE_RATE_LIMITER: bindings.rateLimit({
        namespace: settings.subscribeRateLimitNamespace,
        simple: { limit: 5, period: 60 },
      }),
      WHETHER_PUBLIC_WRITE_RATE_LIMITER: bindings.rateLimit({
        namespace: settings.publicWriteRateLimitNamespace,
        simple: { limit: 60, period: 60 },
      }),
      ASSETS: bindings.assets(),
    },
    exports: {
      // Live since wrangler.toml's migration v1 (`new_sqlite_classes`). This declaration replaces
      // that migration history: it names the class as it stands, so it must stay SQLite-backed.
      IngestCoordinator: exports.durableObject({ storage: "sqlite" }),
      RegimeHistoryRefreshWorkflow: exports.workflow({ name: regimeHistoryWorkflow }),
      WeeklyBriefFreezeWorkflow: exports.workflow({ name: briefFreezeWorkflow }),
    },
  };
};

export default defineConfig((ctx) => ({ worker: buildWorker(ctx.mode === "preview" ? "preview" : "production") }));
