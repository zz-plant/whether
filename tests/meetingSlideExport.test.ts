import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import {
  formatMeetingSlideMarkdown,
  formatMeetingSlideHtml,
  formatMeetingSlideSvg,
} from "../lib/export/meetingSlideExport";
import { buildExportSlidePayload } from "../lib/export/exportSnapshot";
import type { TreasuryData } from "../lib/types";
import { macroSeries } from "../lib/macroSnapshot";
import { POLICY_OVERRIDE_CALL } from "../lib/report/reportCopy";

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
  it("keeps a held call held whatever stage the slide is downloaded for", () => {
    /* With no macro series the policy layer holds the guidance. The slide used to
       print the stage's own action over that, while the brief, the email and the
       Monday post printed the held call. */
    const held = buildOperatingSnapshot({ treasury: mockTreasury, macroSeries: [] });
    assert.equal(held.weeklyCall.policyOverrideActive, true);
    const seed = buildExportSlidePayload(held, "seed");
    assert.equal(seed.stageLabel, "Seed");
    assert.equal(seed.actionNow, POLICY_OVERRIDE_CALL.actionNow);
    assert.equal(seed.pauseIf, POLICY_OVERRIDE_CALL.pauseIf);
    assert.equal(seed.resumeWhen, undefined, "a held call has one resume line, its change line");
  });

  it("extracts and formats slide payloads across stages", () => {
    const snapshot = buildOperatingSnapshot({
      treasury: mockTreasury,
      macroSeries,
    });

    assert.equal(snapshot.weeklyCall.policyOverrideActive, false, "an ordinary week, which a stage calibrates");
    const seedPayload = buildExportSlidePayload(snapshot, "seed");
    assert.equal(seedPayload.stageLabel, "Seed");
    assert.equal(seedPayload.regime, "SCARCITY");
    assert.ok(seedPayload.actionNow.length > 0);
    assert.ok(seedPayload.pauseIf.length > 0);
    assert.equal(seedPayload.callChangesIf, snapshot.weeklyCall.callChangesIf, "a stage never replaces the change line");
    assert.equal(seedPayload.resumeWhen, snapshot.weeklyCall.stageScopedAdjustments?.seed.resumeWhen);

    const seriesAPayload = buildExportSlidePayload(snapshot, "series-a");
    assert.equal(seriesAPayload.stageLabel, "Series A");

    // No stage chosen means no stage on the slide. This used to default to "Seed", which titled
    // every slide reached without a `?stage=` as a seed-stage company's.
    const unstaged = buildExportSlidePayload(snapshot, null);
    assert.equal(unstaged.stageLabel, "");
    assert.doesNotMatch(formatMeetingSlideMarkdown(unstaged), /Stage\*\*/);
    assert.doesNotMatch(formatMeetingSlideHtml(unstaged), /Seed|Startup/);
    assert.doesNotMatch(formatMeetingSlideSvg(unstaged), /Seed|Startup/);
  });

  it("generates structured markdown callout for Notion", () => {
    const snapshot = buildOperatingSnapshot({
      treasury: mockTreasury,
      macroSeries,
    });

    const payload = buildExportSlidePayload(snapshot, "seed");
    const markdown = formatMeetingSlideMarkdown(payload);

    assert.ok(markdown.includes("> **Whether: this week's guidance**"));
    assert.ok(markdown.includes("ACTION NOW"));
    assert.ok(markdown.includes("PAUSE IF"));
    assert.ok(markdown.includes(`CONDITIONS CHANGE IF**: ${payload.callChangesIf}`));
    assert.ok(markdown.includes(`RESUME WHEN**: ${payload.resumeWhen}`));
    assert.ok(!markdown.includes("CHANGE COURSE IF"), "the slide uses the page's name for the change line");
    assert.ok(/Medium confidence|High confidence|Low confidence/.test(markdown), "confidence reads as a word, not the engine's code");
    assert.ok(markdown.includes("Freezing"));
    assert.ok(!markdown.includes("SCARCITY"), "the engine key must not reach a pasted slide");
  });

  it("generates rich HTML with executive styling for slide copy", () => {
    const snapshot = buildOperatingSnapshot({
      treasury: mockTreasury,
      macroSeries,
    });

    const payload = buildExportSlidePayload(snapshot, "seed");
    const html = formatMeetingSlideHtml(payload);

    assert.ok(html.includes("Whether · Weekly Operating Brief"));
    assert.ok(html.includes("1. Action now"));
    assert.ok(html.includes("2. Pause if"));
    assert.ok(html.includes("3. Conditions change if"));
    assert.ok(html.includes("Resume when"));
    assert.ok(html.includes("Freezing"));
    assert.ok(!html.includes("SCARCITY"));
  });

  it("generates valid 16:9 standalone SVG slide", () => {
    const snapshot = buildOperatingSnapshot({
      treasury: mockTreasury,
      macroSeries,
    });

    const payload = buildExportSlidePayload(snapshot, "series-b");
    const svg = formatMeetingSlideSvg(payload);

    assert.ok(svg.startsWith("<svg"));
    assert.ok(svg.includes('viewBox="0 0 1200 675"'));
    assert.ok(svg.includes("WHETHER · WEEKLY OPERATING GUIDANCE"));
    assert.ok(svg.includes("ACTION NOW"));
    assert.ok(svg.includes("Freezing"));
    assert.ok(!svg.includes("SCARCITY"));
  });
});
