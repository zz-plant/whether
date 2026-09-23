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
  runwayMonthsFitBand,
  RUNWAY_BAND_OPTIONS,
} from "../lib/report/operatorRunway";

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
      assert.ok(runwayMonthsFitBand(months, band));
    }
    for (const option of RUNWAY_BAND_OPTIONS) {
      assert.equal(runwayBandForMonths(option.months), option.key);
    }
    assert.equal(runwayBandForMonths(0), null);
    assert.equal(runwayBandForMonths(undefined), null);
  });

  it("says each band in a sentence by its range", () => {
    assert.deepEqual(
      RUNWAY_BAND_OPTIONS.map((option) => runwayBandPhrase(option.key)),
      ["less than 6 months", "6–12 months", "12–24 months", "more than 24 months"],
    );
  });
});
