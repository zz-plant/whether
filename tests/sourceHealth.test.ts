import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import type { MacroSeriesReading, TreasuryData } from "../lib/types";
import {
  buildSourceBoardRows,
  buildSourceHealthRows,
  summarizeSourceHealthCoverage,
  buildDegradedSourceRows,
  formatSourceFreshnessLabel,
  formatSourceModeLabel,
  listStaleLiveSources,
  type SourceHealthRow,
} from "../lib/report/sourceHealth";

const buildTreasury = (overrides: Partial<TreasuryData> = {}): TreasuryData => ({
  yields: {
    oneMonth: 4.6,
    threeMonth: 4.7,
    twoYear: 4.3,
    tenYear: 4.1,
  },
  source: "US Treasury",
  record_date: "2026-03-10",
  fetched_at: "2026-03-10T00:00:00.000Z",
  isLive: true,
  ...overrides,
});

const buildMacroSeriesReading = (overrides: Partial<MacroSeriesReading>): MacroSeriesReading => ({
  id: "CPI_YOY",
  label: "CPI YoY",
  value: 2.8,
  unit: "%",
  explanation: "Consumer inflation",
  sourceLabel: "FRED",
  sourceUrl: "https://fred.stlouisfed.org/",
  formulaUrl: "https://fred.stlouisfed.org/",
  record_date: "2026-03-01",
  fetched_at: "2026-03-10T00:00:00.000Z",
  isLive: true,
  ...overrides,
});

describe("buildSourceHealthRows", () => {
  it("groups source health by cadence and input family", () => {
    const rows = buildSourceHealthRows({
      treasury: buildTreasury(),
      macroSeries: [
        buildMacroSeriesReading({ id: "CPI_YOY", fetched_at: "2026-03-01T00:00:00.000Z", isLive: true }),
        buildMacroSeriesReading({ id: "UNEMPLOYMENT_RATE", fetched_at: "2026-03-07T00:00:00.000Z", isLive: false }),
        buildMacroSeriesReading({ id: "BBB_CREDIT_SPREAD", fetched_at: "2026-03-10T09:00:00.000Z", isLive: true }),
        buildMacroSeriesReading({ id: "HY_CREDIT_SPREAD", fetched_at: "2026-03-10T08:00:00.000Z", isLive: true }),
        buildMacroSeriesReading({ id: "CHICAGO_FCI", fetched_at: "2026-03-10T07:00:00.000Z", isLive: true }),
        buildMacroSeriesReading({ id: "VIX_INDEX", fetched_at: "2026-03-10T06:00:00.000Z", isLive: true }),
        buildMacroSeriesReading({ id: "VC_FUNDING_VELOCITY", fetched_at: "2026-03-02T00:00:00.000Z", isLive: false }),
      ],
      now: new Date("2026-03-11T00:00:00.000Z"),
    });

    const treasury = rows.find((row) => row.sourceName === "Treasury");
    const marketStress = rows.find((row) => row.sourceName === "Market stress");
    const inflation = rows.find((row) => row.sourceName === "Inflation");
    const labor = rows.find((row) => row.sourceName === "Labor");
    const startup = rows.find((row) => row.sourceName === "Startup/private markets");

    assert.equal(treasury?.mode, "live");
    assert.equal(marketStress?.mode, "live");
    assert.equal(marketStress?.lastSuccessfulFetchAt, "2026-03-10T09:00:00.000Z");
    assert.equal(inflation?.mode, "live");
    assert.equal(labor?.mode, "fallback");
    assert.equal(startup?.mode, "snapshot");
    assert.equal(formatSourceModeLabel(startup?.mode ?? "fallback"), "Snapshot-backed");
    assert.equal(formatSourceFreshnessLabel(startup!), "Current · Curated snapshot");
  });

  it("marks incomplete live coverage as fallback instead of pretending the group is fully live", () => {
    const rows = buildSourceHealthRows({
      treasury: buildTreasury(),
      macroSeries: [
        buildMacroSeriesReading({ id: "BBB_CREDIT_SPREAD", fetched_at: "2026-03-10T09:00:00.000Z", isLive: true }),
        buildMacroSeriesReading({ id: "HY_CREDIT_SPREAD", fetched_at: "2026-03-08T00:00:00.000Z", isLive: false }),
      ],
      now: new Date("2026-03-11T00:00:00.000Z"),
    });

    const marketStress = rows.find((row) => row.sourceName === "Market stress");

    assert.equal(marketStress?.mode, "fallback");
    assert.match(marketStress?.activeFallbackReason ?? "", /mixing live and cached values/i);
  });

  /*
   * The mode alone cannot be acted on. One cached series turns the whole group to "fallback",
   * so an operator reading the trust page sees a failed source without learning which of the
   * four reads failed -- the one thing they need when the box serving production is not
   * reachable to inspect.
   */
  it("names the series that are cached and the ones that never loaded", () => {
    const rows = buildSourceHealthRows({
      treasury: buildTreasury(),
      macroSeries: [
        buildMacroSeriesReading({ id: "BBB_CREDIT_SPREAD", label: "BBB spread", isLive: true }),
        buildMacroSeriesReading({ id: "HY_CREDIT_SPREAD", label: "HY spread", isLive: false }),
      ],
      now: new Date("2026-03-11T00:00:00.000Z"),
    });

    const reason = rows.find((row) => row.sourceName === "Market stress")?.activeFallbackReason ?? "";

    assert.match(reason, /cached: HY spread/, "the cached series is named");
    assert.ok(!reason.includes("BBB spread"), "a live series is not blamed");
    // CHICAGO_FCI and VIX_INDEX are in the group but absent from the reading set entirely,
    // which is a different failure from a stale value and reads differently.
    assert.match(reason, /not loaded: CHICAGO_FCI, VIX_INDEX/, "absent ids are named separately");
  });

  it("keeps the reason clean when a fully cached group has every series present", () => {
    const rows = buildSourceHealthRows({
      treasury: buildTreasury(),
      macroSeries: [
        buildMacroSeriesReading({ id: "CPI_YOY", label: "CPI YoY", isLive: false }),
      ],
      now: new Date("2026-03-11T00:00:00.000Z"),
    });

    const reason = rows.find((row) => row.sourceName === "Inflation")?.activeFallbackReason ?? "";

    assert.match(reason, /running on cached snapshot values \(cached: CPI YoY\)/);
    assert.ok(!reason.includes("not loaded"), "nothing is missing, so nothing claims to be");
  });

  it("summarizes live, cached, and missing source coverage", () => {
    const summary = summarizeSourceHealthCoverage([
      {
        sourceName: "Treasury",
        cadenceLabel: "Daily rates",
        freshnessStatus: "fresh",
        freshnessSlaHours: 26,
        lastSuccessfulFetchAt: "2026-03-10T00:00:00.000Z",
        ageLabel: "1d",
        activeFallbackReason: null,
        mode: "live",
        expectsLive: true,
      },
      {
        sourceName: "Startup/private markets",
        cadenceLabel: "Curated snapshot",
        freshnessStatus: "fresh",
        freshnessSlaHours: 1080,
        lastSuccessfulFetchAt: "2026-03-02T00:00:00.000Z",
        ageLabel: "9d",
        activeFallbackReason: null,
        mode: "snapshot",
        expectsLive: false,
      },
      {
        sourceName: "Labor",
        cadenceLabel: "Monthly release",
        freshnessStatus: "unknown",
        freshnessSlaHours: 1080,
        lastSuccessfulFetchAt: null,
        ageLabel: null,
        activeFallbackReason: "Labor unavailable; no series were loaded for this refresh.",
        mode: "fallback",
        expectsLive: true,
      },
    ]);

    assert.deepEqual(summary, {
      liveCount: 1,
      cachedCount: 1,
      missingCount: 1,
      totalCount: 3,
      inputsComplete: false,
    });
  });
});

describe("stale source disclosure states its age", () => {
  const row = {
    sourceName: "Startup/private markets",
    cadenceLabel: "Curated snapshot",
    freshnessSlaHours: 45 * 24,
    lastSuccessfulFetchAt: "2026-02-02T00:00:00.000Z",
    activeFallbackReason: null,
    mode: "snapshot",
    expectsLive: false,
  } as const;

  // "Stale · Curated snapshot" read identically at one day past SLA and at seven months past
  // it. In prod the curated block had been frozen since 2026-02-02 and still said only that.
  it("names how stale a stale source is", () => {
    assert.equal(
      formatSourceFreshnessLabel({ ...row, freshnessStatus: "stale", ageLabel: "7mo" }),
      "Stale 7mo · Curated snapshot",
    );
  });

  it("falls back to the bare label when no age is known", () => {
    assert.equal(
      formatSourceFreshnessLabel({ ...row, freshnessStatus: "stale", ageLabel: null }),
      "Stale · Curated snapshot",
    );
  });

  it("leaves fresh and current wording alone", () => {
    assert.equal(
      formatSourceFreshnessLabel({ ...row, freshnessStatus: "fresh", ageLabel: "3d" }),
      "Current · Curated snapshot",
    );
    assert.equal(
      formatSourceFreshnessLabel({ ...row, mode: "live", freshnessStatus: "fresh", ageLabel: "3d" }),
      "Fresh · Curated snapshot",
    );
  });

  it("stamps a month-scale age on a curated block frozen since February", () => {
    const rows = buildSourceHealthRows({
      treasury: buildTreasury(),
      macroSeries: [
        buildMacroSeriesReading({ id: "VC_FUNDING_VELOCITY", fetched_at: "2026-02-02T00:00:00.000Z", isLive: false }),
      ],
      now: new Date("2026-08-22T16:00:00.000Z"),
    });

    const startup = rows.find((entry) => entry.sourceName === "Startup/private markets");

    assert.equal(startup?.freshnessStatus, "stale");
    assert.equal(startup?.ageLabel, "7mo");
    assert.equal(formatSourceFreshnessLabel(startup!), "Stale 7mo · Curated snapshot");
  });
});

describe("degraded sources", () => {
  it("keeps stale and unknown live Treasury rows visible at the W39 freeze", () => {
    for (const fetched_at of ["2026-09-22T13:07:00Z", "unreadable"]) {
      const treasury = buildSourceHealthRows({
        treasury: buildTreasury({ record_date: "2026-09-22", fetched_at }),
        macroSeries: [],
        now: new Date("2026-09-24T13:07:00Z"),
      })[0];
      assert.equal(treasury.mode, "live");
      assert.notEqual(treasury.freshnessStatus, "fresh");
      assert.equal(buildDegradedSourceRows([treasury]).length, 1);
    }
  });
  /*
   * "Startup/private markets" is a curated snapshot by design and is never
   * live. Counting it as degraded put "Partly cached" on every page, on every
   * visit, in warning amber — with the guidance to hold until "every source is
   * current", which could never happen.
   */
  const now = new Date("2026-03-11T00:00:00.000Z");
  const liveMacro = (["CPI_YOY", "UNEMPLOYMENT_RATE", "BBB_CREDIT_SPREAD", "HY_CREDIT_SPREAD", "CHICAGO_FCI", "VIX_INDEX"] as const).map(
    (id) => buildMacroSeriesReading({ id, fetched_at: "2026-03-10T09:00:00.000Z", isLive: true }),
  );
  const curated = (fetched_at: string) =>
    (["VC_FUNDING_VELOCITY", "TECH_LAYOFF_TREND", "SAAS_VALUATION_MULTIPLE", "EARNINGS_REVISION_INDEX", "AI_COMPUTE_COST_TREND", "REGULATORY_RISK_TRACKER"] as const).map(
      (id) => buildMacroSeriesReading({ id, fetched_at, isLive: false }),
    );
  const degradedNames = (macroSeries: MacroSeriesReading[], treasury = buildTreasury({ fetched_at: "2026-03-10T20:00:00.000Z" })) =>
    buildDegradedSourceRows(buildSourceHealthRows({ treasury, macroSeries, now })).map((row) => row.sourceName);

  it("does not count a curated snapshot inside its window", () => {
    assert.deepEqual(degradedNames([...liveMacro, ...curated("2026-03-01T00:00:00.000Z")]), []);
  });

  it("counts a curated snapshot past its window", () => {
    assert.deepEqual(degradedNames([...liveMacro, ...curated("2026-01-01T00:00:00.000Z")]), ["Startup/private markets"]);
  });

  it("counts a live source that is not answering live, whatever its age", () => {
    const names = degradedNames(
      [...liveMacro, ...curated("2026-03-01T00:00:00.000Z")],
      buildTreasury({ fetched_at: "2026-03-10T20:00:00.000Z", isLive: false }),
    );
    assert.deepEqual(names, ["Treasury"]);
  });
});

describe("the /trust source board", () => {
  /*
   * The board is drawn open under the score derivation. Its rows must say what
   * the strip's count says, in the strip's words: a row the strip counts as
   * degraded is never drawn as fine, and the curated source inside its window is
   * never drawn as a problem.
   */
  const now = new Date("2026-03-11T00:00:00.000Z");
  const liveIds: MacroSeriesReading["id"][] = ["CPI_YOY", "UNEMPLOYMENT_RATE", "BBB_CREDIT_SPREAD", "HY_CREDIT_SPREAD", "CHICAGO_FCI", "VIX_INDEX"];
  const curatedIds: MacroSeriesReading["id"][] = ["VC_FUNDING_VELOCITY", "TECH_LAYOFF_TREND", "SAAS_VALUATION_MULTIPLE", "EARNINGS_REVISION_INDEX", "AI_COMPUTE_COST_TREND", "REGULATORY_RISK_TRACKER"];
  const healthRows = ({ treasuryLive = true, curatedAt = "2026-03-01T00:00:00.000Z", marketLive = true } = {}) =>
    buildSourceHealthRows({
      treasury: buildTreasury({ fetched_at: "2026-03-10T20:00:00.000Z", isLive: treasuryLive }),
      macroSeries: [
        ...liveIds.map((id) =>
          buildMacroSeriesReading({ id, fetched_at: "2026-03-10T09:00:00.000Z", isLive: marketLive || id === "CPI_YOY" || id === "UNEMPLOYMENT_RATE" }),
        ),
        ...curatedIds.map((id) => buildMacroSeriesReading({ id, fetched_at: curatedAt, isLive: false })),
      ],
      now,
    });

  it("draws every source, live ones as live and the curated one as current", () => {
    const rows = buildSourceBoardRows(healthRows());
    assert.deepEqual(rows.map((row) => row.sourceName), ["Treasury", "Market stress", "Inflation", "Labor", "Startup/private markets"]);
    assert.deepEqual(rows.map((row) => row.stateLabel), ["Live", "Live", "Live", "Live", "Current"]);
    assert.ok(rows.every((row) => row.asIntended));
    assert.equal(rows.at(-1)?.live, false, "current by design is not the same as live");
    assert.equal(rows[0]?.updatedLabel, "Updated Mar 10, 2026, 8:00 PM UTC");
  });

  it("names a cached or stale source in the strip's words, and counts what the strip counts", () => {
    const health = healthRows({ treasuryLive: false, curatedAt: "2026-01-01T00:00:00.000Z", marketLive: false });
    const rows = buildSourceBoardRows(health);
    const byName = new Map(rows.map((row) => [row.sourceName, row]));
    assert.equal(byName.get("Treasury")?.stateLabel, "Cached copy");
    assert.equal(byName.get("Market stress")?.stateLabel, "Cached copy");
    assert.equal(byName.get("Startup/private markets")?.stateLabel, "Stale · 2mo old", "how stale, not only that it is");
    assert.deepEqual(
      rows.filter((row) => !row.asIntended).map((row) => row.sourceName),
      buildDegradedSourceRows(health).map((row) => row.sourceName),
      "the board and the strip count the same rows",
    );
  });

  it("says when a source has never answered rather than printing a date", () => {
    const [treasury] = buildSourceBoardRows(buildSourceHealthRows({ treasury: buildTreasury({ fetched_at: undefined }), macroSeries: [], now }));
    assert.equal(treasury?.stateLabel, "Not confirmed");
    assert.equal(treasury?.updatedLabel, "No update on record");
    assert.equal(treasury?.asIntended, false);
  });
});

describe("Treasury freshness follows the snapshot the cron writes", () => {
  // Production on 2026-10-13: the 02:01 UTC cron wrote the reading, and at 20:16 UTC a 6h
  // window called a healthy afternoon stale. Only the cron republishes the snapshot.
  const fetchedAt = "2026-10-13T02:01:46.905Z";
  const treasuryRow = (now: string) =>
    buildSourceHealthRows({ treasury: buildTreasury({ fetched_at: fetchedAt }), macroSeries: [], now: new Date(now) })[0];

  it("is fresh for the whole day between cron runs", () => {
    assert.equal(treasuryRow("2026-10-13T20:16:47.989Z")?.freshnessStatus, "fresh");
    assert.equal(treasuryRow("2026-10-14T02:00:00.000Z")?.freshnessStatus, "fresh");
  });

  it("is stale once a cron run is missed", () => {
    assert.equal(treasuryRow("2026-10-14T06:00:00.000Z")?.freshnessStatus, "stale");
  });
});

describe("listStaleLiveSources", () => {
  const row = (overrides: Partial<SourceHealthRow>): SourceHealthRow => ({
    sourceName: "Treasury",
    cadenceLabel: "Daily rates",
    freshnessStatus: "fresh",
    freshnessSlaHours: 26,
    lastSuccessfulFetchAt: "2026-10-13T02:01:46.905Z",
    ageLabel: "14h",
    activeFallbackReason: null,
    mode: "live",
    expectsLive: true,
    ...overrides,
  });

  it("names a live source past its window, which /api/health reports as degraded", () => {
    assert.deepEqual(listStaleLiveSources([row({ freshnessStatus: "stale" })]), [
      { source: "Treasury", age: "14h", lastSuccessfulFetchAt: "2026-10-13T02:01:46.905Z" },
    ]);
  });

  it("leaves out fresh sources and curated snapshots, which are current by design", () => {
    assert.deepEqual(
      listStaleLiveSources([
        row({}),
        row({ sourceName: "Startup/private markets", freshnessStatus: "stale", expectsLive: false, mode: "snapshot" }),
      ]),
      [],
    );
  });
});
