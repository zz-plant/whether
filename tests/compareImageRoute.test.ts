import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { ImageResponse } from "next/og";
import { isValidElement, type ReactNode } from "react";
import { renderCompareOgImage, type CompareOgImageProps } from "../app/api/og/compareTemplate";
import { loadComparePreview } from "../lib/image/compareImagePayload";
import { OG_FONT_BODY, OG_FONT_DISPLAY, OG_FONT_STAMP, toImageSafeText } from "../lib/image/ogFonts";

const collectText = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return collectText(node.props.children);
  return "";
};

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
  { name: OG_FONT_DISPLAY, data: readFileSync("public/fonts/og/archivo-semicondensed-700.ttf"), weight: 700 as const, style: "normal" as const },
  { name: OG_FONT_BODY, data: readFileSync("public/fonts/og/archivo-400.ttf"), weight: 400 as const, style: "normal" as const },
  { name: OG_FONT_BODY, data: readFileSync("public/fonts/og/archivo-600.ttf"), weight: 600 as const, style: "normal" as const },
  { name: OG_FONT_STAMP, data: readFileSync("public/fonts/og/archivo-expanded-700.ttf"), weight: 700 as const, style: "normal" as const },
];

const baseProps: CompareOgImageProps = {
  headline: "Mar 2024 (Cloudy) against Feb 2024 (Sunny)",
  epochA: {
    label: "Mar 2024",
    regime: "DEFENSIVE",
    postureLabel: "Selective footing",
    tightness: 61,
    boldnessScore: 48,
    curveSpread: 0.34,
  },
  epochB: {
    label: "Mar 2026",
    regime: "EXPANSION",
    postureLabel: "Guarded Expansion",
    tightness: 49,
    boldnessScore: 60,
    curveSpread: -0.12,
  },
};

describe("epoch compare OG template", () => {
  it("emits no <div> that satori would reject mid-render", () => {
    const violations = findSatoriLayoutViolations(renderCompareOgImage(baseProps));
    assert.deepEqual(violations, []);
  });

  it("uses only glyphs the OG font subset can draw", () => {
    const imageText = collectText(renderCompareOgImage(baseProps));
    assert.doesNotMatch(imageText, /[\u2264\u2265\u2192]/);
    assert.equal(toImageSafeText("a \u2264 b \u2265 c \u2192 d"), "a at or below b at or above c -> d");
  });

  it("produces a non-empty PNG", async () => {
    const image = new ImageResponse(renderCompareOgImage(baseProps), {
      width: 1200,
      height: 630,
      fonts: ogFontFaces,
    });

    const body = await image.arrayBuffer();

    assert.ok(body.byteLength > 1000, `expected a rendered PNG, got ${body.byteLength} bytes`);
    assert.deepEqual([...new Uint8Array(body.slice(0, 4))], [0x89, 0x50, 0x4e, 0x47]);
  });
});

describe("loadComparePreview", () => {
  it("labels the default comparison as this week against its fixed baseline", async () => {
    const preview = await loadComparePreview();
    assert.equal(preview.eyebrow, "Compare periods");
    /* Period A is the live week when no pair is given; it used to borrow B's month. */
    assert.equal(preview.epochA.label, "This week");
    assert.match(preview.headline, /^This week \(\w+\) against Mar 2020 \(\w+\)$/);
  });

  /* Dec 2008 is not on record, so the loader served the live week — and the card
     printed this week's scores under "Dec 2008". */
  it("does not put a month's name on a reading the archive does not hold", async () => {
    const preview = await loadComparePreview({ yearA: "2008", monthA: "12", yearB: "2026", monthB: "8" });
    assert.equal(preview.epochA.label, "This week");
  });

  it("names the months it compares and never the retired score name", async () => {
    const preview = await loadComparePreview({ yearA: "2020", monthA: "3", yearB: "2026", monthB: "8" });
    assert.equal(preview.epochA.label, "Mar 2020");
    assert.equal(preview.epochB.label, "Aug 2026");
    assert.match(preview.headline, /^Mar 2020 \(\w+\) against Aug 2026 \(\w+\)$/);
    const text = collectText(renderCompareOgImage(preview));
    assert.doesNotMatch(text, /boldness/i);
    assert.doesNotMatch(text, /(\w+) — \1/, "no \"Freezing — Freezing\"");
  });
});
