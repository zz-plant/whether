import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DEFAULT_MANIFEST_PATH = join(process.cwd(), "artifacts", "seo-payloads", "manifest.json");
const DEFAULT_OUTPUT_DIR = join(process.cwd(), "artifacts", "seo-refresh");
const DEFAULT_METRICS_PATH = join(DEFAULT_OUTPUT_DIR, "page-metrics.json");
const DEFAULT_STATUS_PATH = join(DEFAULT_OUTPUT_DIR, "status.json");
const DEFAULT_QUEUE_PATH = join(DEFAULT_OUTPUT_DIR, "queue.json");

const HOURS = 60 * 60 * 1000;

const readJsonOrDefault = async (filePath, defaultValue) => {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch {
    return defaultValue;
  }
};

const toTrafficTier = (metric) => {
  if (metric?.trafficTier === "high" || metric?.trafficTier === "medium" || metric?.trafficTier === "low") {
    return metric.trafficTier;
  }

  const entrances = Number(metric?.organicEntrances30d ?? 0);
  if (entrances >= 1000) return "high";
  if (entrances >= 250) return "medium";
  return "low";
};

const conversionTargetByTier = {
  high: 0.04,
  medium: 0.03,
  low: 0.02,
};

const PRUNE_REVIEW_STREAK_MIN = 3;
const PRUNE_REVIEW_CONVERSION_GAP = -0.015;

const toSlaState = ({ dueAtIso, nowIso, resolvedAtIso }) => {
  if (!dueAtIso) return "unknown";
  if (resolvedAtIso && resolvedAtIso >= dueAtIso) return "completed";

  const due = Date.parse(dueAtIso);
  const now = Date.parse(nowIso);
  if (Number.isNaN(due) || Number.isNaN(now)) return "unknown";

  if (now > due) return "overdue";
  if (due - now <= 24 * HOURS) return "due-soon";
  return "on-track";
};

const priorityToSlaHours = {
  p0: 24,
  p1: 72,
  p2: 168,
};

const computeSlaDueAtIso = ({ queueMeta, previousRequestedAtIso, nowIso }) => {
  if (!queueMeta.enqueue || !queueMeta.priority) return null;

  const requestedAtMs = Date.parse(previousRequestedAtIso ?? nowIso);
  const requestedAtBaseMs = Number.isNaN(requestedAtMs) ? Date.parse(nowIso) : requestedAtMs;

  return new Date(requestedAtBaseMs + priorityToSlaHours[queueMeta.priority] * HOURS).toISOString();
};

const buildQueueRecord = ({ page, metric, stale, conversionRate, previousUnderperformingStreak = 0 }) => {
  const trafficTier = toTrafficTier(metric);
  const conversionTarget = conversionTargetByTier[trafficTier];
  const conversionGap = conversionRate - conversionTarget;
  const conversionUnderperforming = Number.isFinite(conversionRate) && conversionGap < 0;
  const highIntentUnderperforming = trafficTier !== "low" && conversionUnderperforming;
  const underperformingStreak = highIntentUnderperforming ? previousUnderperformingStreak + 1 : 0;
  const pruneCandidate =
    highIntentUnderperforming &&
    underperformingStreak >= PRUNE_REVIEW_STREAK_MIN &&
    conversionGap <= PRUNE_REVIEW_CONVERSION_GAP;

  const shouldEnqueue = stale || highIntentUnderperforming;
  if (!shouldEnqueue) {
    return {
      enqueue: false,
      trafficTier,
      conversionRate,
      conversionTarget,
      conversionGap,
      stale,
      noindexNow: false,
      reasons: [],
      priority: null,
      underperformingStreak,
      pruneCandidate,
    };
  }

  const reasons = [];
  if (stale) reasons.push("freshness-stale");
  if (highIntentUnderperforming) reasons.push("conversion-below-tier-target");
  if (pruneCandidate) reasons.push("merge-or-prune-candidate");

  const priority = stale ? "p0" : trafficTier === "high" ? "p1" : "p2";

  return {
    enqueue: true,
    trafficTier,
    conversionRate,
    conversionTarget,
    conversionGap,
      stale,
      noindexNow: stale,
      reasons,
      priority,
      underperformingStreak,
      pruneCandidate,
    };
};

export const evaluateRefreshQueue = ({
  payloadRecords,
  metricsByUrl = {},
  previousStatusByUrl = {},
  now = new Date(),
  staleAfterHours = 24 * 14,
}) => {
  const nowIso = now.toISOString();
  const staleCutoffMs = staleAfterHours * HOURS;

  const pages = payloadRecords
    .map((page) => {
      const metric = metricsByUrl[page.url] ?? {};
      const previous = previousStatusByUrl[page.url] ?? {};
      const fetchedAtMs = Date.parse(page.snapshot?.fetchedAtIso ?? "");
      const stale = Number.isNaN(fetchedAtMs) ? true : now.getTime() - fetchedAtMs > staleCutoffMs;
      const conversionRate = Number(metric.ctaConversionRate ?? Number.NaN);

      const queueMeta = buildQueueRecord({
        page,
        metric,
        stale,
        conversionRate,
        previousUnderperformingStreak: Number(previous.underperformingStreak ?? 0),
      });
      const lastRefreshRequestedAtIso = queueMeta.enqueue
        ? (previous.lastRefreshRequestedAtIso ?? nowIso)
        : null;
      const dueAtIso = computeSlaDueAtIso({
        queueMeta,
        previousRequestedAtIso: lastRefreshRequestedAtIso,
        nowIso,
      });
      const lastRefreshedAtIso = previous.lastRefreshedAtIso ?? null;

      const status = {
        url: page.url,
        lastEvaluatedAtIso: nowIso,
        lastRefreshRequestedAtIso,
        lastRefreshedAtIso,
        noindexNow: queueMeta.noindexNow,
        stale,
        trafficTier: queueMeta.trafficTier,
        conversionRate: Number.isFinite(queueMeta.conversionRate) ? queueMeta.conversionRate : null,
        conversionTarget: queueMeta.conversionTarget,
        priority: queueMeta.priority,
        reasons: queueMeta.reasons,
        underperformingStreak: queueMeta.underperformingStreak,
        pruneCandidate: queueMeta.pruneCandidate,
        slaDueAtIso: dueAtIso,
        slaState: toSlaState({ dueAtIso, nowIso, resolvedAtIso: lastRefreshedAtIso }),
      };

      return {
        url: page.url,
        title: page.title,
        kind: page.kind,
        snapshot: page.snapshot,
        enqueue: queueMeta.enqueue,
        noindexNow: queueMeta.noindexNow,
        priority: queueMeta.priority,
        reasons: queueMeta.reasons,
        trafficTier: queueMeta.trafficTier,
        conversionRate: status.conversionRate,
        conversionTarget: status.conversionTarget,
        conversionGap: Number.isFinite(queueMeta.conversionGap) ? queueMeta.conversionGap : null,
        underperformingStreak: queueMeta.underperformingStreak,
        pruneCandidate: queueMeta.pruneCandidate,
        status,
      };
    })
    .sort((a, b) => {
      const priorityOrder = { p0: 0, p1: 1, p2: 2, null: 3 };
      return priorityOrder[a.priority ?? "null"] - priorityOrder[b.priority ?? "null"] || a.url.localeCompare(b.url);
    });

  const queue = pages.filter((page) => page.enqueue);
  const statusByUrl = Object.fromEntries(pages.map((page) => [page.url, page.status]));

  return {
    generatedAtIso: nowIso,
    staleAfterHours,
    totals: {
      pages: pages.length,
      queued: queue.length,
      noindexNow: queue.filter((item) => item.noindexNow).length,
    },
    queue,
    statusByUrl,
  };
};

const readPayloadRecordsFromManifest = async (manifestPath) => {
  const manifest = await readJsonOrDefault(manifestPath, null);
  if (!manifest?.urls || typeof manifest.urls !== "object") {
    throw new Error(`Invalid manifest at ${manifestPath}`);
  }

  const root = join(manifestPath, "..");
  const entries = Object.entries(manifest.urls);
  const records = await Promise.all(entries.map(async ([url, relativePath]) => {
    const payloadPath = join(root, relativePath);
    const content = await readFile(payloadPath, "utf8");
    const parsed = JSON.parse(content);
    return { ...parsed, url };
  }));

  return records;
};

export const runSeoRefreshQueue = async ({
  manifestPath = DEFAULT_MANIFEST_PATH,
  metricsPath = DEFAULT_METRICS_PATH,
  statusPath = DEFAULT_STATUS_PATH,
  queuePath = DEFAULT_QUEUE_PATH,
  staleAfterHours = 24 * 14,
} = {}) => {
  const now = new Date();
  const payloadRecords = await readPayloadRecordsFromManifest(manifestPath);
  const metrics = await readJsonOrDefault(metricsPath, { byUrl: {} });
  const previousStatus = await readJsonOrDefault(statusPath, { byUrl: {} });

  const output = evaluateRefreshQueue({
    payloadRecords,
    metricsByUrl: metrics.byUrl ?? {},
    previousStatusByUrl: previousStatus.byUrl ?? {},
    now,
    staleAfterHours,
  });

  await mkdir(join(queuePath, ".."), { recursive: true });

  const queueArtifact = {
    version: "seo-refresh-queue.v1",
    generatedAtIso: output.generatedAtIso,
    staleAfterHours: output.staleAfterHours,
    totals: output.totals,
    queue: output.queue,
  };

  const statusArtifact = {
    version: "seo-refresh-status.v1",
    generatedAtIso: output.generatedAtIso,
    byUrl: output.statusByUrl,
  };

  await writeFile(queuePath, `${JSON.stringify(queueArtifact, null, 2)}\n`, "utf8");
  await writeFile(statusPath, `${JSON.stringify(statusArtifact, null, 2)}\n`, "utf8");

  return { queueArtifact, statusArtifact };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const staleAfterArg = process.argv.find((arg) => arg.startsWith("--stale-after-hours="));
  const staleAfterHours = staleAfterArg ? Number(staleAfterArg.split("=")[1]) : 24 * 14;

  const { queueArtifact } = await runSeoRefreshQueue({ staleAfterHours });
  console.log(
    `Generated SEO refresh queue with ${queueArtifact.totals.queued}/${queueArtifact.totals.pages} queued pages (${queueArtifact.totals.noindexNow} immediate noindex).`,
  );
}
