import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AreaTable } from "../app/components/ui/areaTable";

import * as nextNavigation from "next/navigation";
import { DecisionHero } from "../app/components/DecisionHero";
import { ThresholdLadder } from "../app/components/illustrations/ThresholdLadder";
import { formatConfidenceChipLabel } from "../lib/report/reportFormatting";
import { parenthesizePointsToLine } from "../lib/report/operatingCalls";
import { compositeSignalScales } from "../lib/report/signalTranslations";

const mockAny: any = mock;

/* Spread the real module and override only what is needed — a stub listing a
   few exports installs a `next/navigation` with only those for every file in
   the run, which is the shuffled-order link failure CLAUDE.md records. */
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));


describe("reader-facing number formatting", () => {
  it("does not run a threshold into the distance that follows it", () => {
    /* The readout prints the line's own value and then how far the reading sits
       from it, so the two numbers land adjacent: `66` followed by `11 pts away`
       reads as "66 11" on first glance. The area table draws them as separate
       blocks for the same reason the export formats bracket the distance. */
    const html = renderToStaticMarkup(
      <AreaTable
        caption="test"
        rows={[{ area: "hiring", rule: "Backfills only.", pause: { line: "Funding pressure > 76", distance: "11 pts away" } }]}
      />,
    );

    assert.doesNotMatch(html, /76\s*11 pts away/, "two numbers still collide");
    assert.match(html, /Funding pressure &gt; 76<span class="block[^"]*">11 pts away<\/span>/, "the distance is not on its own line");
  });

  it("brackets every distance, including the ones that read as words", () => {
    assert.equal(parenthesizePointsToLine(11, "resume", false), "(11 pts away)");
    assert.equal(parenthesizePointsToLine(0, "pause", true), "(crossed)");
    assert.equal(parenthesizePointsToLine(0, "pause", false), "(at the line)");
    assert.equal(parenthesizePointsToLine(undefined, "pause", false), "(—)");
  });

  it("states confidence as a word, not an engine code", () => {
    // Confidence is a cell of the trust strip under the call now, rather than a
    // chip inside the hero card. The rule is the same: the reader gets the word.
    const html = renderToStaticMarkup(
      <DecisionHero
        regime="DEFENSIVE"
        weeklyCall="Keep approvals staged."
        trust={{
          recordDateLabel: "Sep 18, 2026",
          sourcesLive: true,
          sourcesLabel: "All sources live",
          confidenceLabel: "MED",
          couldChangeNextWeek: false,
        }}
      />,
    );

    assert.ok(html.includes("Medium"), "the strip still prints the raw code");
    assert.doesNotMatch(html, /\bMED\b/);
  });

  it("passes an unknown confidence value through rather than reshaping it", () => {
    /* The two surfaces that print this hold display strings whose provenance
       the type system has lost. Inventing a word for an unrecognised value
       would be a claim nothing produced. */
    assert.equal(formatConfidenceChipLabel("MED"), "Medium confidence");
    assert.equal(formatConfidenceChipLabel("LOW"), "Low confidence");
    assert.equal(formatConfidenceChipLabel("HIGH"), "High confidence");
    assert.equal(formatConfidenceChipLabel("Unverified"), "Unverified");
  });
});

describe("mirrored rails", () => {
  /*
   * The two hero rails run opposite axes — `invert` flips the falling signal so
   * trouble sits right on both — and that flip was announced only by the 8px
   * numeric end-labels. A reader comparing marker positions across the pair got
   * risk appetite backwards unless they read them.
   */
  const renderRail = (invert: boolean, signalKey: "tightness" | "riskAppetite") =>
    renderToStaticMarkup(
      <ThresholdLadder
        idPrefix={`rail-${signalKey}`}
        min={0}
        max={100}
        current={invert ? 42 : 77}
        trigger={invert ? 44 : 76}
        reversal={invert ? 54 : 66}
        hysteresisBand
        invert={invert}
        signalLabel="Rail"
        scaleDirection={compositeSignalScales[signalKey].directionLabel}
        viewBoxWidth={300}
      />,
    );

  /* The rail's `<desc>` repeats the whole scale-direction string for assistive
     tech, so a bare `indexOf` finds the word there rather than in the caption
     that is drawn. Read the two end captions — the `y="11"` runs — instead. */
  const endCaptions = (svg: string) => {
    const matches = [...svg.matchAll(/<text x="[\d.]+" y="11"[^>]*text-anchor="(start|end)"[^>]*>([^<]*)<\/text>/g)];
    /* Built rather than cast: `Object.fromEntries` widens to a string index and
       the assertion put the anchor names back by hand, which is the type system
       vouching for a shape the regex is not guaranteed to produce. */
    const captions: { start?: string; end?: string } = {};
    for (const match of matches) {
      if (match[1] === "start") captions.start = match[2];
      if (match[1] === "end") captions.end = match[2];
    }
    return captions;
  };

  it("names both ends of each rail in words", () => {
    const captions = endCaptions(renderRail(false, "tightness"));

    assert.equal(captions.start, "easier funding");
    assert.equal(captions.end, "harder funding");
  });

  it("swaps the words with the axis so both rails put trouble on the right", () => {
    /* This is the whole reason `invert` exists, and until now the only thing
       announcing it was the numeric end-label. Risk appetite trips low, so on
       its rail the risk-averse end is the trouble end and has to be drawn
       right — the same side as "harder funding" on the rail beside it. */
    const falling = endCaptions(renderRail(true, "riskAppetite"));

    assert.equal(falling.start, "risk-hungry investors");
    assert.equal(falling.end, "risk-averse investors");
  });
});
