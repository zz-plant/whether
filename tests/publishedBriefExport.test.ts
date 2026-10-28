import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildPublishedBriefBoardUpdate,
  buildPublishedBriefEmailUpdate,
  buildPublishedBriefSlackUpdate,
  findPublishedBrief,
  publishedBriefDisplay,
  type PublishedBrief,
} from "../lib/report/publishedBriefs";
import { buildCanonicalUrl } from "../lib/seo";
import { DECISION_CONTRACT_LABELS } from "../lib/report/reportCopy";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

describe("published brief readings block", () => {
  it("prints a reading line per signal when the record carries scores and lines", async () => {
    const { buildPublishedBriefReadingLines } = await import("../lib/report/publishedBriefs");
    const { buildRuleCondition } = await import("../lib/report/boundedDecisionRules");
    const base = findPublishedBrief("2026-w31");
    assert.ok(base);
    const brief: PublishedBrief = {
      ...base,
      scores: {
        tightness: 32,
        riskAppetite: 52,
        tightnessDelta: -8,
        riskAppetiteDelta: -7,
        comparedWith: { recordDate: "2026-06-30", label: "Jun 30" },
      },
      decisions: [
        {
          ...base.decisions[0],
          pause: [buildRuleCondition("tightness", ">", 76), buildRuleCondition("riskAppetite", "<", 44)],
          resume: [buildRuleCondition("tightness", "<", 66), buildRuleCondition("riskAppetite", ">", 54)],
        },
      ],
    };

    /* Value, the line it is judged against, the distance, the earlier reading — the
       four parts `formatScoreReference` prints wherever a score appears, so the
       archive reads the way the page does. The earlier reading carries its date. */
    assert.deepEqual(buildPublishedBriefReadingLines(brief), [
      "Funding pressure 32 of 100 (money is neither easy nor hard to raise) · pause line 76 · 44 pts away · was 40 on Jun 30 · resume line 66 (already met)",
      "Risk appetite 52 of 100 (investors are selective about risk) · pause line 44 · 8 pts away · was 59 on Jun 30 · resume line 54 (2 pts away)",
    ]);
    assert.match(buildPublishedBriefSlackUpdate(brief), /Readings:\nFunding pressure 32 of 100/);
    assert.deepEqual(buildPublishedBriefReadingLines(base), [], "a record frozen without scores prints no readings block");

    /* A move with no named reading and no frozen week before it prints no earlier reading at all. */
    const lines = buildPublishedBriefReadingLines({
      ...brief,
      scores: { tightness: 32, riskAppetite: 52, tightnessDelta: -8, riskAppetiteDelta: -7 },
    });
    assert.equal(lines.length, 2);
    for (const line of lines) assert.doesNotMatch(line, /last week|was \d+ on/);
  });
});

/*
 * w38, w39 and w40 stored their moves against Aug 31 (63/56) without saying so,
 * and the page printed them as "+27.0 vs prior week" and the pastes as "last week
 * 63" — three consecutive weeks claiming the same "last week". A record that names
 * no reading is measured against the frozen week before it, in whole points.
 */
describe("published brief comparisons", () => {
  it("measures an undated record against the frozen week before it", () => {
    const w40 = findPublishedBrief("2026-w40");
    assert.ok(w40?.scores);
    assert.equal(w40.scores.comparedWith, undefined, "the fixture is a record frozen before the date was stored");
    const display = publishedBriefDisplay(w40);
    assert.equal(display.scoreChange("tightness")?.label, "+5 vs Sep 22");
    assert.equal(display.scoreChange("tightness")?.delta, 5, "the move as a number, so a renderer never parses the sign out of the string");
    assert.equal(display.scoreChange("riskAppetite")?.label, "+5 vs Sep 22");
    const slack = buildPublishedBriefSlackUpdate(w40);
    assert.match(slack, /Funding pressure 90 of 100 .* · was 85 on Sep 22 ·/);
    assert.doesNotMatch(slack, /last week 63|vs prior week/);
  });

  it("prints no move for a record with no named reading and no frozen week before it", () => {
    const w38 = findPublishedBrief("2026-w38");
    assert.ok(w38?.scores);
    const display = publishedBriefDisplay(w38);
    assert.equal(display.scoreChange("tightness"), null);
    assert.equal(display.previous, null);
    assert.doesNotMatch(buildPublishedBriefSlackUpdate(w38), /last week|was \d+ on/);
  });

  it("uses the reading a record names over the week before it", () => {
    const w40 = findPublishedBrief("2026-w40");
    assert.ok(w40?.scores);
    const dated: PublishedBrief = {
      ...w40,
      scores: { ...w40.scores, comparedWith: { recordDate: "2026-08-31", label: "Aug 31" } },
    };
    assert.equal(publishedBriefDisplay(dated).scoreChange("tightness")?.label, "+27 vs Aug 31", "whole points, named by the reading");
  });

  it("replaces the retired movement sentence with the move the record can name", () => {
    const w39 = findPublishedBrief("2026-w39");
    const w38 = findPublishedBrief("2026-w38");
    assert.ok(w39 && w38);
    assert.match(w39.whatChanged, /^Pressure increased by \+3\.0 this week/, "the stored record is untouched");
    assert.equal(publishedBriefDisplay(w39).whatChanged, "The scores moved toward tighter money since Sep 15.");
    assert.equal(
      publishedBriefDisplay(w38).whatChanged,
      "Conditions tightened. This record does not name the earlier reading it compared with.",
    );
    const w40 = findPublishedBrief("2026-w40");
    assert.ok(w40);
    assert.equal(publishedBriefDisplay(w40).whatChanged, w40.whatChanged, "a sentence that names its reading is kept");
  });
});

/*
 * The first record was frozen with the engine's names: "Cash availability" for the
 * funding-pressure score (so "cash availability tightens above 76" read as its
 * opposite), "Market risk appetite", "flips this call" with "70.0" and "52.0", and an
 * avoid-list item ("Over-engineering before demand proves out") in the pause slot.
 */
describe("published brief stored-sentence translation", () => {
  it("restates w31's change line in the form later records carry", () => {
    const w31 = findPublishedBrief("2026-w31");
    assert.ok(w31);
    assert.equal(
      publishedBriefDisplay(w31).conditionsChangeIf,
      "Funding pressure rises from 52 to clear 70, or risk appetite falls from 58 to 50 or below.",
    );
  });

  it("puts a crossed line first and keeps a sentence it cannot parse in today's words", () => {
    const w31 = findPublishedBrief("2026-w31");
    assert.ok(w31);
    const crossed = publishedBriefDisplay({
      ...w31,
      flipThreshold:
        "One flip condition is already tripped. Cash availability flips this call if it climbs above 70.0, from 52.0 today. Market risk appetite is already in the flip zone at 48.0 and only has to stay at or below 50.0.",
    }).conditionsChangeIf;
    assert.equal(crossed, "Risk appetite is at or below 50 or funding pressure rises from 52 to clear 70. Risk appetite is 48 now.");
    const unparsed = publishedBriefDisplay({ ...w31, flipThreshold: "Cash availability climbs above 70.0." }).conditionsChangeIf;
    assert.equal(unparsed, "Funding pressure climbs above 70.");
  });

  it("translates retired signal names and whole points without touching a rate", () => {
    const w31 = findPublishedBrief("2026-w31");
    assert.ok(w31);
    const { sentence } = publishedBriefDisplay(w31);
    assert.equal(
      sentence("Pause net-new hiring if cash availability tightens above 76 or market risk appetite falls below 44."),
      "Pause net-new hiring if funding pressure rises above 76 or risk appetite falls below 44.",
    );
    assert.equal(sentence("Cash availability eases below 66.0"), "Funding pressure falls below 66");
    assert.equal(sentence("after the curve returns above 0.0%"), "after the curve returns above 0.0%");
  });

  it("leaves the pause slot out where the record stored no line", () => {
    const w31 = findPublishedBrief("2026-w31");
    const w40 = findPublishedBrief("2026-w40");
    assert.ok(w31 && w40);
    assert.equal(publishedBriefDisplay(w31).pauseIf, null);
    assert.equal(publishedBriefDisplay(w40).pauseIf, w40.guardrailThreshold);
  });
});

describe("published brief date-pinned exports", () => {
  const july30Brief = findPublishedBrief("2026-w31");

  it("finds the July 30, 2026 frozen brief (2026-w31)", () => {
    assert.ok(july30Brief, "July 30, 2026 brief (2026-w31) not found in published_briefs.json");
    assert.equal(july30Brief.recordDate, "2026-07-30");
    assert.equal(july30Brief.recordDateLabel, "Jul 30, 2026");
    assert.equal(july30Brief.slug, "2026-w31");
  });

  it("builds Slack update strictly from PublishedBrief with permanent URL and provenance", () => {
    assert.ok(july30Brief);
    const slack = buildPublishedBriefSlackUpdate(july30Brief);

    assert.match(slack, /Whether Weekly Brief — Jul 30, 2026/);
    assert.match(slack, /Conditions: (Sunny|Cloudy|Stormy|Freezing) \(margin: within reach of the line\)/);
    /* The stored sentences, as the display layer restates them (`publishedBriefDisplay`):
       no "+1.2" in no unit, no "flips this call", no stop-item under "Pause if". */
    assert.match(slack, /^What changed: Conditions tightened\. This record does not name the earlier reading it compared with\./m);
    /* One headline (`publishedBriefHeadline`): the stored call, opened by the stored
       action's direction. The action printed under "Do now" and the call again
       under "Summary" until 2026-10-09. */
    assert.match(slack, /^• Guidance: Conditions are tightening\. Keep expansion selective/m);
    assert.doesNotMatch(slack, /^• Do now:|^Summary:/m);
    assert.doesNotMatch(slack, /freeze new commitments and keep spend flexible/, "the stored action is not a second headline");
    assert.match(slack, /This week's decision \(Guidance \/ Conditions change if\):/);
    assert.doesNotMatch(slack, /Over-engineering/);
    assert.match(slack, /• Conditions change if: Funding pressure rises from 52 to clear 70, or risk appetite falls from 58 to 50 or below\./);
    assert.doesNotMatch(slack, /flip|Cash availability|cash availability|Market risk appetite|market risk appetite|\d\.0\b(?!%)/);

    // Area-level bounded decisions
    assert.match(slack, /• Hiring: Selective hiring for revenue-linked and reliability roles\./);
    assert.match(slack, /Do now: Prioritize revenue-linked and reliability roles/);
    // The rule's own verb is dropped on both lines, so neither label is said twice.
    assert.match(slack, /Pause if: Funding pressure rises above 76 or risk appetite falls below 44/);
    assert.doesNotMatch(slack, /Pause if: Pause/);
    assert.match(slack, /Resume when: Funding pressure falls below 66 and risk appetite is above 54/);
    assert.doesNotMatch(slack, /Resume when: Resume/);

    // Provenance
    assert.match(slack, /Provenance:/);
    assert.match(slack, /Record date Jul 30, 2026 · Saved copy of the published reading · captured Aug 1, 2026 at 1:51 PM UTC/);
    assert.match(slack, /Source: https:\/\/fred\.stlouisfed\.org\/series\/DGS1MO/);

    // Permanent URL
    const expectedUrl = buildCanonicalUrl("/brief/2026-w31");
    assert.match(slack, new RegExp(`Permanent URL: ${expectedUrl}`));
  });

  it("builds Email leadership update strictly from PublishedBrief with permanent URL and provenance", () => {
    assert.ok(july30Brief);
    const email = buildPublishedBriefEmailUpdate(july30Brief);

    assert.match(email, /Whether Leadership Update — Week of Jul 27, 2026/, "the week by its Monday");
    assert.match(email, /Conditions: (Sunny|Cloudy|Stormy|Freezing)\n/);
    assert.match(email, /^Room before a change: within reach of the line$/m);
    assert.match(email, /^• Guidance: Conditions are tightening\. Keep expansion selective/m);
    assert.doesNotMatch(email, /Executive summary:|Action now:/);
    assert.match(email, /What changed this week:\nConditions tightened\. This record does not name the earlier reading it compared with\./);
    assert.doesNotMatch(email, /freeze new commitments and keep spend flexible/, "the stored action is not a second headline");
    assert.ok(!email.includes(`• ${DECISION_CONTRACT_LABELS.threshold.pauseIf}: Over-engineering`), "a stop-item is not a pause line");
    assert.ok(
      email.includes(`• ${DECISION_CONTRACT_LABELS.watch.postureFlips}: Funding pressure rises from 52 to clear 70, or risk appetite falls from 58 to 50 or below.`),
    );

    // Area decisions
    assert.match(email, /• Roadmap: Speed up product work tied to activation and retention goals\./);
    assert.match(email, /- Action: Speed up on product bets/);
    assert.match(email, /- Pause if: Risk appetite falls below 44/);
    assert.doesNotMatch(email, /Pause if: Pause/);
    assert.match(email, /- Resume when: Risk appetite is above 54/);
    assert.doesNotMatch(email, /Resume when: Resume/);

    // Provenance & citations
    assert.match(email, /• Record date: Jul 30, 2026/);
    assert.match(email, /• Source: Saved copy of the published reading \(https:\/\/fred\.stlouisfed\.org\/series\/DGS1MO\)/);
    assert.match(email, /• Freshness: Aug 1, 2026 at 1:51 PM UTC/);

    // Permanent URL
    const expectedUrl = buildCanonicalUrl("/brief/2026-w31");
    assert.match(email, new RegExp(`Permanent URL: ${expectedUrl}`));
  });

  it("builds Board memo strictly from PublishedBrief with permanent URL and operating limits", () => {
    assert.ok(july30Brief);
    const board = buildPublishedBriefBoardUpdate(july30Brief);

    assert.match(board, /^Whether Board Memo — Week of/m);
    assert.match(board, /^Macro Posture: (Sunny|Cloudy|Stormy|Freezing) \(Room before a change: .+\)$/m);
    assert.match(board, /^Executive Guidance: .+/m);
    assert.match(board, /^Posture Flips If: .+/m);
    assert.match(board, /Operating Limits by Area:/);
    assert.match(board, /• Hiring: .+ \(Action: .+\)/);
    assert.match(board, new RegExp(`Permanent Record: ${buildCanonicalUrl("/brief/2026-w31")}`));
  });

  it("proves July 30 brief exports never read or change with live report data", async () => {
    assert.ok(july30Brief);

    // Capture baseline exports from PublishedBrief
    const baselineSlack = buildPublishedBriefSlackUpdate(july30Brief);
    const baselineEmail = buildPublishedBriefEmailUpdate(july30Brief);
    const baselineBoard = buildPublishedBriefBoardUpdate(july30Brief);

    // Even if we import live report modules and inspect reportData, PublishedBrief remains pure
    const { loadReportData } = await import("../lib/report/reportData");
    const liveReport = await loadReportData();

    // Verify live data has a different record date or live attributes
    assert.ok(liveReport.treasury.record_date !== undefined);

    // Re-evaluate exports for July 30 brief
    const afterSlack = buildPublishedBriefSlackUpdate(july30Brief);
    const afterEmail = buildPublishedBriefEmailUpdate(july30Brief);
    const afterBoard = buildPublishedBriefBoardUpdate(july30Brief);

    assert.equal(baselineSlack, afterSlack, "Slack brief changed after live data module load!");
    assert.equal(baselineEmail, afterEmail, "Email brief changed after live data module load!");
    assert.equal(baselineBoard, afterBoard, "Board memo changed after live data module load!");
    assert.ok(!baselineSlack.includes(liveReport.treasury.record_date), "Live record date leaked into frozen Slack brief");
  });

  it("renders corrections when present in PublishedBrief", () => {
    assert.ok(july30Brief);
    const briefWithCorrection: PublishedBrief = {
      ...july30Brief,
      correction: "Updated Fed funds rate sensitivity calculation for week 31.",
    };

    const slack = buildPublishedBriefSlackUpdate(briefWithCorrection);
    const email = buildPublishedBriefEmailUpdate(briefWithCorrection);

    assert.match(slack, /Correction: Updated Fed funds rate sensitivity calculation for week 31\./);
    assert.match(email, /Correction note: Updated Fed funds rate sensitivity calculation for week 31\./);
  });
});
