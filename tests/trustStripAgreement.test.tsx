import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";
import { answerPages } from "../app/answers/decisionPages";
import { resolvePublishedConfidenceLabel } from "../lib/report/confidence";
import { buildTrustStripProps } from "../lib/report/evidenceReaderModel";
import type { KvNamespace } from "../lib/runtime/kv";

const mockAny: any = mock;

/* Spread the real module and override only the hook: `mock.module` is
   process-wide, and a narrower stub breaks other suites (CLAUDE.md). */
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

describe("resolvePublishedConfidenceLabel", () => {
  const far = { scores: { tightness: 40, riskAppetite: 80 }, thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 } };
  const now = Date.parse("2026-09-22T00:00:00.000Z");

  it("drops a step on a stale fallback and two past five days", () => {
    assert.equal(resolvePublishedConfidenceLabel({ ...far, isFallbackData: false, now }), "HIGH");
    assert.equal(resolvePublishedConfidenceLabel({ ...far, isFallbackData: true, recordDate: "2026-09-21", now }), "HIGH");
    assert.equal(resolvePublishedConfidenceLabel({ ...far, isFallbackData: true, recordDate: "2026-09-18", now }), "MED");
    assert.equal(resolvePublishedConfidenceLabel({ ...far, isFallbackData: true, recordDate: "2026-09-01", now }), "MED");
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
