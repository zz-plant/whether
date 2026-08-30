import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { ImageResponse } from "next/og";
import { isValidElement, type ReactNode } from "react";
import { renderCompareOgImage, type CompareOgImageProps } from "../app/api/og/compareTemplate";
import { loadComparePreview } from "../lib/image/compareImagePayload";
import { OG_FONT_BODY, OG_FONT_DISPLAY, toImageSafeText } from "../lib/image/ogFonts";

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
  { name: OG_FONT_DISPLAY, data: readFileSync("public/fonts/og/fraunces-600.ttf"), weight: 600 as const, style: "normal" as const },
  { name: OG_FONT_BODY, data: readFileSync("public/fonts/og/ibm-plex-sans-400.ttf"), weight: 400 as const, style: "normal" as const },
  { name: OG_FONT_BODY, data: readFileSync("public/fonts/og/ibm-plex-sans-600.ttf"), weight: 600 as const, style: "normal" as const },
];

const baseProps: CompareOgImageProps = {
  headline: "Cloudy to Sunny · boldness +12 across two epochs",
  epochA: {
    label: "Mar 2024",
    recordDate: "Mar 3, 2024",
    regime: "DEFENSIVE",
    postureLabel: "Selective footing",
    tightness: 61,
    boldnessScore: 48,
    curveSpread: 0.34,
  },
  epochB: {
    label: "Mar 2026",
    recordDate: "Mar 6, 2026",
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
    assert.equal(toImageSafeText("a \u2264 b \u2265 c \u2192 d"), "a <= b >= c -> d");
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
  it("defaults to a fixed comparison when no epochs are selected", async () => {
    const preview = await loadComparePreview();
    assert.equal(preview.eyebrow, "Epoch Comparison");
    assert.match(preview.headline, /across two epochs/);
  });
});
