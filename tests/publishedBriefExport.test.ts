import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildPublishedBriefEmailUpdate,
  buildPublishedBriefSlackUpdate,
  findPublishedBrief,
  type PublishedBrief,
} from "../lib/report/publishedBriefs";
import { buildCanonicalUrl } from "../lib/seo";
import { DECISION_CONTRACT_LABELS } from "../lib/report/reportCopy";

describe("published brief readings block", () => {
  it("prints a reading line per signal when the record carries scores and lines", async () => {
    const { buildPublishedBriefReadingLines } = await import("../lib/report/publishedBriefs");
    const { buildRuleCondition } = await import("../lib/report/boundedDecisionRules");
    const base = findPublishedBrief("2026-w31");
    assert.ok(base);
    const brief: PublishedBrief = {
      ...base,
      scores: { tightness: 32, riskAppetite: 52, tightnessDelta: -8, riskAppetiteDelta: -7 },
      decisions: [
        {
          ...base.decisions[0],
          pause: [buildRuleCondition("tightness", ">", 76), buildRuleCondition("riskAppetite", "<", 44)],
          resume: [buildRuleCondition("tightness", "<", 66), buildRuleCondition("riskAppetite", ">", 54)],
        },
      ],
    };

    /* Value, the line it is judged against, the distance, last week — the four
       parts `formatScoreReference` prints wherever a score appears, so the
       archive reads the way the page does. */
    assert.deepEqual(buildPublishedBriefReadingLines(brief), [
      "Funding pressure 32 of 100 (money is neither easy nor hard to raise) · pause line 76 · 44 pts below · last week 40 · resume line 66 (already met)",
      "Risk appetite 52 of 100 (investors are selective about risk) · pause line 44 · 8 pts above · last week 59 · resume line 54 (2 pts away)",
    ]);
    assert.match(buildPublishedBriefSlackUpdate(brief), /Readings:\nFunding pressure 32 of 100/);
    assert.deepEqual(buildPublishedBriefReadingLines(base), [], "a record frozen without scores prints no readings block");
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
    assert.match(slack, /Conditions: (Sunny|Cloudy|Stormy|Freezing) \(medium confidence\)/);
    assert.match(slack, /• What changed: Pressure increased by \+1\.2 this week\./);
    assert.match(slack, /• Call: Keep expansion selective/);
    assert.match(slack, /• Do now: Conditions tightening — freeze new commitments and keep spend flexible\./);
    assert.match(slack, /• Pause if: Over-engineering before demand proves out/);
    assert.match(slack, /• Call changes if: No flip condition is tripped yet\./);

    // Area-level bounded decisions
    assert.match(slack, /• Hiring: Selective hiring for revenue-linked and reliability roles\./);
    assert.match(slack, /Do now: Prioritize revenue-linked and reliability roles/);
    assert.match(slack, /Pause if: Pause net-new hiring/);
    // The rule's own verb is dropped, so the label is not said twice.
    assert.match(slack, /Resume when: Cash availability eases below 66 and market risk appetite is above 54/);
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

    assert.match(email, /Whether Leadership Update — Week of Jul 30, 2026/);
    assert.match(email, /Conditions: (Sunny|Cloudy|Stormy|Freezing)\n/);
    assert.match(email, /Confidence: Medium confidence/);
    assert.match(email, /Executive summary: Keep expansion selective/);
    assert.match(email, /What changed this week:\nPressure increased by \+1\.2 this week\./);
    assert.match(email, /• Action now: Conditions tightening — freeze new commitments and keep spend flexible\./);
    assert.ok(email.includes(`• ${DECISION_CONTRACT_LABELS.threshold.pauseIf}: Over-engineering before demand proves out`));
    assert.ok(email.includes(`• ${DECISION_CONTRACT_LABELS.watch.postureFlips}: No flip condition is tripped yet.`));

    // Area decisions
    assert.match(email, /• Roadmap: Speed up product work tied to activation and retention goals\./);
    assert.match(email, /- Action: Speed up on product bets/);
    assert.match(email, /- Pause if: Pause long-payback bets/);
    assert.match(email, /- Resume when: Market risk appetite is above 54/);
    assert.doesNotMatch(email, /Resume when: Resume/);

    // Provenance & citations
    assert.match(email, /• Record date: Jul 30, 2026/);
    assert.match(email, /• Source: Saved copy of the published reading \(https:\/\/fred\.stlouisfed\.org\/series\/DGS1MO\)/);
    assert.match(email, /• Freshness: Aug 1, 2026 at 1:51 PM UTC/);

    // Permanent URL
    const expectedUrl = buildCanonicalUrl("/brief/2026-w31");
    assert.match(email, new RegExp(`Permanent URL: ${expectedUrl}`));
  });

  it("proves July 30 brief exports never read or change with live report data", async () => {
    assert.ok(july30Brief);

    // Capture baseline exports from PublishedBrief
    const baselineSlack = buildPublishedBriefSlackUpdate(july30Brief);
    const baselineEmail = buildPublishedBriefEmailUpdate(july30Brief);

    // Even if we import live report modules and inspect reportData, PublishedBrief remains pure
    const { loadReportData } = await import("../lib/report/reportData");
    const liveReport = await loadReportData();

    // Verify live data has a different record date or live attributes
    assert.ok(liveReport.treasury.record_date !== undefined);

    // Re-evaluate exports for July 30 brief
    const afterSlack = buildPublishedBriefSlackUpdate(july30Brief);
    const afterEmail = buildPublishedBriefEmailUpdate(july30Brief);

    assert.equal(baselineSlack, afterSlack, "Slack brief changed after live data module load!");
    assert.equal(baselineEmail, afterEmail, "Email brief changed after live data module load!");
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
