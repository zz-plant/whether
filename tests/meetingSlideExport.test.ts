import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import {
  extractMeetingSlidePayload,
  formatMeetingSlideMarkdown,
  formatMeetingSlideHtml,
  formatMeetingSlideSvg,
} from "../lib/export/meetingSlideExport";
import type { TreasuryData } from "../lib/types";

const mockTreasury: TreasuryData = {
  record_date: "2026-08-31",
  fetched_at: "2026-08-31T09:00:00Z",
  source: "US Treasury",
  isLive: true,
  yields: {
    oneMonth: 5.2,
    threeMonth: 5.2,
    twoYear: 4.8,
    tenYear: 4.2,
  },
};

describe("Meeting Slide & Notion Exporter", () => {
  it("extracts and formats slide payloads across stages", () => {
    const snapshot = buildOperatingSnapshot({
      treasury: mockTreasury,
      macroSeries: [],
    });

    const seedPayload = extractMeetingSlidePayload(snapshot, "seed");
    assert.equal(seedPayload.stageLabel, "Seed");
    assert.equal(seedPayload.regime, "SCARCITY");
    assert.ok(seedPayload.actionNow.length > 0);
    assert.ok(seedPayload.pauseIf.length > 0);
    assert.ok(seedPayload.changeCourseIf.length > 0);

    const seriesAPayload = extractMeetingSlidePayload(snapshot, "series-a");
    assert.equal(seriesAPayload.stageLabel, "Series A");

    // No stage chosen means no stage on the slide. This used to default to "Seed", which titled
    // every slide reached without a `?stage=` as a seed-stage company's.
    const unstaged = extractMeetingSlidePayload(snapshot);
    assert.equal(unstaged.stageLabel, "");
    assert.doesNotMatch(formatMeetingSlideMarkdown(unstaged), /Stage\*\*/);
    assert.doesNotMatch(formatMeetingSlideHtml(unstaged), /Seed|Startup/);
    assert.doesNotMatch(formatMeetingSlideSvg(unstaged), /Seed|Startup/);
  });

  it("generates structured markdown callout for Notion", () => {
    const snapshot = buildOperatingSnapshot({
      treasury: mockTreasury,
      macroSeries: [],
    });

    const payload = extractMeetingSlidePayload(snapshot, "seed");
    const markdown = formatMeetingSlideMarkdown(payload);

    assert.ok(markdown.includes("> **Whether: this week's call**"));
    assert.ok(markdown.includes("ACTION NOW"));
    assert.ok(markdown.includes("PAUSE IF"));
    assert.ok(markdown.includes("CHANGE COURSE IF"));
    assert.ok(markdown.includes("Freezing"));
    assert.ok(!markdown.includes("SCARCITY"), "the engine key must not reach a pasted slide");
  });

  it("generates rich HTML with executive styling for slide copy", () => {
    const snapshot = buildOperatingSnapshot({
      treasury: mockTreasury,
      macroSeries: [],
    });

    const payload = extractMeetingSlidePayload(snapshot, "seed");
    const html = formatMeetingSlideHtml(payload);

    assert.ok(html.includes("Whether · Weekly Operating Brief"));
    assert.ok(html.includes("1. Action Now"));
    assert.ok(html.includes("2. Pause If"));
    assert.ok(html.includes("3. Change Course If"));
    assert.ok(html.includes("Freezing"));
    assert.ok(!html.includes("SCARCITY"));
  });

  it("generates valid 16:9 standalone SVG slide", () => {
    const snapshot = buildOperatingSnapshot({
      treasury: mockTreasury,
      macroSeries: [],
    });

    const payload = extractMeetingSlidePayload(snapshot, "series-b");
    const svg = formatMeetingSlideSvg(payload);

    assert.ok(svg.startsWith("<svg"));
    assert.ok(svg.includes('viewBox="0 0 1200 675"'));
    assert.ok(svg.includes("WHETHER · WEEKLY OPERATING CALL"));
    assert.ok(svg.includes("ACTION NOW"));
    assert.ok(svg.includes("Freezing"));
    assert.ok(!svg.includes("SCARCITY"));
  });
});
