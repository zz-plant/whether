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
    // A live read with no macro series is held because inputs are missing, and says so.
    assert.deepEqual(held.assessment.policyAssessment.refusal.reasonCodes, ["inputs-missing"]);
    const hold = POLICY_OVERRIDE_CALL["inputs-missing"];
    const seed = buildExportSlidePayload(held, "seed");
    assert.equal(seed.stageLabel, "Seed");
    assert.ok(seed.actionNow.startsWith(hold.actionNow), "the held week's action leads");
    assert.ok(seed.actionNow.endsWith(hold.currentCall), "and the reason it is held follows");
    assert.equal(seed.pauseIf, hold.pauseIf);
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
    assert.ok(/Margin: (within reach of|clear of|close to) the line/.test(markdown), "the margin reads as words, not the engine's code");
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

    assert.ok(html.includes("Whether · Weekly operating guidance"));
    /* Parallel, not steps: no "1. 2. 3." before the three labels (2026-10-09). */
    assert.ok(html.includes(">Action now<"));
    assert.ok(html.includes(">Pause if<"));
    assert.ok(html.includes(">Conditions change if<"));
    assert.doesNotMatch(html, /[123]\. (Action now|Pause if|Conditions change if)/);
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
    /* Sentence case, no tracking; flat fills, no accent discs; unnumbered cards (2026-10-09). */
    assert.ok(svg.includes(">Whether · Weekly operating guidance</text>"));
    assert.doesNotMatch(svg, /letter-spacing="2"|WEEKLY OPERATING/);
    assert.doesNotMatch(svg, /Gradient|<circle/);
    assert.ok(svg.includes(">Action now</text>"));
    assert.doesNotMatch(svg, />[123]\. /);
    assert.ok(svg.includes("Freezing"));
    assert.ok(!svg.includes("SCARCITY"));
  });

  // The decision cards draw SVG text, which does not wrap: before 2026-10-09 the
  // 92-character call ran past its card ("…hires that bring in revenu").
  const cardText = (svg: string, label: string): string[] => {
    const card = svg.split(label)[1] ?? "";
    const text = card.slice(card.indexOf("<text"), card.indexOf("</text>", card.indexOf("<text")) + 7);
    return [...text.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map((match) => match[1] ?? "");
  };
  const slidePayload = () =>
    buildExportSlidePayload(buildOperatingSnapshot({ treasury: mockTreasury, macroSeries }), "series-b");

  it("wraps a long call onto two lines inside its card", () => {
    const call = "Approve only renewals, work already promised to customers, and hires that bring in revenue.";
    const lines = cardText(formatMeetingSlideSvg({ ...slidePayload(), actionNow: call }), ">Action now<");
    assert.equal(lines.length, 2);
    assert.equal(lines.join(" "), call);
  });

  it("keeps a short call on one line", () => {
    const lines = cardText(formatMeetingSlideSvg({ ...slidePayload(), actionNow: "Hold the plan." }), ">Action now<");
    assert.deepEqual(lines, ["Hold the plan."]);
  });

  it("cuts text too long for two lines at a word, with an ellipsis", () => {
    const long = Array.from({ length: 60 }, (_, index) => `word${index}`).join(" ");
    const lines = cardText(formatMeetingSlideSvg({ ...slidePayload(), pauseIf: long }), ">Pause if<");
    assert.equal(lines.length, 2);
    assert.ok(lines[1]?.endsWith("\u2026"));
    assert.ok(long.startsWith(lines[0] ?? "-"));
  });
});
