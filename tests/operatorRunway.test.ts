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
  ageRunwayBand,
  describeRunwayBandAge,
  isThinlyCoveredRunway,
  readRunwayBandAge,
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

  it("puts a company whose revenue covers its spending in the open-ended band when cash stands behind it", () => {
    const covered = resolveProfileRunway({ version: 1, cashUsd: 1_500_000, monthlyBurnUsd: 200_000, monthlyRevenueUsd: 250_000 });
    assert.equal(runwayBandForProfileRunway(covered), "abundant");
    assert.equal(isThinlyCoveredRunway(covered), false);
    // A typed runway stands in for the balance.
    const typed = resolveProfileRunway({ version: 1, runwayMonths: 14, monthlyBurnUsd: 100_000, monthlyRevenueUsd: 120_000 });
    assert.equal(runwayBandForProfileRunway(typed), "abundant");
    assert.equal(runwayBandForProfileRunway(null), null);
    assert.equal(runwayBandForProfileRunway({ basis: "entered", months: 9 }), "tight");
  });

  it("does not tell a company with thin cash or falling revenue to use the cushion", () => {
    const covered = { version: 1, cashUsd: 20_000, monthlyBurnUsd: 80_000, monthlyRevenueUsd: 80_500 } as const;
    const thin = resolveProfileRunway(covered);
    assert.equal(runwayBandForProfileRunway(thin), "balanced");
    assert.equal(isThinlyCoveredRunway(thin), true);
    // Plenty of cash, but revenue falls through spending inside the band's 24 months.
    const falling = resolveProfileRunway({ ...covered, cashUsd: 2_000_000, monthlyRevenueUsd: 100_000, monthlyGrowthPct: -5 });
    assert.equal(runwayBandForProfileRunway(falling), "balanced");
    // The same fall against a wide margin holds past 24 months.
    const slow = resolveProfileRunway({ ...covered, cashUsd: 2_000_000, monthlyRevenueUsd: 200_000, monthlyGrowthPct: -1 });
    assert.equal(runwayBandForProfileRunway(slow), "abundant");
    // Revenue wiped out in a month, and growth left blank, are both readable.
    assert.equal(runwayBandForProfileRunway(resolveProfileRunway({ ...covered, cashUsd: 2_000_000, monthlyGrowthPct: -100 })), "balanced");
    assert.equal(runwayBandForProfileRunway(resolveProfileRunway({ ...covered, cashUsd: 2_000_000 })), "abundant");
    // No spending means no cushion to measure, not an endless one.
    assert.equal(runwayBandForProfileRunway(resolveProfileRunway({ version: 1, cashUsd: 5_000, monthlyBurnUsd: 0 })), "balanced");
  });

  it("ages a band from the day it was set, downward only", () => {
    const on = (date: string) => new Date(`${date}T12:00:00.000Z`);
    assert.equal(ageRunwayBand("balanced", "2026-01-01", on("2026-01-02")), "balanced");
    assert.equal(ageRunwayBand("balanced", "2026-01-01", on("2026-08-01")), "tight");
    assert.equal(ageRunwayBand("balanced", "2026-01-01", on("2027-02-01")), "critical");
    assert.equal(ageRunwayBand("abundant", "2026-01-01", on("2026-08-01")), "balanced");
    assert.equal(ageRunwayBand("tight", "2026-01-01", on("2026-05-01")), "critical");
    // The lowest band has nowhere to go, and past its months stays there.
    assert.equal(ageRunwayBand("critical", "2026-01-01", on("2027-01-01")), "critical");
    // No date, a bad date and a future date all leave it as set.
    assert.equal(ageRunwayBand("abundant", null, on("2030-01-01")), "abundant");
    assert.equal(ageRunwayBand("abundant", "soon", on("2030-01-01")), "abundant");
    assert.equal(ageRunwayBand("abundant", "2031-01-01", on("2030-01-01")), "abundant");
  });

  it("keeps the day in the cookie and reads the aged band out of it", () => {
    const setOn = new Date("2026-01-01T12:00:00.000Z");
    const later = new Date("2026-08-01T12:00:00.000Z");
    const cookie = buildOperatorRunwayCookie("balanced", setOn);
    assert.ok(cookie.startsWith(`${OPERATOR_RUNWAY_COOKIE}=balanced:2026-01-01;`));
    const header = cookie.split(";")[0];
    assert.equal(readOperatorRunwayCookie(header, setOn), "balanced");
    assert.equal(readOperatorRunwayCookie(header, later), "tight");
    assert.equal(readRunwayBandAge(header, setOn), null);
    const age = readRunwayBandAge(header, later);
    assert.deepEqual(age, { chosen: "balanced", setOn: "2026-01-01", band: "tight" });
    assert.ok(age);
    assert.equal(describeRunwayBandAge(age), "You set 12–24 months of runway on Jan 1, 2026, so this now assumes 6–12 months.");
    // A band earned by covering spending, and a cookie from before the day was kept, do not age.
    const bare = buildOperatorRunwayCookie("abundant", null).split(";")[0];
    assert.equal(bare, `${OPERATOR_RUNWAY_COOKIE}=abundant`);
    assert.equal(readOperatorRunwayCookie(bare, new Date("2030-01-01")), "abundant");
    assert.equal(readRunwayBandAge(bare, new Date("2030-01-01")), null);
    // A garbled day is no day, and a garbled band is no band.
    assert.equal(readOperatorRunwayCookie(`${OPERATOR_RUNWAY_COOKIE}=tight:someday`, later), "tight");
    assert.equal(readOperatorRunwayCookie(`${OPERATOR_RUNWAY_COOKIE}=nope:2026-01-01`, later), null);
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
    // Cash alone is no runway; 3 months is critical; covered with three months of spend banked follows the
    // guidance; revenue cleared is 3 months again; spend cleared leaves no runway, which leaves the band alone.
    assert.deepEqual(written, [null, "critical", "balanced", "critical", null]);
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
