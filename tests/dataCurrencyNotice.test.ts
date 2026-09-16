import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  DATA_CURRENCY_ACTION,
  buildDataCurrencyNotice,
} from "../lib/report/dataCurrencyNotice";
import { evaluateSeoQualityGates, type SeoQualitySiblingInput } from "../lib/report/seoQualityGates";

/*
 * The defect this guards is not "the warning is worded badly". It is that the
 * warning was about a different reader: two of the three programmatic surfaces
 * printed the word "noindex" into the page, and all three joined the quality
 * gate's own identifiers into the sentence a visitor reads. Both are facts about
 * how we treat the page, not about whether the number on it can be acted on.
 *
 * So the reasons are produced by the real gate rather than hand-listed here: a
 * reason added upstream turns up in this test without anyone copying it across.
 */

/** Everything a page needs to pass every gate. Each case below spoils one thing. */
const passingInput = () => ({
  pageKey: "/answers/should-we-freeze-hiring",
  currentCall: "Hold the hiring plan at its current pace.",
  immediateAction: "Backfill only roles with a named revenue owner.",
  triggerThreshold: "Pause new offers above 85.",
  reversalCondition: "Reopen below 65.",
  evidenceCount: 2,
  evidenceTitles: ["1-month bill", "Curve slope"],
  fetchedAtIso: new Date().toISOString(),
  isFallbackSnapshot: false,
  trustSummary: "Live sources, high confidence.",
  citationMeta: "Whether, Sep 14 2026.",
  provenanceStatusLabel: "Live",
  provenanceLinks: ["https://fred.stlouisfed.org/"],
  confidenceLabel: "HIGH" as const,
  fallbackLabel: "live",
  interpretationLabel: "hold-hiring",
  siblingsInCluster: [] as SeoQualitySiblingInput[],
});

const reasonsFor = (overrides: Partial<ReturnType<typeof passingInput>>) =>
  evaluateSeoQualityGates({ ...passingInput(), ...overrides }).reasons;

describe("data currency notice", () => {
  it("says nothing when every gate passes", () => {
    assert.deepEqual(reasonsFor({}), []);
    assert.equal(buildDataCurrencyNotice(reasonsFor({})), null);
  });

  it("stays silent when the page fails an editorial gate but the reading is current", () => {
    /* A duplicate of its cluster sibling: a reason to keep the page out of an
       index, and no reason at all to warn the person reading it. */
    const reasons = reasonsFor({
      siblingsInCluster: [
        {
          pageKey: "/answers/sibling",
          evidenceTitles: ["1-month bill", "Curve slope"],
          interpretationLabel: "hold-hiring",
        },
      ],
    });

    assert.ok(reasons.includes("cluster-duplicate-no-distinct-datapoint-or-interpretation"));
    assert.equal(buildDataCurrencyNotice(reasons), null);
  });

  it("stays silent when the page is thin, which says nothing about the data", () => {
    const reasons = reasonsFor({ evidenceCount: 0, evidenceTitles: [] });
    assert.ok(reasons.includes("decision-evidence-missing"));
    assert.equal(buildDataCurrencyNotice(reasons), null);
  });

  it("names the snapshot, and the date, when the reading is not live", () => {
    const notice = buildDataCurrencyNotice(reasonsFor({ isFallbackSnapshot: true }), {
      recordDateLabel: "Jun 17, 2026",
    });

    assert.ok(notice);
    assert.match(notice.summary, /last saved snapshot/);
    assert.match(notice.summary, /Jun 17, 2026/);
  });

  it("speaks of age when the reading is stale rather than fallen back", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const notice = buildDataCurrencyNotice(reasonsFor({ fetchedAtIso: tenDaysAgo }));

    assert.ok(notice);
    assert.match(notice.summary, /has not refreshed/);
  });

  it("never puts a gate identifier, or the word noindex, in front of a reader", () => {
    const cases = [
      reasonsFor({ isFallbackSnapshot: true }),
      reasonsFor({ fetchedAtIso: "not-a-date" }),
      reasonsFor({ fetchedAtIso: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }),
      reasonsFor({ provenanceStatusLabel: "Cached snapshot" }),
      /* Everything failing at once, which is the state an outage produces. */
      evaluateSeoQualityGates({ pageKey: "/answers/empty", enforceLaunchChecklist: true }).reasons,
    ];

    for (const reasons of cases) {
      const notice = buildDataCurrencyNotice(reasons, { recordDateLabel: "Jun 17, 2026" });
      assert.ok(notice, `expected a notice for ${reasons.join(", ")}`);
      assert.doesNotMatch(notice.summary, /noindex/i);
      for (const reason of reasons) {
        assert.ok(
          !notice.summary.includes(reason),
          `summary leaked the gate id "${reason}": ${notice.summary}`,
        );
      }
    }
  });

  it("tells the reader what to do about it, once, in one place", () => {
    assert.doesNotMatch(DATA_CURRENCY_ACTION, /noindex|index|crawl/i);
    assert.match(DATA_CURRENCY_ACTION, /source dates/i);
  });
});
