import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { DecisionHero } from "../app/components/DecisionHero";
import { RegimeRadar } from "../app/components/home/RegimeRadar";
import { WhatChangedSection } from "../app/components/home/WhatChangedSection";
import { ScoreLadder } from "../app/components/ui/scoreLadder";
import { describeHeldAreasForCard, type SignalChangeRow } from "../lib/report/home/homeSectionModel";
import { describeLatitudeAgainstConditions } from "../lib/report/trackRecordCopy";

/*
 * What a first reader could not work out from the page alone (2026-10-14):
 * which way each score is bad, how the weather word relates to the five
 * areas, which corner of the conditions map is which, and that a score at the
 * top of its scale is not "unchanged".
 */

const slot = (met: boolean) => ({ line: "Funding pressure > 76", distance: "", points: 4, met, metric: "tightness" as const });

describe("the card ties the weather word to the areas", () => {
  it("names the areas on hold under the condition", () => {
    const rows = [
      { area: "hiring" as const, pause: slot(true) },
      { area: "product-tempo" as const, pause: slot(false) },
      { area: "capital-raising" as const, pause: slot(true) },
    ];
    assert.equal(describeHeldAreasForCard(rows), "On hold: Hiring and Fundraising.");
    assert.equal(describeHeldAreasForCard(rows.map((row) => ({ ...row, pause: slot(false) }))), "No area is on hold.");
    assert.equal(describeHeldAreasForCard(rows.map((row) => ({ ...row, pause: slot(true) }))), "Every area is on hold.");
    assert.equal(describeHeldAreasForCard([]), null);
  });

  it("puts the line on the card with a link to the areas' answers", () => {
    const html = renderToStaticMarkup(
      <DecisionHero
        weeklyCall="Hold approvals steady."
        regime="DEFENSIVE"
        areas={{ text: "On hold: Hiring.", href: "#what-it-changes", action: "What to do in each area" }}
      />,
    );
    assert.match(html, /data-held-areas[^>]*>On hold: Hiring\. <a[^>]*href="#what-it-changes"[^>]*>What to do in each area<\/a>/);
  });
});

describe("each ladder says which way is worse", () => {
  it("reads the direction off the pause and resume lines", () => {
    const pressure = renderToStaticMarkup(
      <ScoreLadder label="Funding pressure" value={90} lines={[{ kind: "pause", value: 76 }, { kind: "resume", value: 66 }, { kind: "callChange", value: 70 }]} />,
    );
    assert.match(pressure, /data-ladder-direction="higher"[^>]*>higher is worse</);
    const appetite = renderToStaticMarkup(
      <ScoreLadder label="Risk appetite" value={58} lines={[{ kind: "pause", value: 44 }, { kind: "resume", value: 54 }, { kind: "callChange", value: 50 }]} />,
    );
    assert.match(appetite, /data-ladder-direction="lower"[^>]*>higher is better</);
    const bare = renderToStaticMarkup(<ScoreLadder label="Funding pressure" value={90} lines={[{ kind: "callChange", value: 70 }]} />);
    assert.doesNotMatch(bare, /data-ladder-direction/, "a ladder without both lines does not guess");
  });
});

describe("the conditions map says which corner is which", () => {
  it("names the easiest and hardest corners", () => {
    const html = renderToStaticMarkup(
      <RegimeRadar tightness={90} riskAppetite={58} tightnessThreshold={70} riskAppetiteThreshold={50} currentRegime="DEFENSIVE" />,
    );
    assert.match(html, /Easiest bottom right \(Sunny\), hardest top left \(Freezing\)\./);
  });
});

describe("operating latitude against the four conditions", () => {
  it("states the value the two change lines fix, from the lines", () => {
    assert.match(describeLatitudeAgainstConditions({ tightnessRegime: 70, riskAppetiteRegime: 50 }), /Sunny readings are always 44 or higher and Freezing readings 44 or lower/);
    assert.match(describeLatitudeAgainstConditions({ tightnessRegime: 60, riskAppetiteRegime: 40 }), /always 40 or higher/);
  });
});

describe("a score at the top of its scale", () => {
  it("says so in the change column instead of showing a flat move", () => {
    const row: SignalChangeRow = {
      key: "tightness",
      label: "Funding pressure",
      value: 100,
      valueLabel: "100",
      previous: 100,
      previousLabel: "100",
      delta: 0,
      increaseIsPositive: false,
      lines: [{ kind: "callChange", value: 70 }],
      saturatedPressure: 113,
    };
    const html = renderToStaticMarkup(<WhatChangedSection rows={[row]} comparisonUnavailable={false} />);
    assert.match(html, /data-delta-capped[\s\S]*Can’t rise further/);
    assert.doesNotMatch(html, /100<\/span><span aria-hidden="true">→/, "no flat 100 → 100 chip");
  });
});
