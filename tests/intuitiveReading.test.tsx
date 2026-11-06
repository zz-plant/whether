import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { DecisionHero } from "../app/components/DecisionHero";
import { RegimeRadar } from "../app/components/home/RegimeRadar";
import { WhatChangedSection } from "../app/components/home/WhatChangedSection";
import { ScoreLadder } from "../app/components/ui/scoreLadder";
import { AreaStrip } from "../app/components/home/AreaStrip";
import { buildAreaStrip, type SignalChangeRow } from "../lib/report/home/homeSectionModel";
import { describeLatitudeAgainstConditions } from "../lib/report/trackRecordCopy";

/*
 * What a first reader could not work out from the page alone (2026-10-14):
 * which way each score is bad, how the weather word relates to the five
 * areas, which corner of the conditions map is which, and that a score at the
 * top of its scale is not "unchanged".
 */

const slot = (met: boolean) => ({ line: "Funding pressure > 76", distance: "", points: 4, met, metric: "tightness" as const });

describe("the card ties the weather word to the areas", () => {
  const held = (metric: "tightness" | "riskAppetite", value: number, holdsAbove: boolean) => ({
    ...slot(true),
    metric,
    value,
    holdsAbove,
  });

  it("gives each area with a line a column saying where it stands", () => {
    const model = buildAreaStrip([
      { area: "hiring", pause: slot(true) },
      { area: "product-tempo", pause: { ...slot(false), points: 40 } },
      { area: "capital-raising" },
    ]);
    assert.deepEqual(model?.cells.map(({ area, label, href }) => ({ area, label, href })), [
      { area: "hiring", label: "On hold", href: "#area-hiring" },
      { area: "product-tempo", label: "Clear", href: "#area-product-tempo" },
    ]);
    assert.equal(buildAreaStrip([]), null, "no area states a line");
  });

  it("says what the holds wait on when they share one restart line", () => {
    const restart = { ...slot(false), line: "Funding pressure < 66", points: 24, value: 66, holdsAbove: false };
    const strip = (rows: Parameters<typeof buildAreaStrip>[0]) => buildAreaStrip(rows)?.restart;
    assert.match(
      strip([
        { area: "hiring", pause: held("tightness", 76, true), resume: restart },
        { area: "product-tempo", pause: slot(false) },
        { area: "capital-raising", pause: held("tightness", 76, true), resume: restart },
      ]) ?? "",
      /^No restart until funding pressure falls below 66, an? [a-z]+ move\.$/,
    );
    assert.equal(
      strip([
        { area: "hiring", pause: held("tightness", 76, true), resume: restart },
        { area: "capital-raising", pause: held("riskAppetite", 44, false), resume: { ...restart, value: 54, holdsAbove: true } },
      ]),
      null,
      "two restart lines name neither",
    );
    assert.equal(strip([{ area: "hiring", pause: slot(false) }]), null, "nothing held");
  });

  it("links each column on the card to its area's rule", () => {
    const html = renderToStaticMarkup(
      <AreaStrip model={{ cells: [{ area: "hiring", state: "crossed", label: "On hold", href: "#area-hiring" }], restart: null }} />,
    );
    assert.match(html, /data-line-state="crossed"[^>]*href="#area-hiring"|href="#area-hiring"[^>]*data-line-state="crossed"/);
    assert.ok(html.includes("On hold"));
  });

  it("sets the left-out inputs' conditions beside the published ones, only when passed", () => {
    const withLine = renderToStaticMarkup(
      <DecisionHero weeklyCall="Hold." regime="DEFENSIVE" feelsLike={{ regime: "SCARCITY", href: "#why-conditions" }} />,
    );
    assert.match(withLine, /data-feels-like[^>]*>Feels like/);
    assert.ok(withLine.includes("Freezing"));
    assert.doesNotMatch(renderToStaticMarkup(<DecisionHero weeklyCall="Hold." regime="DEFENSIVE" />), /data-feels-like/);
  });
});

describe("each ladder says which way is worse", () => {
  it("reads the direction off the pause and restart lines", () => {
    const pressure = renderToStaticMarkup(
      <ScoreLadder label="Funding pressure" value={90} lines={[{ kind: "pause", value: 76 }, { kind: "resume", value: 66 }, { kind: "callChange", value: 70 }]} />,
    );
    assert.ok(pressure.includes('data-ladder-direction="higher"') && pressure.includes("(higher is worse)"));
    const appetite = renderToStaticMarkup(
      <ScoreLadder label="Risk appetite" value={58} lines={[{ kind: "pause", value: 44 }, { kind: "resume", value: 54 }, { kind: "callChange", value: 50 }]} />,
    );
    assert.ok(appetite.includes('data-ladder-direction="lower"') && appetite.includes("(higher is better)"));
    const bare = renderToStaticMarkup(<ScoreLadder label="Funding pressure" value={90} lines={[{ kind: "callChange", value: 70 }]} />);
    assert.doesNotMatch(bare, /data-ladder-direction/, "a ladder without both lines does not guess");
  });
});

describe("the conditions map says which corner is which", () => {
  it("names the easiest and hardest corners", () => {
    const html = renderToStaticMarkup(
      <RegimeRadar tightness={90} riskAppetite={58} tightnessThreshold={70} riskAppetiteThreshold={50} currentRegime="DEFENSIVE" />,
    );
    assert.match(html, /Sunny, top right, is the easiest; Freezing, bottom left, the hardest\./);
  });
});

describe("operating latitude against the four conditions", () => {
  it("states the value the two change lines fix, from the lines", () => {
    assert.match(describeLatitudeAgainstConditions({ tightnessRegime: 70, riskAppetiteRegime: 50 }), /A reading in Sunny's quadrant is always 44 or higher, and one in Freezing's quadrant is 44 or lower/);
    assert.match(describeLatitudeAgainstConditions({ tightnessRegime: 60, riskAppetiteRegime: 40 }), /always 40 or higher/);
  });
});

describe("a score at the top of its scale", () => {
  it("says so where the row's meaning leads instead of showing a flat move", () => {
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
    const capped = html.slice(html.indexOf("data-delta-capped"));
    assert.ok(html.includes("data-delta-capped") && capped.includes(">Money is as hard to raise as this score can show.<"), html);
    assert.ok(!html.includes("No change."), "a pinned score is not an unmoved one");
  });
});
