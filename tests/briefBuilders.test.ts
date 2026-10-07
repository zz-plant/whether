import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildBoardSlideBullets, buildCallCitation, buildSlackBrief } from "../lib/export/briefBuilders";
import { regimeSignalLabel } from "../lib/report/signalTranslations";
import { POLICY_OVERRIDE_CALL } from "../lib/report/reportCopy";
import { joinSentences } from "../lib/report/reportFormatting";

import { assessment, fixtureBriefDocument, fixtureWeeklyCall } from "./factories/exportFixtures";

const slot = (brief: string, label: string) => brief.match(new RegExp(`• ${label}: (.+)`))?.[1] ?? "";

describe("buildSlackBrief", () => {
  it("prints the call contract's slots, each with content of its own shape", () => {
    // With no modeled payload — the weekly artifact script called it this way —
    // the slots used to fall back to `assessment.constraints`, a list of actions,
    // and then to stand-ins: "Keep last week's approvals as they are; start
    // nothing new." as the action and the assessment's description as the call.
    const weeklyCall = fixtureWeeklyCall();
    const brief = buildSlackBrief(fixtureBriefDocument({ weeklyCall }));

    /* The guidance opens on the do-now line the homepage, the email and the
       /share post lead with, and the stance follows it. The two used to print
       under "Guidance" and "Do now", so "Guidance:" meant a different sentence
       here than in every other paste. */
    assert.equal(slot(brief, "Guidance"), joinSentences(weeklyCall.actionNow, weeklyCall.currentCall));
    assert.ok(slot(brief, "Guidance").startsWith(weeklyCall.actionNow));
    assert.equal(slot(brief, "Do now"), "", "no second slot repeats the guidance");
    assert.equal(slot(brief, "Pause if"), weeklyCall.pauseIf);
    assert.equal(slot(brief, "Conditions change if"), weeklyCall.callChangesIf);
    for (const label of ["Pause if", "Resume when", "Conditions change if"]) {
      assert.ok(!assessment.constraints.includes(slot(brief, label)), `${label} is filled from the operating-constraints list`);
    }
    assert.doesNotMatch(brief, /start nothing new/);
  });

  it("prints the pause line as its condition, and the lead area's resume line apart from the change line", () => {
    const brief = buildSlackBrief(
      fixtureBriefDocument({
        weeklyCall: { ...fixtureWeeklyCall(), pauseIf: "Pause net-new hiring if funding pressure rises above 76" },
      }),
    );

    assert.match(brief, /^• Pause if: Funding pressure rises above 76$/m);
    assert.match(brief, /^• Resume when: Funding pressure falls below 66 and risk appetite is above 54$/m);
    assert.doesNotMatch(brief, /Pause if: Pause|Resume when: Resume/);
    assert.match(brief, /This week's decision \(Guidance \/ Pause if \/ Resume when \/ Conditions change if\):/);
    const order = ["• Guidance:", "• Pause if:", "• Resume when:", "• Conditions change if:"].map((label) => brief.indexOf(label));
    assert.deepEqual([...order].sort((left, right) => left - right), order, "the slots print in the page's order");
  });

  it("prints a held call's lines and no competing resume line", () => {
    const held = fixtureWeeklyCall({
      ...assessment,
      policyAssessment: { ...assessment.policyAssessment, refusal: { refused: true, reasons: ["The two scores disagree."] } },
    });
    assert.equal(held.policyOverrideActive, true);
    const brief = buildSlackBrief(fixtureBriefDocument({ weeklyCall: held }));

    assert.equal(slot(brief, "Guidance"), joinSentences(POLICY_OVERRIDE_CALL.actionNow, POLICY_OVERRIDE_CALL.currentCall));
    assert.equal(slot(brief, "Pause if"), POLICY_OVERRIDE_CALL.pauseIf);
    assert.equal(slot(brief, "Conditions change if"), POLICY_OVERRIDE_CALL.callChangesIf);
    assert.equal(slot(brief, "Resume when"), "");
    assert.match(brief, /This week's decision \(Guidance \/ Pause if \/ Conditions change if\):/);
  });

  it("states each reading against the corridor as numbers, not a paragraph", () => {
    const brief = buildSlackBrief(fixtureBriefDocument());

    // Each score carries what it means beside the number: a paste has no page to explain the scale.
    assert.match(brief, /^Funding pressure 12 of 100 \(money is easy to raise\) · pause line 76 · 64 pts below · resume line 66 \(already met\)$/m);
    assert.match(brief, /^Risk appetite 68 of 100 \(investors are selective about risk\) · pause line 44 · 24 pts above · resume line 54 \(already met\)$/m);
    // Per-area rows print lines with a distance, not the rule's sentence.
    assert.match(brief, /Pause if: Risk appetite < 44 \(24 pts away\) or/);
    // The qualifier is part of the rule and prints with the lines.
    assert.match(brief, /Resume when: Funding pressure < 66 \(already met\) and the payback figures still hold/);
  });

  it("resolves its change-course cross-reference to a label it actually prints", () => {
    const brief = buildSlackBrief(fixtureBriefDocument());
    const referenced = brief.match(/What would show it: "([^"]+)"/)?.[1];
    assert.ok(referenced, "no change-course cross-reference found");
    assert.ok(brief.includes(`• ${referenced}:`), `cross-reference points at "${referenced}", which the brief never prints`);
  });

  it("names the rate signals the way the rest of the product does", () => {
    const brief = buildSlackBrief(fixtureBriefDocument());
    /* Read from the canonical table rather than a literal: the point of this
       test is that the brief and the site agree, and a literal here would let
       them disagree by only failing the rename in one direction. */
    assert.ok(brief.includes(`${regimeSignalLabel.baseRate}:`));
    assert.ok(brief.includes(regimeSignalLabel.curveSlope));
    assert.doesNotMatch(brief, /^Curve slope:/m);
    /* The engine has never read a Fed policy rate, so this name must not come back. */
    assert.doesNotMatch(brief, /Fed interest rate/);
  });

  it("formats index values without the literal unit suffix, and bps with readable spacing", () => {
    const brief = buildSlackBrief(fixtureBriefDocument());

    assert.match(brief, /Chicago Fed National Financial Conditions Index: -0\.52 · refreshed 2026-02-27/);
    assert.doesNotMatch(brief, /-0\.52index/);
    assert.match(brief, /BBB credit spread \(OAS\): 174\.00 basis points · refreshed 2026-03-04/);
  });

  /* This block used to be computed from a hardcoded company (13 months of runway, $700k burn,
     $500k revenue, growth-stage B2B SaaS) and printed with nothing marking it as a sample, so a
     Slack channel read "Raise window: month 3 to 9" as a statement about its own company. The
     runway planner on /operate prints the same block from figures the reader entered. */
  it("carries no runway figures, because the brief has no company to compute them for", () => {
    const brief = buildSlackBrief(fixtureBriefDocument());

    assert.doesNotMatch(brief, /Financial implications:/);
    assert.doesNotMatch(brief, /Runway risk:|Raise window:|Burn adjustment:|Safe runway band:/);
  });

  it("states the published confidence as a word under why-this-could-be-wrong", () => {
    const brief = buildSlackBrief(fixtureBriefDocument());

    // The published band, as a word: 58 and 18 points out (81 on the tightness
    // scale) is High. The fixture's engine code says MEDIUM, and neither that
    // code nor its band reaches a paste any more.
    assert.match(brief, /Why this could be wrong:/);
    assert.match(brief, /^• High confidence$/m);
    assert.doesNotMatch(brief, /MEDIUM|\bMED\b/);
    /* The contract's sentence, which reads the confidence: this High week is
       not told it sits near a line. */
    assert.doesNotMatch(brief, /The scores sit near a line/);
    assert.match(brief, /• Even at high confidence, individual signals can reverse/);
  });

  it("carries each area's timing line into the per-area rows", () => {
    const brief = buildSlackBrief(fixtureBriefDocument());

    /* One row per decision area, in `decisionAreaOrder`, the way every surface
       tabulates them since 2026-09-22 — the brief used to print the first two. */
    const timingLines = brief.match(/^  Timing: .+$/gm) ?? [];
    assert.equal(timingLines.length, 5, `expected five Timing lines, got ${timingLines.length}`);
    // Hiring leads the order, and its clock is headcount's, not spending's.
    assert.match(timingLines[0], /Headcount from a decision this week/);
    assert.ok(timingLines.some((line) => /Burn changes this month/.test(line)), "spending keeps its own clock");
  });

  it("names the reading each score is compared with, where the read carries one", () => {
    const dated = buildSlackBrief(
      fixtureBriefDocument({ previousScores: { tightness: 63, riskAppetite: 56, comparedWith: { recordDate: "2026-08-31", label: "Aug 31" } } }),
    );

    assert.doesNotMatch(dated, /vs last week/);
    // The two readings a paste prints for each score carry the same date.
    assert.match(dated, /was 63 on Aug 31/);
    assert.match(dated, /was 56 on Aug 31/);
  });

  it("leads what changed with what the week did to the decisions, and prints nothing where nothing was compared", () => {
    const previousScores = { tightness: 90, riskAppetite: 43, comparedWith: { recordDate: "2026-08-31", label: "Aug 31" } };
    const lines = buildSlackBrief(fixtureBriefDocument({ previousScores })).split("\n");
    const changed = lines.indexOf("What changed this week:");

    // Recovery from the Sep 25 reading: the sentence comes before the readings that are its evidence.
    assert.equal(
      lines[changed + 1],
      "Since Aug 31, conditions changed from Freezing to Sunny. The resume line is now met for every area, because funding pressure fell through 66 and risk appetite rose through 54.",
    );
    assert.match(lines[changed + 2] ?? "", /^Funding pressure 12 of 100 /);

    const uncompared = buildSlackBrief(fixtureBriefDocument());
    assert.doesNotMatch(uncompared, /pause or resume line|resume line is now met|pause now applies/);
  });

  it("keeps citation-ready source lines in exported briefs", () => {
    const brief = buildSlackBrief(fixtureBriefDocument());
    assert.match(brief, /Citations:/);
    assert.match(brief, /Treasury source: https:\/\/fred\.stlouisfed\.org \(2026-03-04\)/);
    assert.match(brief, /Chicago Fed National Financial Conditions Index: https:\/\/fred\.stlouisfed\.org\/series\/NFCI \(2026-02-27\)/);
  });

  it("names the conditions under the contract's own label", () => {
    const brief = buildSlackBrief(fixtureBriefDocument({ weeklyCall: { ...fixtureWeeklyCall(), regimeStage: "Sunny for 3 months" } }));

    assert.match(brief, /^Conditions: Sunny for 3 months \(money is cheap and available\)$/m);
  });
});

describe("buildBoardSlideBullets", () => {
  it("prints the same call lines and readings as the Slack brief", () => {
    const document = fixtureBriefDocument();
    const bullets = buildBoardSlideBullets(document);
    const brief = buildSlackBrief(document);

    for (const label of ["Guidance", "Do now", "Pause if", "Resume when", "Conditions change if"]) {
      assert.equal(slot(bullets, label), slot(brief, label), `${label} differs between the slide bullets and the Slack brief`);
    }
    assert.match(bullets, /^Funding pressure 12 of 100 /m);
  });
});

describe("buildCallCitation", () => {
  it("names the conditions under the call's label and the published confidence, for a reader rather than the engine", () => {
    const citation = buildCallCitation(fixtureBriefDocument({ weeklyCall: { ...fixtureWeeklyCall(), regimeStage: "Sunny — Late" } }));

    assert.match(citation, /^Conditions: Sunny — Late \(money is cheap and available\)$/m);
    assert.match(citation, /^High confidence \(how far the scores sit/m);
    assert.match(citation, /^Source note: https:\/\/fred\.stlouisfed\.org$/m);
    assert.match(citation, /^Full brief: https?:\/\//m);
    assert.doesNotMatch(citation, /EXPANSION|refresh cadence|Score-based/, "the citation is for a reader, not the engine");
  });
});
