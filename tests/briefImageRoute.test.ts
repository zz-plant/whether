import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { ImageResponse } from "next/og";
import { isValidElement, type ReactNode } from "react";
import { buildBriefImagePayload } from "../app/api/image/brief/route";
import { renderBriefImage } from "../lib/image/briefImageTemplate";
import { OG_FONT_BODY, OG_FONT_DISPLAY, toImageSafeText } from "../lib/image/ogFonts";
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

describe("buildBriefImagePayload", () => {
  it("passes weekly guardrail text and model tightness pause threshold to the image template", () => {
    const weeklyDecisionCardModel = buildWeeklyDecisionCardModel({
      decision: {
        guardrailThreshold: "Pause net-new hiring if tightness rises above 73.",
      },
      diagnostics: {
        currentScores: {
          tightness: 68,
          riskAppetite: 52,
        },
        postureTrajectory: {
          current: { tightness: 68, riskAppetite: 52 },
          previous: { tightness: 66, riskAppetite: 54 },
          weeklyDelta: { tightness: 2, riskAppetite: -2 },
          thresholds: { tightness: 73, riskAppetite: 50 },
        },
        regimeDistance: {
          dimensionLabel: "Tightness",
          dimensionKey: "tightness",
          currentValue: 68,
          thresholdValue: 73,
          pointsToFlip: 5,
          thresholdDirection: "riseAbove",
        },
      },
    });
    const homepage = {
      weeklyDecisionCardModel,
      reportShell: {
        regime: "DEFENSIVE",
        recordDateLabel: "Mar 6, 2026",
      },
    } satisfies Parameters<typeof buildBriefImagePayload>[0];

    const payload = buildBriefImagePayload(homepage);

    assert.equal(payload.guardrail, "Pause net-new hiring if tightness rises above 73.");
    assert.equal(payload.pauseThreshold, 73);

    const imageText = collectText(renderBriefImage(payload));
    assert.match(imageText, /Pause net-new hiring if tightness rises above 73\./);
    assert.doesNotMatch(imageText, /Until tightness reaches 80/);
    assert.doesNotMatch(imageText, /80/);
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

const ogFontFaces = [
  { name: OG_FONT_DISPLAY, data: readFileSync("public/fonts/og/ibm-plex-serif-600.ttf"), weight: 600 as const, style: "normal" as const },
  { name: OG_FONT_BODY, data: readFileSync("public/fonts/og/ibm-plex-sans-400.ttf"), weight: 400 as const, style: "normal" as const },
  { name: OG_FONT_BODY, data: readFileSync("public/fonts/og/ibm-plex-sans-600.ttf"), weight: 600 as const, style: "normal" as const },
];

/** Threshold copy reaches the card carrying the symbols the report model uses. */
const briefImageProps = {
  decision: "Hold hiring \u2192 reassess next week with measurable outcomes.",
  regime: "EXPANSION",
  postureLabel: "Guarded Expansion",
  tightness: 49,
  tightnessDelta: 0,
  confidenceLabel: "MED",
  recordDate: "Aug 19, 2026",
  briefLabel: "Weekly Brief",
  contextLabel: "Consumer \u00b7 Series A",
  guardrail: "Pause net-new hiring if tightness \u2265 76.",
  pauseThreshold: 66,
  flipConditions: ["Tightness \u2264 66 for 2 consecutive updates"],
};

describe("brief decision card render", () => {
  it("emits no <div> that satori would reject mid-render", () => {
    const violations = findSatoriLayoutViolations(renderBriefImage(briefImageProps));

    assert.deepEqual(violations, []);
  });

  it("rewrites glyphs the OG font subset cannot draw", () => {
    const imageText = collectText(renderBriefImage(briefImageProps));

    // The faces are Latin subsets; an uncovered glyph sends satori to a Google
    // font download, and that failing aborts the render the same way.
    assert.doesNotMatch(imageText, /[\u2264\u2265\u2192]/);
    assert.match(imageText, /tightness at or above 76/);
    assert.match(imageText, /Tightness at or below 66/);
    assert.equal(toImageSafeText("a \u2264 b \u2265 c \u2192 d"), "a at or below b at or above c -> d");
  });

  it("produces a non-empty PNG", async () => {
    const image = new ImageResponse(renderBriefImage(briefImageProps), {
      width: 1200,
      height: 800,
      fonts: ogFontFaces,
    });

    const body = await image.arrayBuffer();

    assert.ok(body.byteLength > 1000, `expected a rendered PNG, got ${body.byteLength} bytes`);
    assert.deepEqual([...new Uint8Array(body.slice(0, 4))], [0x89, 0x50, 0x4e, 0x47]);
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

