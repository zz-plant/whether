import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { assembleHomePage } from "../lib/report/homePageAssembler";
import { buildWeeklyOperatorBriefPayload, buildWeeklyOperatorBriefPlainText } from "../lib/export/weeklyOperatorBrief";
import { briefSourceFromReportData, buildBriefDocument } from "../lib/report/briefDocument";
import { buildReportDataFixture } from "./fixtures/reportFixtures";

const dependencies = {
  loadHomePageReportData: async () => ({ ok: true as const, data: buildReportDataFixture() }),
};

describe("assembleHomePage", () => {
  it("lists only the degraded sources in the shell", async () => {
    const data = buildReportDataFixture({
      sourceHealth: [
        { sourceName: "Treasury", cadenceLabel: "Daily rates", freshnessStatus: "stale", freshnessSlaHours: 26, lastSuccessfulFetchAt: "2026-09-22T13:07:00Z", ageLabel: "2d", activeFallbackReason: null, mode: "live", expectsLive: true },
        { sourceName: "Startup/private markets", cadenceLabel: "Curated snapshot", freshnessStatus: "fresh", freshnessSlaHours: 1080, lastSuccessfulFetchAt: "2026-09-01T00:00:00Z", ageLabel: "23d", activeFallbackReason: null, mode: "snapshot", expectsLive: false },
      ],
    });
    const homepage = await assembleHomePage({ searchParams: undefined }, {
      loadHomePageReportData: async () => ({ ok: true, data }),
    });
    assert.deepEqual(homepage.reportShell.degradedSourceRows.map((row) => row.sourceName), ["Treasury"]);
  });

  it("gives the operator brief the week's guidance, once, under its reading's date", async () => {
    const homepage = await assembleHomePage({ searchParams: undefined }, dependencies);
    assert.match(homepage.weeklyDecisionCardModel.decision.immediateDecision, /stage|revise|hold/i);

    const reportDataForCopy = homepage.reportResult.ok ? homepage.reportResult.data : homepage.reportResult.fallback;
    const headerOperatorBriefCopy = buildWeeklyOperatorBriefPlainText(buildWeeklyOperatorBriefPayload(
      buildBriefDocument(briefSourceFromReportData(reportDataForCopy), homepage.weeklyCall),
      {
        weeklyLeadershipSummary: homepage.weeklyDecisionCardModel.decision.weeklyLeadershipSummary,
      },
    ));

    assert.ok(
      headerOperatorBriefCopy.startsWith(`Weekly Operator Brief — ${reportDataForCopy.treasury.record_date}`),
      "headed with the reading's date, not the Friday of its week",
    );
    assert.match(headerOperatorBriefCopy, /Conditions:/);
    assert.match(headerOperatorBriefCopy, /^Guidance: /m);
    assert.doesNotMatch(headerOperatorBriefCopy, /^Do now:/m, "the guidance is not repeated under a second label");
    assert.match(headerOperatorBriefCopy, /Pause if:/);
    assert.match(headerOperatorBriefCopy, /Why this could be wrong:/);
    assert.match(headerOperatorBriefCopy, /Conditions change if:/);
  });

  it("calibrates the brief to the stage cookie when the URL names none, and lets the URL win", async () => {
    const untouched = await assembleHomePage({ searchParams: undefined }, dependencies);
    assert.equal(untouched.weeklyDecisionCardModel.decision.startupVariantPolicy.selectedMode, "series-a");

    // The settings panel and the hero selector both write this cookie; before
    // this it was parsed on every request and read by nothing.
    const fromCookie = await assembleHomePage(
      { searchParams: undefined, operatorContext: { companyStage: "bootstrapped", companyRunway: null, ticker: null } },
      dependencies,
    );
    assert.equal(fromCookie.weeklyDecisionCardModel.decision.startupVariantPolicy.selectedMode, "bootstrapped");

    const fromUrl = await assembleHomePage(
      { searchParams: { stage: "seed" }, operatorContext: { companyStage: "bootstrapped", companyRunway: null, ticker: null } },
      dependencies,
    );
    assert.equal(fromUrl.weeklyDecisionCardModel.decision.startupVariantPolicy.selectedMode, "seed");
  });
});
