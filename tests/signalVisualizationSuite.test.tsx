import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { SignalVisualizationSuite } from "../app/signals/components/signalVisualizationSuite";
import { SignalInversionPreview } from "../app/signals/components/signalInversionPreview";
import { buildTreasuryFixture } from "./fixtures/reportFixtures";

/*
 * The /signals chart suite draws the month-end archive, and its labels said
 * otherwise. "Biggest weekly rate moves" listed month-end-to-month-end changes
 * dated like weeks ("Mar 31, 2022 · 2Y +84.0 bp", a tenth of a basis point
 * nobody measured); a "Weekly" cadence redrew the same month-ends; and the
 * recession warning gauge appeared as "Latest: 0.42%" under its ribbon and
 * "+41.0 bp" under the inversion lines, beside a row printing it as 0.41pp —
 * the ribbon was drawing an unnamed blend of the two spreads, not the gauge.
 */

const point = (recordDate: string, twoYear: number, tenYear: number, threeMonth: number) => {
  const [year, month] = recordDate.split("-").map(Number);
  return {
    year,
    month,
    recordDate,
    oneMonth: threeMonth - 0.05,
    threeMonth,
    twoYear,
    tenYear,
    spread10Y2Y: tenYear - twoYear,
    spread2Y3M: twoYear - threeMonth,
  };
};

const SERIES = [
  point("2022-02-28", 1.44, 1.83, 0.33),
  point("2022-03-31", 2.28, 2.32, 0.52),
  point("2026-07-31", 3.94, 4.4, 3.83),
  point("2026-08-31", 4.34, 4.75, 3.91),
];

const visibleText = (html: string) =>
  html
    .replace(/<!-- -->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");

describe("the /signals chart suite labels the month-end archive as monthly", () => {
  const text = visibleText(
    renderToStaticMarkup(<SignalVisualizationSuite treasury={buildTreasuryFixture()} yieldCurveSeries={SERIES} />),
  );

  it("calls month-end moves monthly, dated by month, in whole basis points", () => {
    assert.match(text, /Biggest monthly rate moves/);
    assert.match(text, /Mar 2022 · 2Y \+84 bp · 10Y \+49 bp/);
    assert.doesNotMatch(text, /\bweek(ly|s)?\b/i, "a monthly series described in weeks");
    assert.doesNotMatch(text, /\d\.\d bp/, "basis points to a tenth");
  });

  it("offers no weekly cadence over a series with one reading a month", () => {
    assert.match(text, /Monthly/);
    assert.doesNotMatch(text, /Weekly/);
  });

  it("prints the recession warning gauge in pp, as the month-end its last block is", () => {
    assert.match(text, /Aug 2026 month-end: 0\.41pp/);
    assert.match(text, /10Y−2Y 0\.41pp · 2Y−3M 0\.43pp/);
    assert.doesNotMatch(text, /Latest: 0\.\d+%/, "the gauge as a percent");
    assert.doesNotMatch(text, /[+-]?\d+\.\d bp/, "a spread level in bp");
    assert.match(text, /pp Percentage point/, "pp is defined on the panel that prints it");
  });
});

describe("the inversion chart prints its spreads as the gauge row does", () => {
  it("states both spreads and its scale in pp, and defines pp", () => {
    const text = visibleText(renderToStaticMarkup(<SignalInversionPreview yieldCurveSeries={SERIES} />));

    assert.match(text, /10Y−2Y 0\.41pp/);
    assert.match(text, /2Y−3M 0\.43pp/);
    assert.match(text, /Vertical scale -?\d\.\d\dpp to \d\.\d\dpp/);
    assert.doesNotMatch(text, /\bbp\b/);
    assert.match(text, /pp Percentage point/);
  });
});
