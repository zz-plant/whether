import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";
import { evaluateRegime } from "../lib/regimeEngine";
import { decisionAreaLabel, decisionAreaOrder, isRuleConditionMet } from "../lib/report/boundedDecisionRules";
import { operatingLeverToDecisionArea } from "../lib/report/businessAreaMap";
import { buildHomeBriefModel } from "../lib/report/homeBriefModel";
import { loadReportData } from "../lib/report/reportData";
import { POLICY_OVERRIDE_CALL } from "../lib/report/reportCopy";
import { loadWeeklyBriefSnapshot } from "../lib/report/weeklyBriefSnapshot";
import type { MacroSeriesId, TreasuryData } from "../lib/types";
import {
  findTimeMachineGovernedAssessment,
  getPreviousTimeMachineSnapshot,
  getTimeMachineSnapshots,
} from "../lib/timeMachine/timeMachineCache";

const mockAny: any = mock;

/* The period pickers reach the router through next/navigation, which
   renderToStaticMarkup never mounts. Spread, not replaced: `mock.module` is
   process-wide. */
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

/*
 * /history/compare prints two months side by side, and each column has to be
 * that month's. It printed this week's borrowing premium, inflation and
 * unemployment under Mar 31, 2020 (the report returned the macro series fetched
 * today for every selection), "0.00%" for the change between them, "This week's
 * guidance" over a month six years back, and "Expansion pace: Open" on a
 * Freezing month whose guidance froze new commitments. Every check here reads a
 * value against the thing it claims to be, so a reword cannot pass by accident.
 *
 * Offline: the replayed months read the bundled archive, the current week the
 * bundled snapshot.
 */

const MACRO_IDS: MacroSeriesId[] = ["BBB_CREDIT_SPREAD", "CPI_YOY", "UNEMPLOYMENT_RATE"];

const plainText = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

const renderCompare = async (searchParams: Record<string, string>) => {
  const page = await import("../app/history/compare/page");
  const html = renderToStaticMarkup(await page.default({ searchParams: Promise.resolve(searchParams) }));
  const text = plainText(html);
  /* The side-by-side grid is the last thing on the page before the footer, and
     its second column opens with the "Period B" eyebrow. */
  const grid = plainText(html.slice(html.indexOf('id="ops-compare-grid"')));
  const split = grid.indexOf("Period B");
  return { text, columnA: grid.slice(0, split), columnB: grid.slice(split) };
};

describe("a replayed month carries its own macro readings, or none", () => {
  it("returns the series as of the selected month-end, never today's values", async () => {
    const historical = await loadReportData({ month: "3", year: "2020" });
    assert.ok(historical.historicalSelection);
    const asOf = historical.treasury.record_date;

    for (const id of MACRO_IDS) {
      const reading = historical.macroSeries.find((entry) => entry.id === id);
      assert.ok(reading, `${id} is still listed`);
      assert.equal(reading.value, null, `${id} has no observation on record for ${asOf}; it printed today's`);
    }
    for (const reading of historical.macroSeries) {
      assert.ok(
        reading.value === null || reading.record_date <= asOf,
        `${reading.id} carries ${reading.value} from ${reading.record_date}, after the month it is printed under (${asOf})`,
      );
    }
  });
});

/*
 * A replay is the governed record, and so is what it is compared with. The month-end
 * before it and the one a year back were point reads, which disagree with the record's
 * conditions in 24 of the 177 month-ends on file (2026-10-14). December 2024 reads
 * DEFENSIVE alone where the record says SCARCITY, so the January 2025 replay announced
 * a move to Freezing; February 2020 reads EXPANSION where the record says VOLATILE.
 */
describe("a replayed month is compared with the record, not a point read", () => {
  it("reports no change of conditions into January 2025, which the record holds at Freezing", async () => {
    const january = await loadReportData({ month: "1", year: "2025" });
    const monthEnd = getPreviousTimeMachineSnapshot(january.treasury.record_date);
    assert.ok(monthEnd);
    assert.equal(evaluateRegime(monthEnd).regime, "DEFENSIVE");
    assert.equal(findTimeMachineGovernedAssessment(monthEnd.record_date)?.regime, "SCARCITY");

    assert.equal(january.assessment.regime, "SCARCITY");
    assert.equal(january.regimeAlert, null);
    assert.equal(january.reportDynamics.regimeChanged, false);
  });

  it("compares March 2020 with February's record and the year-earlier record", async () => {
    const march = await loadReportData({ month: "3", year: "2020" });
    const lastYear = march.lastYearComparison;
    assert.ok(lastYear);

    assert.equal(march.regimeAlert, null, "February 2020's record is already Stormy");
    assert.equal(lastYear.prior.regime, findTimeMachineGovernedAssessment(lastYear.prior.recordDate)?.regime);
  });

  // The split's first stage is measured from the rates-alone read of the month-end. Where
  // the record's scores differ from it, that gap would print as a move in rates.
  it("splits a month-end move only when the record scores the month-end as the rates alone do", async () => {
    for (const { year, month } of getTimeMachineSnapshots().slice(-24)) {
      const replay = await loadReportData({ month: String(month), year: String(year) });
      const monthEnd = getPreviousTimeMachineSnapshot(replay.treasury.record_date);
      if (!monthEnd || !replay.monthEndComparison?.movement) continue;
      const point = evaluateRegime(monthEnd, replay.thresholds).scores;
      const record = findTimeMachineGovernedAssessment(monthEnd.record_date, replay.thresholds)?.scores ?? point;
      assert.deepEqual(
        { tightness: record.tightness, riskAppetite: record.riskAppetite },
        { tightness: point.tightness, riskAppetite: point.riskAppetite },
        `${year}-${month} split a move from a month-end the record scores differently`,
      );
    }
  });
});

describe("/history/compare draws each period from its own month", () => {
  it("prints 'not on record' for a past month's missing inputs, and no invented zero between the two", async () => {
    const { text, columnA, columnB } = await renderCompare({ yearB: "2020", monthB: "3" });

    const notOnRecord = columnB.match(/Not on record for this month/g) ?? [];
    assert.equal(notOnRecord.length, MACRO_IDS.length, "Mar 2020's three macro rows say the record has none");
    assert.match(columnA, /Corporate borrowing premium \d+\.\d{2}%/, "the current week keeps its own figure");
    /* Defined once, under the difference tile; each column prints its value alone (2026-10-09). */
    assert.equal((text.match(/Extra interest mid-grade companies pay over the government/g) ?? []).length, 1);

    assert.doesNotMatch(text, /0\.00%/, "a missing side was read as zero");
    assert.match(text, /Not on record for Period B \(Mar 31, 2020\)\./);
  });

  it("names each period as labelled, and does not call a past month 'this week'", async () => {
    const { text, columnB } = await renderCompare({ yearB: "2020", monthB: "3" });

    for (const heading of ["Rules in Period A", "Signals in Period A", "Rules in Period B", "Signals in Period B"]) {
      assert.ok(text.includes(heading), `${heading} renders`);
    }
    assert.doesNotMatch(text, /\bperiod [ab]\b/, "the label kept its case");
    assert.doesNotMatch(columnB, /this week/i, "Mar 2020 is not this week");
    assert.match(columnB, /since Feb \d{1,2}\.|holding where it was on Feb \d{1,2}\./, "the move is dated by the earlier month-end");
  });

  it("states the held guidance's pause line as a condition", async () => {
    const { columnB } = await renderCompare({ yearB: "2020", monthB: "3" });
    /* Held because its two scores disagree. Until 2026-10-07 every replayed
       month was held for missing inputs, the record carrying no macro series. */
    const hold = POLICY_OVERRIDE_CALL["signals-disagree"];

    assert.ok(columnB.includes(`Pause if ${hold.pauseIf}`), "Mar 2020 is a held month");
    for (const [reason, { pauseIf, actionNow }] of Object.entries(POLICY_OVERRIDE_CALL)) {
      assert.doesNotMatch(
        pauseIf,
        /^(Hold|Keep|Pause|Cap|Freeze|Slow|Stop|Defer)\b/,
        `"Pause if: ${pauseIf}" reads as an instruction (${reason})`,
      );
      assert.ok(!actionNow.includes(pauseIf), `and does not repeat the action (${reason})`);
    }
  });

  /* Jan 2025 is Freezing at funding pressure 90 and risk appetite 54: the old
     expansion cutoff (45) read that as "Open". */
  it("states each area against its own published pause line, which a Freezing month has crossed", async () => {
    const { columnA } = await renderCompare({ yearA: "2025", monthA: "1", yearB: "2020", monthB: "3" });
    const { reportData } = await loadWeeklyBriefSnapshot({ year: "2025", month: "1" });
    assert.equal(reportData.assessment.regime, "SCARCITY");

    assert.doesNotMatch(columnA, /Expansion pace|Hiring window|Fundraising window|\bOpen\b/);
    const scores = reportData.assessment.scores;
    for (const area of decisionAreaOrder) {
      const item = reportData.actionStripItems.find((candidate) => operatingLeverToDecisionArea[candidate.lever] === area);
      const crossed = (item?.pauseConditions ?? []).some((line) => isRuleConditionMet(line, scores[line.metric]));
      const row = new RegExp(`${decisionAreaLabel(area)}\\s*:\\s*Pause line crossed`);
      assert.equal(row.test(columnA), crossed, `${decisionAreaLabel(area)} agrees with its pause line at ${scores.tightness}/${scores.riskAppetite}`);
    }
    assert.match(columnA, /New bets\s*:\s*Pause line crossed/, "new commitments are paused, as the guidance says");
  });
});

describe("the period caption on a replayed month", () => {
  const treasury: TreasuryData = {
    record_date: "2012-01-31",
    fetched_at: "2026-09-15T00:00:00Z",
    source: "US Treasury",
    isLive: false,
    yields: { oneMonth: 0.03, threeMonth: 0.05, twoYear: 0.22, tenYear: 1.83 },
  };
  /* Mid-scale scores, so a ten-point move is not lost to the boldness clamp. */
  const evaluated = evaluateRegime(treasury);
  const assessment = { ...evaluated, scores: { ...evaluated.scores, tightness: 50, riskAppetite: 50 } };
  const modelFor = (overrides: Partial<Parameters<typeof buildHomeBriefModel>[0]>) =>
    buildHomeBriefModel({
      assessment,
      treasury,
      sensors: [],
      macroSeries: [],
      reportDynamics: { directionLabel: "unavailable", changedSignals: [] },
      startItems: [],
      stopItems: [],
      regimeAlert: null,
      historicalSelection: { month: 1, year: 2012, banner: "" },
      ...overrides,
    });

  it("says there is nothing to compare where the record starts", () => {
    assert.equal(modelFor({}).weeklyLeadershipSummary.shorthandLine, "No earlier month-end to compare with.");
  });

  /* The caption is the operating latitude's move, about the number. It read "This week's
     guidance is …" on a live week, a claim about the guidance made from a blend of the two
     scores. */
  it("dates the latitude's move by the earlier reading, on a replayed month and a live week alike", () => {
    const compared = {
      regimeAlert: { previousRegime: assessment.regime },
      reportDynamics: {
        directionLabel: "deteriorating" as const,
        changedSignals: [{ key: "riskAppetite" as const, delta: -10 }],
        comparedWith: { recordDate: "2011-12-30", label: "Dec 30, 2011" },
      },
    };
    assert.equal(modelFor(compared).weeklyLeadershipSummary.shorthandLine, "Operating latitude down since Dec 30, 2011.");
    assert.equal(
      modelFor({ ...compared, historicalSelection: null }).weeklyLeadershipSummary.shorthandLine,
      "Operating latitude down since Dec 30, 2011.",
    );
  });

  /* The latitude's earlier reading was built only when a regime alert existed, so a month
     compared with its earlier month-end, with no change line crossed, read "No earlier
     month-end to compare with." over a ten-point fall in risk appetite. */
  it("measures the move whenever a comparison exists, not only when a change line was crossed", () => {
    const summary = modelFor({
      reportDynamics: {
        directionLabel: "deteriorating",
        changedSignals: [{ key: "riskAppetite", delta: -10 }],
        comparedWith: { recordDate: "2011-12-30", label: "Dec 30, 2011" },
      },
    }).weeklyLeadershipSummary;
    assert.equal(summary.boldnessDelta, -7);
    assert.equal(summary.shorthandLine, "Operating latitude down since Dec 30, 2011.");
  });
});

/*
 * Each picker shows the month its column draws (2026-10-09). With no query, Period A
 * drew the current week while its picker defaulted to the newest month-end the
 * archive holds, so the page read "Sep 2026 · Cloudy" over a column dated Oct 7,
 * Freezing. Period B offered the same "current week" choice, which cleared its query
 * and loaded its Mar 2020 default instead.
 */
describe("/history/compare: each period's picker names the month its column draws", () => {
  const renderSelects = async (searchParams: Record<string, string>) => {
    const page = await import("../app/history/compare/page");
    const html = renderToStaticMarkup(await page.default({ searchParams: Promise.resolve(searchParams) }));
    const selects = [...html.matchAll(/<select[\s\S]*?<\/select>/g)].map((match) => match[0]);
    assert.equal(selects.length, 2, "one picker per period");
    const selected = (select: string) => plainText(/<option[^>]*selected=""[^>]*>([^<]*)<\/option>/.exec(select)?.[1] ?? "").trim();
    const grid = plainText(html.slice(html.indexOf('id="ops-compare-grid"')));
    return { pickerA: selects[0], pickerB: selects[1], selected, columnA: grid.slice(0, grid.indexOf("Period B")) };
  };

  it("selects This week for Period A with no query, the week its column draws", async () => {
    const { pickerA, selected, columnA } = await renderSelects({});
    const { reportData } = await loadWeeklyBriefSnapshot(undefined, { route: "/history/compare" });
    assert.equal(selected(pickerA), "This week");
    assert.ok(columnA.includes(reportData.recordDateLabel), `the column is the current week (${reportData.recordDateLabel})`);
  });

  it("selects the queried month for Period A, as its column draws it", async () => {
    const { pickerA, selected, columnA } = await renderSelects({ yearA: "2022", monthA: "9" });
    assert.match(selected(pickerA), /^Sep 2022 · /);
    assert.match(columnA, /Sep 30, 2022/);
  });

  it("offers no current-week choice for Period B, whose blank query means Mar 2020", async () => {
    const { pickerB, selected } = await renderSelects({});
    assert.doesNotMatch(pickerB, /<option value="">/);
    assert.match(selected(pickerB), /^Mar 2020 · /);
  });
});
