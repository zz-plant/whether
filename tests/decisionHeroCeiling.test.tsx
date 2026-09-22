import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { DecisionHero } from "../app/components/DecisionHero";

const mockAny: any = mock;

/* Same reason as decisionHeroSignalBreakdown: a descendant reads the app router
   and renderToStaticMarkup mounts none, so this file installs its own rather
   than depending on another suite having run first. */
mockAny.module("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

/*
 * `tightness` saturates above roughly a 4% base rate: the components
 * over-subscribe the cap, the published score pins to 100, and its week-over-week
 * delta becomes 0 and stays there while the underlying pressure keeps moving.
 * The hero rendered the delta row only when the delta was non-zero, so at the
 * one moment conditions were most extreme the direction indicator vanished and
 * the reader had to infer from the ceiling tag that the silence meant "off the
 * top" rather than "flat".
 */
describe("DecisionHero at the tightness ceiling", () => {
  const baseProps = {
    boldnessScore: 58,
    boldnessDelta: -2,
    regime: "DEFENSIVE" as const,
    signalDirection: "tighten" as const,
    recordDate: "2026-08-14",
    fetchedAt: "2026-08-15",
    signalData: { tightnessThreshold: 68 },
  };

  it("says a clipped score cannot show a move, instead of showing nothing", () => {
    const html = renderToStaticMarkup(
      <DecisionHero {...baseProps} tightness={100} tightnessDelta={0} tightnessPressure={148} tightnessSaturated />,
    );

    assert.match(html, /Off the top of the scale\. The score can’t rise further, so it can’t show a move\./);
    assert.match(html, /would read 148/, "the raw pressure stays visible beside it");
    assert.doesNotMatch(html, /\bclipped\b|\bceiling\b|100-point/i, "said in the reader's terms, not the scoring code's");
  });

  it("stays silent when the score is simply flat and not clipped", () => {
    const html = renderToStaticMarkup(
      <DecisionHero {...baseProps} tightness={64} tightnessDelta={0} />,
    );

    assert.ok(!html.includes("Off the top of the scale"), "a flat week is not a clipped one");
  });

  it("shows the move when there is one", () => {
    const html = renderToStaticMarkup(
      <DecisionHero {...baseProps} tightness={64} tightnessDelta={3} />,
    );

    assert.ok(!html.includes("Off the top of the scale"));
    assert.match(html, /pts/);
  });
});
