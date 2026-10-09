import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { ImageResponse } from "next/og";
import { isValidElement, type ReactNode } from "react";
import { buildBriefImagePayload } from "../app/api/image/brief/route";
import { buildScoreReadings, buildScoreReferenceLines, type ScoreReadingParts } from "../lib/export/scoreReference";
import { renderBriefImage, type BriefImageProps } from "../lib/image/briefImageTemplate";
import { OG_FONT_BODY, OG_FONT_DISPLAY, OG_FONT_STAMP, toImageSafeText } from "../lib/image/ogFonts";
import { DISPLAY_EM, SANS_EM, wrappedLines } from "../lib/image/textFit";
import { buildRuleCondition } from "../lib/report/boundedDecisionRules";
import { parseImageBriefRequestContext } from "../lib/report/imageBriefSearchParams";
import { buildSharedCorridorRails, type ActionStripItem } from "../lib/report/operatingCalls";
import { PROVENANCE_STATUS } from "../lib/report/provenanceStatus";
import type { ReportDynamics } from "../lib/report/reportDataTypes";
import { getPreviousTimeMachineSnapshot } from "../lib/timeMachine/timeMachineCache";
import { buildWeeklyDecisionCardModel } from "./factories/weeklyDecisionCardModel";

const collectText = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(collectText).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return collectText(node.props.children);
  }
  return "";
};

/**
 * This week as the card is asked to draw it: both scores against a pause and a
 * resume line, and a week whose signals moved against the Aug 31 snapshot (the
 * last month-end, which is what the loader compares a Sep 25 read with).
 */
const scores = { tightness: 90, riskAppetite: 43 };
const pauseAndResumeLines: ActionStripItem[] = [
  {
    lever: "hiring-stance",
    label: "Hiring pace",
    areaActionNow: "Keep hiring to critical, revenue-linked backfills only.",
    triggerThreshold: "Pause net-new hiring if funding pressure rises above 76.",
    reversalCondition: "Reopen selective hiring after funding pressure falls below 66.",
    pauseConditions: [buildRuleCondition("tightness", ">", 76), buildRuleCondition("riskAppetite", "<", 44)],
    resumeConditions: [buildRuleCondition("tightness", "<", 66), buildRuleCondition("riskAppetite", ">", 54)],
  },
];
const comparedWithAug31 = { recordDate: "2026-08-31", label: "Aug 31" };
const movedWeek: ReportDynamics = {
  directionLabel: "deteriorating",
  totalSignalChanges: 2,
  regimeChanged: false,
  changedSignals: [
    { key: "tightness", label: "Funding pressure", delta: 27 },
    { key: "riskAppetite", label: "Risk appetite", delta: -13 },
  ],
  anomalySignals: [],
  comparedWith: comparedWithAug31,
};

const buildHomepage = ({
  withRails = true,
  dynamics = movedWeek,
  showOfflineBadge = false,
  historicalBanner = null,
}: {
  withRails?: boolean;
  dynamics?: ReportDynamics;
  showOfflineBadge?: boolean;
  historicalBanner?: { banner: string; liveHref: string; timeMachineHref: string } | null;
} = {}) =>
  ({
    weeklyDecisionCardModel: buildWeeklyDecisionCardModel({
      decision: {
        actionNowShort: "Hold net-new hiring until funding pressure eases.",
        reportDynamics: dynamics,
        actionStripItems: withRails ? pauseAndResumeLines : [],
      },
      diagnostics: {
        currentScores: scores,
        postureTrajectory: {
          current: scores,
          previous: { tightness: 63, riskAppetite: 56 },
          weeklyDelta: { tightness: 27, riskAppetite: -13 },
          thresholds: { tightness: 73, riskAppetite: 50 },
        },
      },
    }),
    reportShell: {
      regime: "SCARCITY",
      recordDateLabel: "Sep 25, 2026",
      provenance: {
        sourceLabel: "Canonical ingestion (FRED)",
        recordDateLabel: "Sep 25, 2026",
        timestampLabel: "Sep 28, 2026",
        ageLabel: "3 days old",
        statusLabel: PROVENANCE_STATUS.canonical,
      },
      historicalBanner,
      showOfflineBadge,
    },
  }) satisfies Parameters<typeof buildBriefImagePayload>[0];

/** The paste's own shape: the parts in print order, joined. */
const asPasted = (reading: ScoreReadingParts) =>
  [reading.reading, reading.line, reading.distance, reading.previous, reading.resume]
    .filter((part) => part !== null)
    .join(" · ");

describe("buildBriefImagePayload", () => {
  it("prints both scores against the lines that change the call, and the earlier reading under its date", () => {
    const payload = buildBriefImagePayload(buildHomepage());

    assert.deepEqual(payload.readings.map(asPasted), [
      "Funding pressure 90 of 100 (money is hard to raise) · pause line 76 · 14 pts above · was 63 on Aug 31 · resume line 66 (24 pts away)",
      "Risk appetite 43 of 100 (investors are selective about risk) · pause line 44 · 1 pt below · was 56 on Aug 31 · resume line 54 (11 pts away)",
    ]);
  });

  it("is the derivation /share and every export call, not a second one", () => {
    const payload = buildBriefImagePayload(buildHomepage());

    assert.deepEqual(
      payload.readings.map(asPasted),
      buildScoreReferenceLines({
        scores,
        rails: buildSharedCorridorRails(pauseAndResumeLines, scores),
        previous: { tightness: 63, riskAppetite: 56, comparedWith: comparedWithAug31 },
      }),
    );
  });

  it("dates the earlier reading instead of calling it last week, because it is the last month-end", () => {
    // The week's dynamics carry a move (27 points). It is the change since the previous
    // time-machine snapshot, and that cache is monthly: a read on Sep 18 and one on Sep 25 are
    // both compared with Aug 31. "last week 63" would put a four-week-old number under a
    // one-week label, so the card names the date the loader recorded. If the cache ever carries
    // weekly snapshots the date the loader records changes with it and this card follows.
    assert.equal(getPreviousTimeMachineSnapshot("2026-09-18")?.record_date, "2026-08-31");
    assert.equal(getPreviousTimeMachineSnapshot("2026-09-25")?.record_date, "2026-08-31");

    const payload = buildBriefImagePayload(buildHomepage());
    const text = collectText(renderBriefImage(payload));

    assert.deepEqual(payload.readings.map((reading) => reading.previous), ["was 63 on Aug 31", "was 56 on Aug 31"]);
    assert.match(text, /was 63 on Aug 31/);
    assert.doesNotMatch(text, /last week/i);
  });

  it("prints no earlier reading on a week with no comparison, rather than a flat one", () => {
    const noComparison: ReportDynamics = {
      directionLabel: "unavailable",
      totalSignalChanges: 0,
      regimeChanged: false,
      changedSignals: [],
      anomalySignals: [],
    };
    const payload = buildBriefImagePayload(buildHomepage({ dynamics: noComparison }));

    assert.deepEqual(payload.readings.map((reading) => reading.previous), [null, null]);
    assert.doesNotMatch(collectText(renderBriefImage(payload)), /last week|was \d+ on/i);
  });

  it("says last week only for a comparison whose source did not date it", () => {
    const undated: ReportDynamics = { ...movedWeek, comparedWith: undefined };
    const payload = buildBriefImagePayload(buildHomepage({ dynamics: undated }));

    assert.deepEqual(payload.readings.map((reading) => reading.previous), ["last week 63", "last week 56"]);
  });

  it("falls back to the line the call itself changes at when no lever states a pause line", () => {
    const payload = buildBriefImagePayload(buildHomepage({ withRails: false }));

    // The model's own call-change lines (73 and 50 here), never a number the card made up.
    assert.deepEqual(payload.readings.map((reading) => reading.line), ["change line 73", "change line 50"]);
    assert.deepEqual(payload.readings.map((reading) => reading.resume), [null, null]);
  });

  it("names the source in a reader's words, and says when it is not this week's live reading", () => {
    assert.equal(
      buildBriefImagePayload(buildHomepage()).sourceLabel,
      "US Treasury and the St. Louis Fed (FRED), plus a curated startup-market snapshot",
    );
    assert.equal(buildBriefImagePayload(buildHomepage()).contextLabel, undefined);
    assert.equal(buildBriefImagePayload(buildHomepage({ showOfflineBadge: true })).contextLabel, "Saved reading, not live");

    const historical = buildHomepage({
      historicalBanner: { banner: "Historical mode active · March 2026", liveHref: "/", timeMachineHref: "/history" },
    });
    assert.equal(buildBriefImagePayload(historical).contextLabel, "Historical mode active · March 2026");

    const requestedMonthNotOnRecord = parseImageBriefRequestContext(new URLSearchParams("month=3&year=2019"));
    assert.equal(
      buildBriefImagePayload(buildHomepage(), requestedMonthNotOnRecord).contextLabel,
      "That month is not on record",
    );
  });
});

/**
 * Satori's own rule, verbatim: a <div> whose children are anything other than a
 * single string must declare display. Breaking it throws *during* the render,
 * after the response headers are out -- so the route answers 200 with an empty
 * body and the decision card downloads as a 0-byte PNG. Nothing short of
 * rendering catches that, which is how it shipped unnoticed.
 */
const findSatoriLayoutViolations = (node: ReactNode, path = "root"): string[] => {
  if (!isValidElement<{ children?: ReactNode; style?: Record<string, unknown> }>(node)) return [];

  const { children, style } = node.props;
  const tag = typeof node.type === "string" ? node.type : "component";
  const here = `${path} > ${tag}`;
  const display = style?.display;
  const violations: string[] = [];

  if (tag === "div" && children !== undefined && children !== null && typeof children !== "string") {
    if (display !== "flex" && display !== "none" && display !== "contents") {
      violations.push(`${here} holds a ${Array.isArray(children) ? "list" : typeof children} child without an explicit display`);
    }
  }

  const list = Array.isArray(children) ? children : [children];
  return list.reduce<string[]>(
    (found, child, index) => found.concat(findSatoriLayoutViolations(child, `${here}[${index}]`)),
    violations,
  );
};

/** Every font size set anywhere on the card. */
const fontSizes = (node: ReactNode): number[] => {
  if (Array.isArray(node)) return node.flatMap(fontSizes);
  if (!isValidElement<{ children?: ReactNode; style?: { fontSize?: unknown } }>(node)) return [];
  const own = typeof node.props.style?.fontSize === "number" ? [node.props.style.fontSize] : [];
  return own.concat(fontSizes(node.props.children));
};

const ogFontFaces = [
  { name: OG_FONT_DISPLAY, data: readFileSync("public/fonts/og/archivo-semicondensed-700.ttf"), weight: 700 as const, style: "normal" as const },
  { name: OG_FONT_BODY, data: readFileSync("public/fonts/og/archivo-400.ttf"), weight: 400 as const, style: "normal" as const },
  { name: OG_FONT_BODY, data: readFileSync("public/fonts/og/archivo-600.ttf"), weight: 600 as const, style: "normal" as const },
  { name: OG_FONT_STAMP, data: readFileSync("public/fonts/og/archivo-expanded-700.ttf"), weight: 700 as const, style: "normal" as const },
];

const briefImageProps: BriefImageProps = buildBriefImagePayload(buildHomepage());

/** The longest card the route can be asked for: a full-length call, every part on both rows, a long scope and source. */
const fullCardProps: BriefImageProps = {
  ...briefImageProps,
  decision:
    "Hold net-new hiring and freeze discretionary spend until funding pressure falls back under the resume line and stays there for two readings in a row.",
  contextLabel: "Historical mode active · March 2026 · Fintech · Series B",
  sourceLabel: "US Treasury and the St. Louis Fed (FRED), plus a curated startup-market snapshot",
  readings: buildBriefImagePayload(buildHomepage()).readings.map((reading) => ({ ...reading, value: "100" })),
};

describe("brief decision card render", () => {
  it("draws every part of both readings, in the words the pastes use", () => {
    const text = collectText(renderBriefImage(briefImageProps));

    for (const reading of briefImageProps.readings) {
      assert.notEqual(reading.resume, null, "the fixture states a resume line for both scores");
      for (const part of [reading.label, reading.value, reading.meaning, reading.line, reading.distance, reading.resume]) {
        assert.ok(part !== null && text.includes(part), `the card should print "${part}"`);
      }
    }
  });

  it("prints the earlier reading when a reading carries one, in the position every paste puts it", () => {
    const readings = buildScoreReadings({
      scores,
      previous: { tightness: 63, riskAppetite: 56, comparedWith: comparedWithAug31 },
    });
    const text = collectText(renderBriefImage({ ...briefImageProps, readings }));

    assert.match(text, /change line 70 · 20 pts above · was 63 on Aug 31/);
    assert.match(text, /change line 50 · 7 pts below · was 56 on Aug 31/);
  });

  it("keeps the longest dated detail line on one row, which is what the 800px budget assumes", () => {
    // A detail line that wraps is a fourth line in a reading, and the card has no room for one
    // (`briefImageTemplate.tsx` measures 769px with three). The text column is the content width
    // less the reading's padding, the widest value column (three digits) and the gap.
    const columnWidth = 1088 - 48 - 3 * 52 - 28;
    const longest = buildScoreReadings({
      scores: { tightness: 100, riskAppetite: 100 },
      previous: {
        tightness: 100,
        riskAppetite: 100,
        comparedWith: { recordDate: "2025-12-31", label: "Dec 31, 2025" },
      },
    });

    for (const reading of longest) {
      const detail = [reading.line, reading.distance, reading.previous].filter((part) => part !== null).join(" \u00b7 ");
      assert.equal(wrappedLines(detail, 24, columnWidth, SANS_EM).length, 1, `"${detail}" wraps`);
    }
  });

  it("names the weather once, and only a source the scores actually come from", () => {
    const text = collectText(renderBriefImage(briefImageProps));

    assert.equal(text.match(/freezing/gi)?.length, 1, "the weather word printed twice on the old card");
    assert.match(text, /Source: US Treasury and the St\. Louis Fed \(FRED\), plus a curated startup-market snapshot/);
    // Yahoo Finance feeds the SaaS comps only and contributes nothing to either score.
    assert.doesNotMatch(text, /yahoo/i);
    assert.match(text, /WITHIN REACH OF THE LINE/);
    assert.doesNotMatch(text, /\bMED\b/);
  });

  it("sets nothing under 22px, the floor a feed leaves legible", () => {
    // Both the weekly card and this one are seen at about 40% of their drawn size; the old
    // brief card set its confidence chip at 13px and its data line at 12px.
    assert.ok(Math.min(...fontSizes(renderBriefImage(fullCardProps))) >= 22);
  });

  it("cuts a long call at a word instead of running it onto the readings", () => {
    const text = collectText(renderBriefImage({ ...fullCardProps, decision: "Hold hiring and protect runway ".repeat(20) }));

    const start = text.indexOf("Hold hiring");
    const end = text.indexOf("\u2026");
    assert.ok(end > start, "a call that does not fit ends in an ellipsis");
    // Three lines at the smallest call size (42px across the 1088px content width), at the
    // per-character width the wrap estimate uses for the call's face.
    const perLine = Math.floor(1088 / (42 * DISPLAY_EM));
    assert.ok(end - start + 1 <= 3 * perLine, `the call ran to ${end - start + 1} characters`);
  });

  it("keeps a long scope to the stamp's row instead of wrapping it onto the call", () => {
    const scope = "Historical mode active · March 2026 · Fintech · A ticker and company name of the longest length the request allows · Series B+";
    const text = collectText(renderBriefImage({ ...fullCardProps, contextLabel: scope }));
    const printed = text.slice(text.indexOf("Historical mode"), text.indexOf("\u2026") + 1);

    assert.ok(printed.endsWith("\u2026"), "a scope that does not fit ends in an ellipsis");
    // One line at 22px across the row beside the stamp holds about 78 characters.
    assert.ok(printed.length <= 78, `the scope ran to ${printed.length} characters`);
  });

  it("counts an arrow as the full em it draws, so a line of them wraps", () => {
    // Twenty characters fit at 24px in this width by the average. Ten arrows and the spaces
    // between them are 19 characters, but draw 11.9em (285px) in a 235px line.
    const width = 24 * SANS_EM * 20;
    const arrows = Array.from({ length: 10 }, () => "→").join(" ");
    const letters = Array.from({ length: 10 }, () => "a").join(" ");

    assert.equal(wrappedLines(letters, 24, width, SANS_EM).length, 1);
    assert.equal(wrappedLines(arrows, 24, width, SANS_EM).length, 2, "the arrows were counted as letters");
    assert.equal(wrappedLines(arrows.replace(/→/g, "—"), 24, width, SANS_EM).length, 2);
  });

  it("emits no <div> that satori would reject mid-render", () => {
    assert.deepEqual(findSatoriLayoutViolations(renderBriefImage(briefImageProps)), []);
    assert.deepEqual(findSatoriLayoutViolations(renderBriefImage(fullCardProps)), []);
  });

  it("keeps the arrow the faces draw, and writes comparisons as words", () => {
    const props = {
      ...briefImageProps,
      decision: "Hold hiring \u2192 reassess next week if funding pressure \u2265 76.",
      contextLabel: "Tightness \u2264 66",
    };
    const imageText = collectText(renderBriefImage(props));

    assert.doesNotMatch(imageText, /[\u2264\u2265]/);
    assert.match(imageText, /Hold hiring \u2192 reassess/);
    assert.match(imageText, /funding pressure at or above 76/);
    assert.match(imageText, /Tightness at or below 66/);
    // Until 2026-10-07 the faces had no arrow and the cards printed "->";
    // tests/fontAssets.test.ts holds that the card faces draw it now.
    assert.equal(toImageSafeText("a \u2264 b \u2265 c \u2192 d"), "a at or below b at or above c \u2192 d");
  });

  it("produces a non-empty PNG, for an ordinary week and for the fullest card", async () => {
    for (const props of [briefImageProps, fullCardProps]) {
      const image = new ImageResponse(renderBriefImage(props), {
        width: 1200,
        height: 800,
        fonts: ogFontFaces,
      });

      const body = await image.arrayBuffer();

      assert.ok(body.byteLength > 1000, `expected a rendered PNG, got ${body.byteLength} bytes`);
      assert.deepEqual([...new Uint8Array(body.slice(0, 4))], [0x89, 0x50, 0x4e, 0x47]);
    }
  });
});

describe("brief chart OG template", () => {
  it("labels a published brief by its date, with a key to the quarterly bars", async () => {
    const { renderBriefChartOgImage } = await import("../app/api/og/briefChartTemplate");
    const chart = renderBriefChartOgImage({
      posture: "Sunny",
      weekLabel: "Jul 30, 2026",
      regime: "EXPANSION",
      points: [
        { label: "2026-Q1", regime: "EXPANSION", intensity: 0.8 },
        { label: "2026-Q2", regime: "EXPANSION", intensity: 0.7 },
      ],
    });

    const text = collectText(chart);
    assert.match(text, /Published brief/);
    assert.match(text, /Week of Jul 30, 2026/);
    assert.doesNotMatch(text, /\d{4}-w\d+/, "the archive slug is not a date a reader knows");
    assert.match(text, /Conditions by quarter/);
    for (const label of ["Freezing", "Cloudy", "Stormy", "Sunny"]) assert.match(text, new RegExp(label));
  });
});

