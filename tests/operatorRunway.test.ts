import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  OPERATOR_RUNWAY_COOKIE,
  buildOperatorRunwayCookie,
  isRunwayBand,
  monthsForRunwayBand,
  parseOperatorRunwayParam,
  readOperatorRunwayCookie,
  runwayBandForMonths,
  runwayBandLabel,
  runwayBandSublabel,
  runwayBandPhrase,
  runwayBandForProfileEdit,
  runwayBandForProfileRunway,
  RUNWAY_BAND_OPTIONS,
} from "../lib/report/operatorRunway";
import {
  EMPTY_OPERATOR_PROFILE,
  resolveProfileRunway,
  setOperatorProfileField,
  type OperatorProfile,
} from "../lib/operatorProfile";

describe("operatorRunway", () => {
  it("maps month durations to the canonical runway bands, with the lower edge inclusive", () => {
    assert.equal(runwayBandForMonths(0), null);
    assert.equal(runwayBandForMonths(-5), null);
    assert.equal(runwayBandForMonths(null), null);
    assert.equal(runwayBandForMonths(undefined), null);
    assert.equal(runwayBandForMonths(Number.NaN), null);

    assert.equal(runwayBandForMonths(3), "critical");
    assert.equal(runwayBandForMonths(5.9), "critical");
    assert.equal(runwayBandForMonths(6), "tight");
    assert.equal(runwayBandForMonths(11.9), "tight");
    assert.equal(runwayBandForMonths(12), "balanced");
    assert.equal(runwayBandForMonths(23.9), "balanced");
    assert.equal(runwayBandForMonths(24), "abundant");
    assert.equal(runwayBandForMonths(36), "abundant");
  });

  it("round-trips a band through its representative month count", () => {
    for (const band of ["critical", "tight", "balanced", "abundant"] as const) {
      assert.equal(runwayBandForMonths(monthsForRunwayBand(band)), band);
    }
  });

  it("validates band keys", () => {
    assert.equal(isRunwayBand("critical"), true);
    assert.equal(isRunwayBand("abundant"), true);
    assert.equal(isRunwayBand("infinite"), false);
    assert.equal(isRunwayBand(12), false);
    assert.equal(isRunwayBand(null), false);
  });

  it("formats labels and sublabels", () => {
    assert.equal(runwayBandLabel("critical"), "<6 mo");
    assert.equal(runwayBandLabel("abundant"), "24+ mo");
    assert.equal(runwayBandSublabel("critical"), "Cash first");
    assert.equal(runwayBandSublabel("balanced"), "Follow the guidance");
  });

  it("parses the ?runway= parameter from a band key or a month count", () => {
    assert.equal(parseOperatorRunwayParam("critical"), "critical");
    assert.equal(parseOperatorRunwayParam(" CRITICAL "), "critical");
    assert.equal(parseOperatorRunwayParam("abundant"), "abundant");

    assert.equal(parseOperatorRunwayParam("4"), "critical");
    assert.equal(parseOperatorRunwayParam("9"), "tight");
    assert.equal(parseOperatorRunwayParam("18"), "balanced");
    assert.equal(parseOperatorRunwayParam("30"), "abundant");

    assert.equal(parseOperatorRunwayParam(null), null);
    assert.equal(parseOperatorRunwayParam(""), null);
    assert.equal(parseOperatorRunwayParam("unknown"), null);
    assert.equal(parseOperatorRunwayParam("0"), null);
  });

  it("serializes and reads the runway cookie", () => {
    const cookie = buildOperatorRunwayCookie("critical");
    assert.ok(cookie.includes(`${OPERATOR_RUNWAY_COOKIE}=critical`));
    assert.ok(cookie.includes("path=/"));
    assert.ok(cookie.includes("SameSite=Lax"));

    assert.equal(readOperatorRunwayCookie(`foo=bar; ${OPERATOR_RUNWAY_COOKIE}=critical; other=val`), "critical");
    assert.equal(readOperatorRunwayCookie(null), null);
    assert.equal(readOperatorRunwayCookie("foo=bar"), null);
    assert.equal(readOperatorRunwayCookie(`${OPERATOR_RUNWAY_COOKIE}=invalid`), null);
  });

  it("clears the cookie with a zero max-age", () => {
    const cookie = buildOperatorRunwayCookie(null);
    assert.ok(cookie.includes(`${OPERATOR_RUNWAY_COOKIE}=;`));
    assert.ok(cookie.includes("max-age=0"));
  });
});

describe("one runway setting", () => {
  it("bands a figure by the band table itself", () => {
    // Contiguous and exhaustive: every positive runway lands in exactly one band,
    // and each band's representative figure lands in its own band.
    for (let months = 0.5; months <= 60; months += 0.5) {
      const band = runwayBandForMonths(months);
      assert.ok(band, `${months} months has no band`);
    }
    for (const option of RUNWAY_BAND_OPTIONS) {
      assert.equal(runwayBandForMonths(option.months), option.key);
    }
    assert.equal(runwayBandForMonths(0), null);
    assert.equal(runwayBandForMonths(undefined), null);
  });

  it("puts a company whose revenue covers its spending in the open-ended band, not in no band", () => {
    const covered = resolveProfileRunway({ version: 1, cashUsd: 600_000, monthlyBurnUsd: 200_000, monthlyRevenueUsd: 250_000 });
    assert.equal(runwayBandForProfileRunway(covered), "abundant");
    assert.equal(runwayBandForProfileRunway(null), null);
    assert.equal(runwayBandForProfileRunway({ basis: "entered", months: 9 }), "tight");
  });

  it("moves the band with each figure, including revenue that comes to cover spending", () => {
    // The commitment test's order: cash, then spend, then revenue. The band used to stay critical after the
    // last step, so `/` said cash was what limited a company whose cash was growing.
    const steps: Array<[keyof OperatorProfile, number | undefined]> = [
      ["cashUsd", 600_000],
      ["monthlyBurnUsd", 200_000],
      ["monthlyRevenueUsd", 250_000],
      ["monthlyRevenueUsd", undefined],
      ["monthlyBurnUsd", undefined],
    ];
    let profile: OperatorProfile = EMPTY_OPERATOR_PROFILE;
    const written: Array<string | null> = [];
    for (const [key, value] of steps) {
      const next = setOperatorProfileField(profile, key, value);
      written.push(runwayBandForProfileEdit(resolveProfileRunway(profile), resolveProfileRunway(next)));
      profile = next;
    }
    // Cash alone is no runway; 3 months is critical; covered is open-ended; revenue cleared is 3 months again;
    // spend cleared leaves no runway, which leaves the band alone.
    assert.deepEqual(written, [null, "critical", "abundant", "critical", null]);
    // An edit that does not move the runway does not rewrite the band.
    assert.equal(runwayBandForProfileEdit({ basis: "entered", months: 9 }, { basis: "entered", months: 9 }), null);
  });

  it("says each band in a sentence by its range", () => {
    assert.deepEqual(
      RUNWAY_BAND_OPTIONS.map((option) => runwayBandPhrase(option.key)),
      ["less than 6 months", "6–12 months", "12–24 months", "more than 24 months"],
    );
  });
});
