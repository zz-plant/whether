import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { ImageResponse } from "next/og";
import { isValidElement, type ReactNode } from "react";
import { renderCompareOgImage, type CompareOgImageProps } from "../app/api/og/compareTemplate";
import { loadComparePreview } from "../lib/image/compareImagePayload";
import { toImageSafeText } from "../lib/image/ogFonts";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";
import { findSatoriLayoutViolations, ogFontFaces } from "./fixtures/ogCardLayout";

serveUnreachableUpstreams();

const collectText = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return collectText(node.props.children);
  return "";
};

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

  it("writes comparisons as words, and keeps the arrow the faces draw", () => {
    const imageText = collectText(renderCompareOgImage(baseProps));
    assert.doesNotMatch(imageText, /[\u2264\u2265]/);
    assert.equal(toImageSafeText("a \u2264 b \u2265 c \u2192 d"), "a at or below b at or above c \u2192 d");
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
