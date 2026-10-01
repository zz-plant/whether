import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import { buildBoardBrief, buildBoardSlideBullets, buildCallCitation, buildSlackBrief } from "../lib/export/briefBuilders";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import {
  extractMeetingSlidePayload,
  formatMeetingSlideHtml,
  formatMeetingSlideMarkdown,
  formatMeetingSlideSvg,
} from "../lib/export/meetingSlideExport";
import { formatInvestorUpdateSnippet } from "../lib/export/investorUpdateSnippet";
import { buildPortfolioNote } from "../lib/export/portfolioNote";
import { buildRecordSummary } from "../app/components/history/ExportBoardAnnexButton";
import type { TrackRecord } from "../lib/report/trackRecord";
import { buildTrustStatus } from "../lib/report/trustStatus";
import { assessment, treasury, sensors, macros } from "./factories/exportFixtures";

/**
 * Every artifact that leaves the site was audited on 2026-09-22 for facts about the reader's
 * company that no reading produced, and four were publishing them:
 *
 * - The Slack brief carried a "Financial implications" block computed from a hardcoded company
 *   (13 months of runway, $700k burn, $500k revenue, growth-stage B2B SaaS) with nothing marking
 *   it as a sample. It reached the Monday Slack post, the /share copy button and the public
 *   Slack-brief API.
 * - The board annex asserted that management "backfilled revenue-critical roles only", enforced a
 *   six-month payback bar and held an 18-month cash buffer, under "Prepared for the Board of
 *   Directors".
 * - The slide, PPTX and PDF were titled as a seed-stage company's unless a `?stage=` said
 *   otherwise.
 * - The investor snippet asserted a second-signoff rule and a raise process under way in the
 *   founder's own voice, chosen by runway band.
 *
 * Plus a recurring "Owner: CEO + Finance lead at the Mon/Thu operating review" that named the
 * reader's org chart and meeting schedule. This test pins the absence. The runway planner on
 * /operate still prints runway figures, from numbers the reader typed; that is the distinction.
 */
const FIXTURE_COMPANY =
  /Financial implications|Runway risk|Raise window|Burn adjustment|Safe runway band|CEO \+ Finance|Mon\/Thu|Executive Stance|Seed Stage|second signoff|standard corridor|peers are holding|management paced|Backfilled|Enforced strict|Preserved forward|Board of Directors/;

const snapshot = buildOperatingSnapshot({ treasury, macroSeries: macros });

describe("artifacts that leave the site carry no facts about a company the site never asked about", () => {
  it("Slack brief, board brief, citation and slide bullets", () => {
    for (const text of [
      buildSlackBrief(assessment, treasury, sensors, macros),
      buildBoardBrief(assessment, treasury, sensors, macros),
      buildCallCitation(assessment, treasury),
      buildBoardSlideBullets(assessment, treasury, macros),
    ]) {
      assert.doesNotMatch(text, FIXTURE_COMPANY);
    }
  });

  it("meeting slide in every format, with and without a chosen stage", () => {
    for (const stage of [null, "seed", "series-a"] as const) {
      const payload = extractMeetingSlidePayload(snapshot, stage);
      for (const text of [formatMeetingSlideMarkdown(payload), formatMeetingSlideHtml(payload), formatMeetingSlideSvg(payload)]) {
        assert.doesNotMatch(text, FIXTURE_COMPANY);
      }
    }
    assert.equal(extractMeetingSlidePayload(snapshot).stageLabel, "", "an unchosen stage must not default to one");
  });

  it("investor snippet leaves the company's policy to the author", () => {
    const parts = { conditions: "C.", response: "R.", source: "S." };
    for (const band of ["critical", "tight", "balanced", "abundant", null] as const) {
      assert.doesNotMatch(formatInvestorUpdateSnippet(parts, band), FIXTURE_COMPANY);
    }
  });

  it("portfolio note speaks to every runway band and to no one company", () => {
    const note = buildPortfolioNote({
      assessment,
      record: treasury,
      areas: [{ area: "hiring", rule: "Limit hiring to backfills", pause: "Funding pressure > 76", resume: "Risk appetite > 54" }],
      sourceLabel: treasury.source,
    });
    assert.doesNotMatch(note, FIXTURE_COMPANY);
  });

  it("record summary names only what the archive holds, and needs a record to exist", () => {
    const record: TrackRecord = {
      monthsCovered: 176,
      firstRecordDate: "2012-01-31",
      latestRecordDate: "2026-08-31",
      currentHoldMonths: 8,
      currentHoldStartDate: "2026-01-31",
      regimeChanges: 6,
      lineCrossingMonths: 22,
      currentRegime: "EXPANSION",
      currentRegimeLabel: "Sunny",
      rows: [],
      allRows: [],
    };
    const memo = buildRecordSummary(record, "https://example.test");
    assert.doesNotMatch(memo, FIXTURE_COMPANY);
    assert.match(memo, /Sunny/);
    assert.match(memo, /8 consecutive month-end readings/);
    assert.match(memo, /176 months/);
    assert.match(memo, /https:\/\/example\.test\/history/);
  });

  it("trust status names no owner inside the reader's company", () => {
    const base = { historicalAction: "unused", fallbackAction: "unused", stableAction: "unused" };
    for (const input of [
      { ...base, historicalSelection: false, isFallback: false },
      { ...base, historicalSelection: false, isFallback: true, fallbackReason: "Treasury API timeout." },
      { ...base, historicalSelection: true, isFallback: false },
    ]) {
      assert.doesNotMatch(JSON.stringify(buildTrustStatus(input).recoveryPlan), FIXTURE_COMPANY);
    }
  });

});
