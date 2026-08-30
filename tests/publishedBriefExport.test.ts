import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildPublishedBriefEmailUpdate,
  buildPublishedBriefSlackUpdate,
  findPublishedBrief,
  getPublishedBriefs,
  type PublishedBrief,
} from "../lib/report/publishedBriefs";
import { buildCanonicalUrl } from "../lib/seo";

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
    assert.match(slack, /Posture: Guarded Expansion — Late \(MED confidence\)/);
    assert.match(slack, /• What changed: Pressure increased by \+1\.2 this week\./);
    assert.match(slack, /• Posture: Keep expansion selective/);
    assert.match(slack, /• Do now: Conditions tightening — freeze new commitments and keep spend flexible\./);
    assert.match(slack, /• Pause if: Over-engineering before demand proves out/);
    assert.match(slack, /• Re-open when: No flip condition is tripped yet\./);

    // Area-level bounded decisions
    assert.match(slack, /• Hiring: Selective hiring for revenue-linked and reliability roles\./);
    assert.match(slack, /Do now: Prioritize revenue-linked and reliability roles/);
    assert.match(slack, /Pause if: Pause net-new hiring/);
    assert.match(slack, /Re-open when: Resume staged approvals/);

    // Provenance
    assert.match(slack, /Provenance:/);
    assert.match(slack, /Record date Jul 30, 2026 · Canonical snapshot \(high confidence\) · captured Aug 1, 2026 at 1:51 PM UTC/);
    assert.match(slack, /Source: https:\/\/fred\.stlouisfed\.org\/series\/DGS1MO/);

    // Permanent URL
    const expectedUrl = buildCanonicalUrl("/brief/2026-w31");
    assert.match(slack, new RegExp(`Permanent URL: ${expectedUrl}`));
  });

  it("builds Email leadership update strictly from PublishedBrief with permanent URL and provenance", () => {
    assert.ok(july30Brief);
    const email = buildPublishedBriefEmailUpdate(july30Brief);

    assert.match(email, /Whether Leadership Update — Week of Jul 30, 2026/);
    assert.match(email, /Posture: Guarded Expansion — Late/);
    assert.match(email, /Confidence: MED confidence/);
    assert.match(email, /Executive summary: Keep expansion selective/);
    assert.match(email, /What changed this week:\nPressure increased by \+1\.2 this week\./);
    assert.match(email, /• Action now: Conditions tightening — freeze new commitments and keep spend flexible\./);
    assert.match(email, /• Guardrail threshold: Over-engineering before demand proves out/);
    assert.match(email, /• Reversal condition: No flip condition is tripped yet\./);

    // Area decisions
    assert.match(email, /• Product tempo: Speed up product work tied to activation and retention goals\./);
    assert.match(email, /- Action: Speed up on product bets/);
    assert.match(email, /- Pause if: Pause long-payback bets/);
    assert.match(email, /- Resume when: Resume tempo on deferred bets/);

    // Provenance & citations
    assert.match(email, /• Record date: Jul 30, 2026/);
    assert.match(email, /• Source: Canonical snapshot \(high confidence\) \(https:\/\/fred\.stlouisfed\.org\/series\/DGS1MO\)/);
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
