import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

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

const heroProps = {
  tightness: 77,
  tightnessDelta: 14,
  riskAppetite: 42,
  riskAppetiteDelta: -14,
  boldnessScore: 36,
  boldnessDelta: -14,
  regime: "SCARCITY",
  postureLabel: "Contraction",
  signalDirection: "tighten" as const,
  recordDate: "Sep 15, 2026",
  fetchedAt: "Sep 15, 2026",
  signalData: { tightnessThreshold: 70, riskAppetiteThreshold: 50 },
  boundedConditions: {
    pause: [
      { metric: "tightness" as const, operator: ">" as const, value: 76, label: "Funding pressure > 76" },
      { metric: "riskAppetite" as const, operator: "<" as const, value: 44, label: "Risk appetite < 44" },
    ],
    resume: [
      { metric: "tightness" as const, operator: "<" as const, value: 66, label: "Funding pressure < 66" },
      { metric: "riskAppetite" as const, operator: ">" as const, value: 54, label: "Risk appetite > 54" },
    ],
  },
  guardrail: "Funding pressure > 76",
};

describe("reader-facing number formatting", () => {
  it("does not run a threshold into the distance that follows it", () => {
    /* The readout prints the line's own value and then how far the reading sits
       from it, so the two numbers land adjacent: `66` followed by `11 pts away`
       reads as "66 11" on first glance. The export formats had already solved
       this by bracketing the distance. */
    const html = renderToStaticMarkup(<DecisionHero {...heroProps} />);

    assert.doesNotMatch(html, /66\s*<[^>]*>\s*11 pts away/, "two numbers still collide");
    assert.ok(html.includes("(11 pts away)"), "the distance is not bracketed");
  });

  it("brackets every distance, including the ones that read as words", () => {
    assert.equal(parenthesizePointsToLine(11, "resume", false), "(11 pts away)");
    assert.equal(parenthesizePointsToLine(0, "pause", true), "(crossed)");
    assert.equal(parenthesizePointsToLine(0, "pause", false), "(at the line)");
    assert.equal(parenthesizePointsToLine(undefined, "pause", false), "(—)");
  });

  it("states confidence as a word, not an engine code", () => {
    const html = renderToStaticMarkup(<DecisionHero {...heroProps} confidenceLabel="MED" />);

    assert.ok(html.includes("Medium confidence"), "the hero still prints the raw code");
    assert.doesNotMatch(html, /Confidence MED\b/);
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
     that is drawn. Read the two end captions — the `y="9"` runs — instead. */
  const endCaptions = (svg: string) => {
    const matches = [...svg.matchAll(/<text x="[\d.]+" y="9"[^>]*text-anchor="(start|end)"[^>]*>([^<]*)<\/text>/g)];
    return Object.fromEntries(matches.map((match) => [match[1], match[2]])) as {
      start?: string;
      end?: string;
    };
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
