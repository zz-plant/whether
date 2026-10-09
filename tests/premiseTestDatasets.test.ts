import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import ventureDataset from "../data/research/venture-fundraising-quarterly.json";
import rateInputs from "../data/research/premise-test-rate-inputs.json";
import {
  quarterEndDate,
  quarterFromIndex,
  quarterIndex,
  selectMatureRelease,
  shiftQuarter,
  validateVentureDataset,
} from "../scripts/research/ventureFundraising";
import { midMonthReference, validateRateInputs } from "../scripts/research/premiseTestRateInputs";

/*
 * The premise test's two committed inputs, held to the rules the registration
 * fixed (docs/research/premise-test-preregistration.md §4.2, §7.4, §8.4). The
 * generators fetch from nvca.org and FRED and never run here; the validators
 * are what the suite owns, so each is shown passing the committed file and
 * failing a copy broken in one specific way.
 */

const clone = <T>(value: T): T => structuredClone(value);

describe("quarter arithmetic", () => {
  it("round-trips and shifts quarters across years", () => {
    assert.equal(quarterFromIndex(quarterIndex("2019Q2")), "2019Q2");
    assert.equal(shiftQuarter("2019Q2", -4), "2018Q2");
    assert.equal(shiftQuarter("2019Q4", 1), "2020Q1");
    assert.equal(quarterEndDate("2024Q1"), "2024-03-31");
    assert.equal(quarterEndDate("2023Q4"), "2023-12-31");
  });
});

describe("the mature vintage rule", () => {
  const releases = ["2019Q2", "2019Q3", "2022Q2", "2022Q4", "2023Q1", "2026Q3"];

  it("picks the earliest release at least four quarters after the quarter", () => {
    assert.deepEqual(selectMatureRelease("2018Q3", releases), { release: "2019Q3", immature: false });
    assert.deepEqual(selectMatureRelease("2012Q1", releases), { release: "2019Q2", immature: false });
  });

  it("skips a release that was not retrieved rather than reading an earlier one", () => {
    // 2022Q3 is missing, so 2021Q3 matures in 2022Q4, never in 2022Q2.
    assert.deepEqual(selectMatureRelease("2021Q3", releases), { release: "2022Q4", immature: false });
  });

  it("falls back to the latest release and marks the pair immature", () => {
    assert.deepEqual(selectMatureRelease("2025Q4", releases), { release: "2026Q3", immature: true });
  });
});

describe("the venture fundraising dataset", () => {
  it("is valid as committed", () => {
    assert.deepEqual(validateVentureDataset(ventureDataset), []);
  });

  it("matures every quarter through 2025Q3 and marks the four after it immature", () => {
    const immature = ventureDataset.quarters.filter((row) => row.mature?.immature).map((row) => row.quarter);
    assert.deepEqual(immature, ["2025Q4", "2026Q1", "2026Q2", "2026Q3"]);
    assert.ok(ventureDataset.quarters.every((row) => row.mature !== null));
  });

  it("rejects a pair that cites a release the rule would not pick", () => {
    const broken = clone(ventureDataset);
    const row = broken.quarters.find((entry) => entry.quarter === "2018Q3");
    assert.ok(row?.mature);
    row.mature.release = "2019Q2";
    row.mature.url = broken.releases[0].url;
    assert.ok(validateVentureDataset(broken).some((problem) => problem.startsWith("2018Q3: mature pair cites 2019Q2")));
  });

  it("rejects a year-earlier figure from the wrong quarter", () => {
    const broken = clone(ventureDataset);
    const row = broken.quarters[10];
    assert.ok(row.mature);
    row.mature.yearEarlier.quarter = shiftQuarter(row.quarter, -3);
    assert.ok(validateVentureDataset(broken).some((problem) => problem.includes("year-earlier quarter")));
  });

  it("rejects a citation to a release that is not listed", () => {
    const broken = clone(ventureDataset);
    broken.releases = broken.releases.filter((release) => release.quarter !== "2019Q3");
    assert.ok(validateVentureDataset(broken).some((problem) => problem.includes("unlisted release 2019Q3")));
  });

  it("rejects a gap in the quarters and a figure that is not a count", () => {
    const gapped = clone(ventureDataset);
    gapped.quarters.splice(5, 1);
    assert.ok(validateVentureDataset(gapped).some((problem) => problem.includes("not contiguous")));

    const negative = clone(ventureDataset);
    const row = negative.quarters[0];
    assert.ok(row.mature);
    row.mature.current.dealCount = -1;
    assert.ok(validateVentureDataset(negative).length > 0);
  });
});

describe("the premise test rate inputs", () => {
  it("are valid as committed", () => {
    assert.deepEqual(validateRateInputs(rateInputs), []);
  });

  it("reject a month-end pair whose bill differs from the archive", () => {
    const broken = clone(rateInputs);
    broken.dislocationPairs[0].atDate.oneMonth += 0.01;
    assert.ok(validateRateInputs(broken).some((problem) => problem.includes("bills differ from the archive")));
  });

  it("reject a reference after the 15th and an episode date outside its window", () => {
    const late = clone(rateInputs);
    late.dislocationPairs[0].reference = `${late.dislocationPairs[0].date.slice(0, 7)}-20`;
    assert.ok(validateRateInputs(late).some((problem) => problem.includes("not on or before the 15th")));

    const outside = clone(rateInputs);
    const episodeDate = outside.dislocationPairs.find((pair) => pair.set === "debt-ceiling-2023");
    assert.ok(episodeDate);
    episodeDate.date = "2023-07-01";
    assert.ok(validateRateInputs(outside).some((problem) => problem.includes("outside the registered window")));
  });

  it("pick the mid-month reference on or before the 15th", () => {
    const printing = ["2024-03-13", "2024-03-14", "2024-03-15", "2024-03-18", "2024-03-29"];
    assert.equal(midMonthReference("2024-03-29", printing), "2024-03-15");
    assert.equal(midMonthReference("2024-04-30", printing), null);
  });
});
