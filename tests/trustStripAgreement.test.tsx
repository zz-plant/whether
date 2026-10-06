import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { isValidElement, type ReactNode } from "react";
import type { unstable_cache } from "next/cache";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";
import { answerPages } from "../app/answers/decisionPages";
import { resolvePublishedConfidence } from "../lib/report/confidence";
import { buildTrustStripProps } from "../lib/report/evidenceReaderModel";
import { resetFredCircuitBreaker } from "../lib/fred";
import { buildMaterializedReadModel } from "../lib/ingestion/materialized";
import type { SignalEntitySnapshot, SignalFamily, SignalKey } from "../lib/ingestion/types";
import { buildLineage } from "../lib/storage/lineage";
import type { KvNamespace } from "../lib/runtime/kv";

const mockAny: any = mock;

/* Spread the real module and override only the hook: `mock.module` is
   process-wide, and a narrower stub breaks other suites (docs/agents/lessons/automation-and-deploy-gate.md). */
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

/*
 * The trust strip sits under the h1 of every reading route, and each route
 * used to fill it from whatever it held: one reading said High on /signals and
 * Medium on /trust, "could change: Yes" on /trust and No on the others, and an
 * answer page serving the bundled snapshot said "Live" in green.
 */
const assessment = (transitionWatch: boolean, pending = false) => ({
  diagnostics: { transitionWatch },
  regimeTransition: pending ? { pending: true } : undefined,
});

describe("buildTrustStripProps", () => {
  it("names the four data states with the phrase table /trust uses", () => {
    const base = { recordDateLabel: "Sep 18, 2026", confidenceLabel: "HIGH" as const, assessment: assessment(false) };
    assert.equal(buildTrustStripProps({ ...base, isFallback: false }).sourcesLabel, "All sources live");
    assert.equal(buildTrustStripProps({ ...base, isFallback: false, degradedSourceCount: 2 }).sourcesLabel, "Partly cached");
    assert.equal(buildTrustStripProps({ ...base, isFallback: true }).sourcesLabel, "Cached snapshot");
    const historical = buildTrustStripProps({ ...base, isFallback: false, isHistorical: true });
    assert.equal(historical.sourcesLabel, "Historical snapshot");
    assert.equal(historical.sourcesLive, false, "a past month is not drawn in the live tone");
  });

  it("says a change could come next week while one is held for its confirming read", () => {
    const base = { recordDateLabel: "Sep 18, 2026", confidenceLabel: "MED" as const, isFallback: false };
    assert.equal(buildTrustStripProps({ ...base, assessment: assessment(false) }).couldChangeNextWeek, false);
    assert.equal(buildTrustStripProps({ ...base, assessment: assessment(true) }).couldChangeNextWeek, true);
    assert.equal(buildTrustStripProps({ ...base, assessment: assessment(false, true) }).couldChangeNextWeek, true);
  });
});

describe("resolvePublishedConfidence", () => {
  const assessment = { scores: { tightness: 40, riskAppetite: 80 }, thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 } };
  const now = Date.parse("2026-09-22T00:00:00.000Z");
  const label = (record: { record_date: string; fallback_reason?: string }, historical = false) =>
    resolvePublishedConfidence({ assessment, record, historical, now }).label;

  it("drops a step on a stale fallback and two past five days", () => {
    assert.equal(label({ record_date: "2026-09-01" }), "HIGH", "a live read is not aged");
    assert.equal(label({ record_date: "2026-09-21", fallback_reason: "fetch failed" }), "HIGH");
    assert.equal(label({ record_date: "2026-09-18", fallback_reason: "fetch failed" }), "MED");
    assert.equal(label({ record_date: "2026-09-01", fallback_reason: "fetch failed" }), "MED");
  });

  it("does not age an archived month, which is old by design", () => {
    assert.equal(label({ record_date: "2014-03-31", fallback_reason: "fetch failed" }, true), "HIGH");
  });
});

describe("answer page trust strip", () => {
  /* Offline, the page reads the bundled snapshot — the state it used to
     label "Live", because it checked `degraded` (assembly failing) rather than
     the fallback flags. */
  it("does not call a snapshot read live", async () => {
    // Own the cold store: a developer's materialized data must neither decide
    // this test's result nor be deleted to force the fallback path.
    const previousBinding = Object.getOwnPropertyDescriptor(globalThis, "WHETHER_DURABLE_KV");
    const emptyKv: KvNamespace = {
      async get() { return null; },
      async put() {},
      async list() { return { keys: [], list_complete: true }; },
    };
    Object.assign(globalThis, { WHETHER_DURABLE_KV: emptyKv });
    try {
      const { DecisionAnswerPageContent } = await import("../app/answers/decisionAnswerPageContent");
      const slug = answerPages[0]?.slug ?? "";
      const html = renderToStaticMarkup(await DecisionAnswerPageContent({ slug, route: `/answers/${slug}` }));
      assert.doesNotMatch(html, />Live</);
      assert.match(html, /Cached snapshot|Partly cached/);
    } finally {
      if (previousBinding) Object.defineProperty(globalThis, "WHETHER_DURABLE_KV", previousBinding);
      else Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
    }
  });
});

/*
 * One reading, one confidence, on every surface that prints it.
 *
 * The strip builder above was already shared; what it was handed was not. On
 * the week of Sep 22, 2026 / and /signals said High while /operate and /trust
 * said Medium ("Live · reduced confidence"), and every /share paste said
 * Medium and "Confidence is not high". Three rules answered the question: the
 * published one, which measures the nearest line on one scale; the engine's
 * label; and a copy of it in the posture-state contract. The last two rank the
 * raw gaps, where a risk-appetite point is a 4.5x larger move than a
 * funding-pressure point, and the brief model preferred the contract's label
 * whenever a route had built one.
 *
 * Each route here runs its own model builder through the real loader, against
 * a store holding that week's reading and nothing upstream.
 */
const WEEK_OF_SEP_22: Array<[SignalKey, SignalFamily, number]> = [
  ["TREASURY_1M", "rates", 4.2],
  ["TREASURY_3M", "rates", 4.15],
  ["TREASURY_2Y", "rates", 3.95],
  ["TREASURY_10Y", "rates", 4.3],
  ["BBB_CREDIT_SPREAD", "spreads", 1.7],
  ["HY_CREDIT_SPREAD", "spreads", 3.2],
  ["UNEMPLOYMENT_RATE", "labor", 4.2],
  ["CPI_YOY", "inflation", 2.8],
  ["CHICAGO_FCI", "credit", -0.4],
  ["VIX_INDEX", "volatility", 16],
];

const withReading = async <T,>(read: () => Promise<T>): Promise<T> => {
  const now = new Date();
  const ingestedAt = new Date(now.getTime() - 60_000).toISOString();
  const snapshots: SignalEntitySnapshot[] = WEEK_OF_SEP_22.map(([signalKey, family, value]) => ({
    signalKey,
    family,
    value,
    unit: "%",
    source: { label: "FRED", url: `https://fred.stlouisfed.org/series/${signalKey}`, seriesId: signalKey },
    observedAt: ingestedAt,
    ingestedAt,
    quality: "observed",
    confidence: "high",
  }));
  const stored = JSON.stringify({ ...buildLineage("request-received-at"), model: buildMaterializedReadModel(snapshots, now) });
  const store: KvNamespace = {
    async get(key: string) {
      return key === "ingestion:materialized:latest" ? stored : null;
    },
    async put() {},
    async delete() {},
    async list() {
      return { keys: [], list_complete: true };
    },
  };
  const detached: Promise<unknown>[] = [];
  const previousBinding = Object.getOwnPropertyDescriptor(globalThis, "WHETHER_DURABLE_KV");
  const originalFetch = globalThis.fetch;
  const unserved: typeof fetch = async () => new Response("not served by this test", { status: 404 });
  Object.assign(globalThis, {
    WHETHER_DURABLE_KV: store,
    WHETHER_WAIT_UNTIL: (task: Promise<unknown>) => {
      detached.push(task);
    },
  });
  globalThis.fetch = unserved;
  resetFredCircuitBreaker();
  try {
    return await read();
  } finally {
    await Promise.allSettled(detached);
    globalThis.fetch = originalFetch;
    if (previousBinding) Object.defineProperty(globalThis, "WHETHER_DURABLE_KV", previousBinding);
    else Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
    Reflect.deleteProperty(globalThis, "WHETHER_WAIT_UNTIL");
    resetFredCircuitBreaker();
  }
};

/** The props a page hands every `component` in its tree, read without rendering it. */
const propsHandedTo = <P,>(node: ReactNode, component: (props: P) => ReactNode): P[] => {
  if (Array.isArray(node)) return node.flatMap((child: ReactNode) => propsHandedTo(child, component));
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  const own = node.type === component && isValidElement<P>(node) ? [node.props] : [];
  return [...own, ...propsHandedTo(node.props.children, component)];
};

/* The homepage loader is wrapped in Next's data cache, which needs a request
   to live in; this runs the same loader with the cache taken out. */
const uncached: typeof unstable_cache = (load) => load;

const WORD = { HIGH: "High", MED: "Medium", LOW: "Low" } as const;

describe("one reading's confidence across routes and exports", () => {
  it("is the published band on /, /signals, /operate, /trust, the API posture state and every /share paste", async () => {
    const [
      { assembleHomePage },
      { buildSignalsPageModel },
      { buildPlanningPageModel },
      { buildTrustPageModel },
      { default: SharePage },
      { SharePageFormats },
      { BriefArtifactScript },
      { loadWeeklyBriefSnapshot },
      { createHomePageReportDataLoader },
    ] = await Promise.all([
      import("../lib/report/homePageAssembler"),
      import("../app/signals/evidencePageModel"),
      import("../app/operate/planningPageModel"),
      import("../app/trust/trustPageModel"),
      import("../app/share/page"),
      import("../app/share/sharePageFormats"),
      import("../app/components/briefArtifactScript"),
      import("../lib/report/weeklyBriefSnapshot"),
      import("../lib/report/homePageData"),
    ]);

    const surfaces = await withReading(async () => {
      const { reportData, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "test" });
      const home = await assembleHomePage({}, {
        loadHomePageReportData: createHomePageReportDataLoader({ unstableCache: uncached }),
      });
      const operate = await buildPlanningPageModel();
      const share = await SharePage();
      return {
        reportData,
        postureState: snapshot.postureState,
        home: home.weeklyDecisionCardModel.status.confidenceLabel,
        signals: (await buildSignalsPageModel()).trustStrip.confidenceLabel,
        operate: operate.reportShellModel.trust.strip?.confidenceLabel,
        trust: await buildTrustPageModel(),
        pastes: propsHandedTo(share, SharePageFormats)[0]?.options,
        shareArtifact: propsHandedTo(share, BriefArtifactScript)[0]?.artifact,
      };
    });

    const { assessment, treasury } = surfaces.reportData;
    // The reading this test exists for: live, 20 points from the nearest line
    // once both axes are on one scale, 7 on the raw risk gap.
    assert.equal(treasury.fallback_reason ?? null, null, "the fixture reads live, so no staleness step applies");
    assert.equal(assessment.scores.tightness, 90);
    assert.equal(assessment.scores.riskAppetite, 43);
    const published = resolvePublishedConfidence({ assessment, record: treasury });
    assert.equal(published.label, "HIGH");
    assert.equal(
      assessment.diagnostics.confidence,
      "MEDIUM",
      "the engine's raw-gap label must differ here, or this reading cannot tell the rules apart — move the 10-year so the raw risk gap sits between 6 and 12",
    );

    assert.equal(surfaces.home, published.label, "/ (hero strip and chip)");
    assert.equal(surfaces.signals, published.label, "/signals");
    assert.equal(surfaces.operate, published.label, "/operate");
    assert.equal(surfaces.trust.trustStrip.confidenceLabel, published.label, "/trust strip");
    assert.match(surfaces.trust.meetingSnippet, new RegExp(`^Confidence: ${WORD[published.label]} \\(`, "m"), "/trust meeting snippet");
    assert.equal(surfaces.postureState?.currentState.confidenceLabel, published.label, "posture state (/api/weekly, /api/monthly, MCP)");
    assert.equal(surfaces.postureState?.currentState.confidencePercent, published.percent, "posture state percent");
    assert.equal(surfaces.shareArtifact?.confidenceLabel, published.label, "/share copy picker");

    // Every band a /share paste prints, in either of its two phrasings.
    const { pastes } = surfaces;
    assert.ok(pastes, "/share hands its pastes to the format picker");
    const textOf = (id: string) => {
      const option = pastes.find((candidate) => candidate.id === id);
      return option?.kind === "text" ? option.text : "";
    };
    const texts = {
      fullBrief: textOf("full-brief"),
      meetingPack: textOf("meeting-pack"),
      ticketBrief: textOf("ticket-brief"),
      email: textOf("email"),
    };
    for (const [key, text] of Object.entries(texts)) {
      const bands = [...text.matchAll(/\b(High|Medium|Low) confidence\b|Confidence: (High|Medium|Low)\b/g)]
        .map((match) => match[1] ?? match[2]);
      assert.ok(bands.length > 0, `${key} prints a confidence band`);
      assert.deepEqual([...new Set(bands)], [WORD[published.label]], `${key} prints one band, the published one`);
      assert.doesNotMatch(text, /confidence is not high/i, `${key} says confidence is not high on a High week`);
    }
    const investor = pastes.find((candidate) => candidate.id === "investor-update");
    assert.ok(investor?.kind === "investor", "/share offers the investor update");
    assert.match(investor.parts.conditions, /Conditions are well clear of the line where they would change\./, "investor update");
  });
});
