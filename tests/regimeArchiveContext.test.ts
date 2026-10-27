import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import {
  MS_PER_DAY,
  getLatestValidDate,
  parseSeries,
  resolveBaseRateVelocityWindow,
  resolveChicagoFciReading,
  resolveVixReading,
} from "../scripts/regimeArchiveContext";

const asOfTime = (date: string) => Date.parse(`${date}T00:00:00Z`);

describe("parseSeries", () => {
  /**
   * FRED's CSV export marks a missing observation with an empty field now and
   * marked it "." before. Both are absences. `Number("")` is 0, so a parser that
   * guarded only against "." read every market holiday as a print of 0 — seven
   * month-end Treasury records shipped with every yield at 0 because of it.
   */
  it("keeps a missing observation as a null point, whether empty or a dot", () => {
    const dataset = parseSeries(
      ["observation_date,DGS1MO", "2024-03-27,5.50", "2024-03-28,5.49", "2024-03-29,", "2024-04-01,."].join("\n"),
    );

    assert.deepEqual(
      dataset.points.map((point) => [point.date, point.value]),
      [
        ["2024-03-27", 5.5],
        ["2024-03-28", 5.49],
        ["2024-03-29", null],
        ["2024-04-01", null],
      ],
    );
    assert.equal(dataset.map.has("2024-03-29"), false);
    assert.equal(dataset.map.has("2024-04-01"), false);
    assert.equal(dataset.map.get("2024-03-28"), 5.49);
  });

  it("tolerates CRLF line endings and stray whitespace around a value", () => {
    const dataset = parseSeries("observation_date,VIXCLS\r\n2024-03-28, 13.01\r\n2024-03-29, \r\n");

    assert.deepEqual(
      dataset.points.map((point) => [point.date, point.value]),
      [
        ["2024-03-28", 13.01],
        ["2024-03-29", null],
      ],
    );
  });

  it("never yields a zero for a blank field", () => {
    const dataset = parseSeries("observation_date,DGS10\n2024-03-29,\n");
    assert.equal(dataset.points[0]?.value, null);
    assert.equal(dataset.points.some((point) => point.value === 0), false);
  });
});

describe("getLatestValidDate", () => {
  it("skips a trailing holiday placeholder and returns the last real print", () => {
    const { points } = parseSeries("observation_date,DGS10\n2024-03-28,4.20\n2024-03-29,\n");
    assert.deepEqual(getLatestValidDate(points), { date: "2024-03-28", time: asOfTime("2024-03-28"), value: 4.2 });
  });

  it("returns null when nothing in the range carries a value", () => {
    const { points } = parseSeries("observation_date,DGS10\n2024-03-29,\n2024-04-01,.\n");
    assert.equal(getLatestValidDate(points), null);
  });
});

describe("resolveVixReading", () => {
  const csv = [
    "observation_date,VIXCLS",
    "2024-03-25,13.19",
    "2024-03-26,13.24",
    "2024-03-27,12.78",
    "2024-03-28,13.01",
    "2024-03-29,",
  ].join("\n");

  it("reads the last close when the period ends on an equity holiday", () => {
    const reading = resolveVixReading(parseSeries(csv), "2024-03-29", asOfTime("2024-03-29"), "");
    assert.ok(reading);
    assert.equal(reading.value, 13.01);
    assert.equal(reading.record_date, "2024-03-28");
  });

  it("carries the holiday into the history as a null, never a zero", () => {
    const reading = resolveVixReading(parseSeries(csv), "2024-03-29", asOfTime("2024-03-29"), "");
    assert.ok(reading);
    const holiday = reading.history?.find((point) => point.date === "2024-03-29");
    assert.deepEqual(holiday, { date: "2024-03-29", value: null });
    assert.equal(reading.history?.some((point) => point.value === 0), false);
  });

  it("still treats a close more than a week old as an absence", () => {
    const reading = resolveVixReading(parseSeries(csv), "2024-04-08", asOfTime("2024-04-08"), "");
    assert.equal(reading, null);
  });
});

describe("resolveBaseRateVelocityWindow", () => {
  it("resolves the pair from real prints, stepping over holiday placeholders", () => {
    const rows = ["observation_date,DGS1MO"];
    const start = asOfTime("2024-01-01");
    for (let day = 0; day <= 90; day += 1) {
      const date = new Date(start + day * MS_PER_DAY).toISOString().slice(0, 10);
      // Every seventh day is a placeholder, the way a holiday sits in the export.
      rows.push(day % 7 === 3 ? `${date},` : `${date},${(5 + day / 100).toFixed(2)}`);
    }
    const window = resolveBaseRateVelocityWindow(parseSeries(rows.join("\n")), asOfTime("2024-03-31"));
    assert.ok(window);
    assert.notEqual(window.compareValue, 0);
    assert.notEqual(window.latestValue, 0);
    assert.equal(window.latestDate, "2024-03-31");
  });
});

/*
 * The Chicago Fed index joined the record basis (engine-2026-10-09b), backfilled
 * from FRED's NFCI. It is weekly, dated the Friday each week ends and published
 * the Wednesday after, so a period takes the newest observation a reader had then.
 * Its gaps come through the same parser as every other series.
 */
describe("resolveChicagoFciReading", () => {
  const csv = [
    "observation_date,NFCI",
    "2020-03-06,-0.231",
    "2020-03-13,0.031",
    "2020-03-20,",
    "2020-03-27,0.267",
  ].join("\n");

  it("takes the newest observation published by the period's date, not one published after it", () => {
    /* Mar 31, 2020: the Mar 27 week was published Apr 1, so the reading is Mar 20's, or the last real one before it. */
    const reading = resolveChicagoFciReading(parseSeries(csv), asOfTime("2020-03-31"), "");
    assert.ok(reading);
    assert.equal(reading.id, "CHICAGO_FCI");
    assert.equal(reading.record_date, "2020-03-13", "Mar 20 is a gap, so Mar 13's 0.031");
    assert.equal(reading.value, 0.031);
    assert.equal(reading.history?.some((point) => point.date === "2020-03-27"), false, "nothing published after the date");
  });

  it("keeps a gap as a null in the history, never a zero, whether empty or a dot", () => {
    const dotted = csv.replace("2020-03-20,", "2020-03-20,.");
    for (const source of [csv, dotted]) {
      const reading = resolveChicagoFciReading(parseSeries(source), asOfTime("2020-04-01"), "");
      assert.ok(reading);
      assert.deepEqual(reading.history?.find((point) => point.date === "2020-03-20"), { date: "2020-03-20", value: null });
      assert.equal(reading.history?.some((point) => point.value === 0), false);
      assert.equal(reading.value, 0.267, "Apr 1 has the Mar 27 week");
    }
  });

  it("treats three missed releases as an absence", () => {
    assert.equal(resolveChicagoFciReading(parseSeries(csv), asOfTime("2020-04-25"), ""), null);
  });
});

