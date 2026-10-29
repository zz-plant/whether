import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { DecisionHero } from "../app/components/DecisionHero";
import { comparisonBasis } from "../lib/report/comparisonBasis";
import {
  describeAreaPauseStatus,
  describeConditionsTrail,
  describeEarlierConditions,
  describePauseLineCount,
} from "../lib/report/home/homeSectionModel";

/**
 * The homepage's first screen carries the week's news, not only its standing
 * order: what conditions were at the earlier reading, where each decision stands
 * against its pause line before anything is clicked, and — from `md` up — a map
 * of where the reading sits and the month-ends that led there.
 */
const slot = (met: boolean, points: number) => ({ line: "Funding pressure > 76", distance: "", points, met, metric: "tightness" as const });

describe("where each decision stands, before a click", () => {
  it("says a crossed pause line as a state, and an uncrossed one as a distance", () => {
    assert.deepEqual(describeAreaPauseStatus({ pause: slot(true, 14) }), { text: "Past its pause line", crossed: true, state: "crossed" });
    assert.deepEqual(describeAreaPauseStatus({ pause: slot(false, 4) }), { text: "4 pts from its pause line", crossed: false, state: "near" });
    assert.deepEqual(describeAreaPauseStatus({ pause: slot(false, 1) }), { text: "1 pt from its pause line", crossed: false, state: "near" });
    assert.deepEqual(describeAreaPauseStatus({ pause: slot(false, 0) }), { text: "At its pause line", crossed: false, state: "near" });
    /* Past the 5 points the margin calls close, the line is clear of the reading. */
    assert.deepEqual(describeAreaPauseStatus({ pause: slot(false, 6) }), { text: "6 pts from its pause line", crossed: false, state: "clear" });
    assert.equal(describeAreaPauseStatus({}), undefined, "an area with no pause line has nothing to say");
  });

  it("counts the crossed lines over the areas that have one", () => {
    assert.equal(
      describePauseLineCount([{ pause: slot(true, 1) }, { pause: slot(true, 2) }, { pause: slot(false, 4) }, {}]),
      "2 of 3 areas are past their pause line.",
    );
    assert.equal(describePauseLineCount([{ pause: slot(true, 1) }, { pause: slot(false, 4) }]), "1 of 2 areas is past its pause line.");
    assert.equal(describePauseLineCount([{ pause: slot(false, 3) }]), "No area is past its pause line.");
    assert.equal(describePauseLineCount([{}]), null);
  });
});

describe("what conditions were", () => {
  it("dates the earlier conditions by the comparison's own basis, never as this week", () => {
    const basis = comparisonBasis({ label: "Aug 31" });
    assert.equal(describeEarlierConditions({ previousLabel: "Sunny", basis }), "Was Sunny on Aug 31");
    assert.equal(describeEarlierConditions({ previousLabel: "Sunny" }), "Was Sunny last week");
  });

  it("prints it on the stamp line, in the regime ink", () => {
    const html = renderToStaticMarkup(
      <DecisionHero weeklyCall="Freeze new commitments and protect runway." regime="SCARCITY" earlier="Was Sunny on Aug 31" />,
    );
    const stamp = html.indexOf("FREEZING");
    const earlier = html.indexOf("Was Sunny on Aug 31");
    assert.ok(stamp >= 0 && earlier > stamp, "the earlier conditions follow the stamp");
    assert.ok(earlier < html.indexOf("Freeze new commitments"), "and come before the call");
    assert.match(html, /data-earlier-conditions/);
    assert.match(html, /var\(--regime-ink\)[^>]*data-earlier-conditions/);
  });
});

describe("the map in the card", () => {
  it("names the months its path draws", () => {
    assert.equal(
      describeConditionsTrail(["2026-03-31", "2026-04-30", "2026-08-31"]),
      "The trail shows each month, Mar–Aug 2026, then this week.",
    );
    assert.equal(
      describeConditionsTrail(["2025-11-28", "2026-02-27"]),
      "The trail shows each month, Nov 2025–Feb 2026, then this week.",
    );
    assert.equal(describeConditionsTrail(["2026-08-31"]), "The trail shows the end of Aug 2026, then this week.");
    assert.equal(describeConditionsTrail([]), null);
  });

  /* The trail's caption is the map's own (2026-10-09). It sat under the trust row in
     the left column, a column away from the dots it describes. */
  it("draws the aside from md up only, and leaves cards without one unchanged", () => {
    const withMap = renderToStaticMarkup(
      <DecisionHero
        weeklyCall="Freeze new commitments and protect runway."
        regime="SCARCITY"
        aside={<figure data-testid="map" />}
      />,
    );
    assert.match(withMap, /<div class="weather-hero-aside max-md:hidden"><figure data-testid="map"/);
    assert.doesNotMatch(withMap, /data-aside-note/);

    const plain = renderToStaticMarkup(<DecisionHero weeklyCall="Hold." regime="SCARCITY" />);
    assert.doesNotMatch(plain, /max-md:hidden|md:grid/);
  });
});
