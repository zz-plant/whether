import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";

import { RECORD_BAND_HEIGHT, buildRecordBand, findRecordDifferences } from "../lib/report/recordBand";
import {
  decodeRecordBandMonth,
  encodeRecordBandMonth,
  isLightField,
  recordBandLineY,
  recordBandMonthAt,
  recordBandMonthCount,
} from "../lib/report/recordBandCodec";
import type { RegimeKey } from "../lib/types";

/*
 * The record band (docs/design/rebuild-covenant.md): every month-end as one engraved
 * strip under the navigation of every route. These hold what the drawing claims: one
 * field per stretch, the two bundles the right way up, the published briefs kept apart
 * from the month-ends, and a readout that reads the same months back.
 */

const month = (index: number) => {
  const total = 2012 * 12 + index;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-28`;
};

const series = (regimes: readonly RegimeKey[], scores: (index: number) => { tightness: number; riskAppetite: number }) =>
  regimes.map((regime, index) => ({ recordDate: month(index), regime, ...scores(index) }));

const calm = { tightness: 0, riskAppetite: 100 };
const tight = { tightness: 100, riskAppetite: 0 };

describe("the record band's fields and counts", () => {
  const entries = series(
    ["EXPANSION", "EXPANSION", "EXPANSION", "VOLATILE", "VOLATILE", "SCARCITY", "SCARCITY", "SCARCITY", "DEFENSIVE", "EXPANSION"],
    (index) => (index >= 5 && index <= 7 ? tight : calm),
  );
  const band = buildRecordBand(entries);

  it("draws one field per stretch of conditions, in order, covering every month once", () => {
    assert.ok(band);
    assert.deepEqual(
      band.runs.map((run) => [run.regime, run.start, run.length]),
      [["EXPANSION", 0, 3], ["VOLATILE", 3, 2], ["SCARCITY", 5, 3], ["DEFENSIVE", 8, 1], ["EXPANSION", 9, 1]],
    );
    assert.equal(band.months, 10);
    assert.equal(band.changes, 4, "a change is counted where one stretch ends and the next begins");
    assert.equal(band.firstDate, month(0));
    assert.equal(band.lastDate, month(9));
  });

  it("gives each piece of line the ink its field calls for: dark on the light fills, pale on the dense", () => {
    assert.ok(band);
    assert.ok(isLightField("EXPANSION") && isLightField("VOLATILE"));
    assert.ok(!isLightField("SCARCITY") && !isLightField("DEFENSIVE"));
    /* Two bundles of five lines, each cut into one piece per stretch. */
    assert.equal(band.wide.paths.length, 2 * 5 * band.runs.length);
    assert.equal(band.narrow.paths.length, 2 * 4 * band.runs.length);
    assert.deepEqual(
      band.wide.paths.slice(0, band.runs.length).map((path) => path.light),
      [true, true, false, false, true],
    );
  });

  it("writes each piece as a start and whole-unit steps, so the drawing stays small", () => {
    assert.ok(band);
    assert.equal(band.wide.width, 30, "three samples a month");
    assert.equal(band.narrow.width, 10, "one sample a month on a phone");
    for (const path of [...band.wide.paths, ...band.narrow.paths]) {
      assert.match(path.d, /^M\d+ -?\d+l(?:1 -?\d+)(?: 1 -?\d+)*$/);
    }
  });

  it("returns nothing for a record too short to draw", () => {
    assert.equal(buildRecordBand(entries.slice(0, 1)), null);
    assert.equal(buildRecordBand([]), null);
  });
});

describe("easier is up on the band, as on every other drawing", () => {
  const flat = (value: number) => Array.from({ length: 6 }, () => value);
  const at = (bundle: "risk" | "pressure", risk: number, pressure: number) =>
    recordBandLineY({ bundle, line: 0, month: 3, regime: "EXPANSION", series: { risk: flat(risk), pressure: flat(pressure) }, pattern: false, spread: 1 });

  it("draws higher risk appetite higher, and higher funding pressure lower", () => {
    assert.ok(at("risk", 100, 0) < at("risk", 0, 0), "a smaller y is higher on the band");
    assert.ok(at("pressure", 0, 100) > at("pressure", 0, 0));
  });

  it("keeps risk appetite above funding pressure, inside the band", () => {
    assert.ok(at("risk", 0, 0) < at("pressure", 0, 0));
    for (const value of [at("risk", 100, 0), at("risk", 0, 0), at("pressure", 0, 0), at("pressure", 0, 100)]) {
      assert.ok(value > 0 && value < RECORD_BAND_HEIGHT);
    }
  });

  it("draws Sunny plain and gives every other condition a pattern of its own", () => {
    const wobble = (regime: RegimeKey) => {
      const values = Array.from({ length: 24 }, (_, step) =>
        recordBandLineY({ bundle: "risk", line: 0, month: 1 + step / 6, regime, series: { risk: flat(50), pressure: flat(50) }, pattern: true, spread: 1 }),
      );
      return Math.max(...values) - Math.min(...values);
    };
    assert.equal(wobble("EXPANSION"), 0);
    for (const regime of ["VOLATILE", "DEFENSIVE", "SCARCITY"] as const) assert.ok(wobble(regime) > 5, regime);
  });
});

describe("the published briefs are marked apart from the month-ends", () => {
  const entries = series(["EXPANSION", "EXPANSION", "DEFENSIVE", "DEFENSIVE"], () => calm);
  const briefs = [
    { recordDate: "2012-03-12", regime: "SCARCITY" as const, slug: "2012-w11" },
    { recordDate: "2012-02-06", regime: "EXPANSION" as const, slug: "2012-w06" },
    { recordDate: "2012-06-04", regime: "DEFENSIVE" as const, slug: "2012-w23" },
  ];
  const band = buildRecordBand(entries, briefs);

  it("places each brief by its date and says where publication began", () => {
    assert.ok(band);
    assert.deepEqual(band.marks.map((mark) => mark.slug), ["2012-w06", "2012-w11", "2012-w23"]);
    const first = band.marks.at(0)?.at ?? -1;
    assert.ok(first > 0.25 && first < 0.5, "a February brief sits in the second of four months");
    assert.equal(band.publishedFrom, first);
    assert.equal(band.marks.at(-1)?.at, 1, "a brief after the last month-end sits at the band's edge");
  });

  it("has no marks and no start of publication with no brief", () => {
    const bare = buildRecordBand(entries);
    assert.ok(bare);
    assert.deepEqual(bare.marks, []);
    assert.equal(bare.publishedFrom, null);
  });

  it("finds where a brief and its month-end name different conditions, and claims no cause", () => {
    assert.deepEqual(findRecordDifferences(entries, briefs), [
      { published: "SCARCITY", recorded: "DEFENSIVE", briefs: 1, months: ["2012-03"] },
    ]);
    /* A brief whose month has no month-end yet is not a difference. */
    assert.deepEqual(findRecordDifferences(entries, briefs.slice(2)), []);
    assert.doesNotMatch(readFileSync("app/history/page.tsx", "utf8"), /data-record-difference[\s\S]{0,700}\b(because|after we|re-scored)\b/i);
  });
});

describe("the readout reads the same months back", () => {
  const entries = series(["EXPANSION", "VOLATILE", "DEFENSIVE", "SCARCITY"], (index) => ({ tightness: index * 33.4, riskAppetite: 100 - index * 25 }));
  const band = buildRecordBand(entries);

  it("encodes one token a month and decodes it to the month's conditions and rounded scores", () => {
    assert.ok(band);
    assert.equal(recordBandMonthCount(band.encoded), 4);
    assert.equal(band.encoded.length, 4 * 7);
    assert.deepEqual(decodeRecordBandMonth(band.encoded, 0), { regime: "EXPANSION", tightness: 0, riskAppetite: 100 });
    assert.deepEqual(decodeRecordBandMonth(band.encoded, 3), { regime: "SCARCITY", tightness: 100, riskAppetite: 25 });
    assert.equal(decodeRecordBandMonth(band.encoded, 4), null);
    assert.equal(encodeRecordBandMonth({ regime: "VOLATILE", tightness: 140, riskAppetite: -3 }), "V100000", "a score is held to 0 to 100");
  });

  it("names a slot's calendar month from the band's first date", () => {
    assert.deepEqual(recordBandMonthAt("2012-01-31", 0), { year: 2012, month: 1 });
    assert.deepEqual(recordBandMonthAt("2012-01-31", 11), { year: 2012, month: 12 });
    assert.deepEqual(recordBandMonthAt("2012-01-31", 12), { year: 2013, month: 1 });
  });
});

describe("the band is the frame's, and takes nothing a route did not already hold", () => {
  const component = readFileSync("app/components/recordBand.tsx", "utf8");
  const readout = readFileSync("app/components/recordBandReadout.tsx", "utf8");
  const plate = readFileSync("app/history/recordPlateCanvas.tsx", "utf8");

  it("mounts once, under the header, and reads the bundled month-end series", () => {
    assert.match(readFileSync("app/layout.tsx", "utf8"), /<GlobalHeader \/>\s*<RecordBand \/>/);
    assert.match(component, /getTimeMachineRegimeSeries\(Number\.MAX_SAFE_INTEGER\)/);
    assert.doesNotMatch(component, /"use client"|await |fetch\(/, "the still image is server-drawn and makes no request");
  });

  it("keeps the two client pieces off the data: they read the band's own attribute", () => {
    for (const source of [readout, plate]) {
      assert.match(source, /^"use client";/);
      assert.match(source, /from "\.\.\/\.\.\/lib\/report\/recordBandCodec"/);
      assert.doesNotMatch(source, /timeMachineCache|publishedBriefs|report\/recordBand"/);
    }
  });

  it("lets a vertical swipe scroll the page, and leaves a narrow screen and reduced motion alone", () => {
    assert.match(readFileSync("app/styles/record-band.css", "utf8"), /\.record-band-plate \{[^}]*touch-action: pan-y/);
    assert.match(plate, /prefers-reduced-motion: reduce/);
    assert.match(plate, /width < MIN_WIDTH/);
  });
});
