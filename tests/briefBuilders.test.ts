import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildBoardBrief, buildCallCitation, buildSlackBrief } from "../lib/export/briefBuilders";
import { regimeSignalLabel } from "../lib/report/signalTranslations";

import { assessment, treasury, sensors, macros } from "./factories/exportFixtures";


describe("buildSlackBrief", () => {
  it("gives each bounded-decision slot content of its own shape", () => {
    // With no modeled payload — the /share page and the CLI artifact both call it
    // this way — the slots used to fall back to `assessment.constraints`, which is
    // a list of actions. That put an action in "Pause if" and "Re-open when", and
    // printed constraints[0] under both "Posture" and "Do now".
    const brief = buildSlackBrief(assessment, treasury, sensors, macros);
    const slot = (label: string) =>
      brief.match(new RegExp(`• ${label}: (.+)`))?.[1] ?? "";

    const posture = slot("Posture");
    const doNow = slot("Do now");
    const pauseIf = slot("Pause if");
    const reopenWhen = slot("Re-open when");

    for (const [label, value] of Object.entries({ posture, doNow, pauseIf, reopenWhen })) {
      assert.ok(value.length > 0, `${label} slot is empty`);
    }

    assert.notEqual(posture, doNow, "Posture and Do now print the same sentence");
    assert.ok(
      !assessment.constraints.includes(pauseIf),
      "Pause if is being filled from the operating-constraints list",
    );
    assert.ok(
      !assessment.constraints.includes(reopenWhen),
      "Re-open when is being filled from the operating-constraints list",
    );
  });

  it("states each reading against the corridor as numbers, not a paragraph", async () => {
    const { buildCanonicalBoundedDecisionRules } = await import("../lib/report/boundedDecisionRules");
    const { buildActionStripItems } = await import("../lib/report/operatingCalls");
    const scores = { tightness: assessment.scores.tightness, riskAppetite: assessment.scores.riskAppetite };
    const rules = buildCanonicalBoundedDecisionRules({ regime: "EXPANSION", thresholds: assessment.thresholds, scores });
    const brief = buildSlackBrief(assessment, treasury, sensors, macros, {
      modeledDecision: { actionStripItems: buildActionStripItems(rules, scores) },
    });

    assert.match(brief, /^Funding pressure: 12\/100 · pause > 76 \(64 pts away\) · re-open < 66 \(already met\)$/m);
    assert.match(brief, /^Risk appetite: 68\/100 · pause < 44 \(24 pts away\) · re-open > 54 \(already met\)$/m);
    // Per-area rows print lines with a distance, not the rule's sentence.
    assert.match(brief, /Pause if: Risk appetite < 44 \(24 pts away\) or/);
    // The qualifier is part of the rule and prints with the lines.
    assert.match(brief, /Re-open when: Funding pressure < 66 \(already met\) and budget payback proof is intact/);
    assert.doesNotMatch(brief, /Do now: Constraint one/, "Do now must not fall through to the operating-limits list");
  });

  it("resolves its change-course cross-reference to a label it actually prints", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros);
    const referenced = brief.match(/Change-course trigger: see "([^"]+)"/)?.[1];
    assert.ok(referenced, "no change-course cross-reference found");
    assert.ok(
      brief.includes(`• ${referenced}:`),
      `cross-reference points at "${referenced}", which the brief never prints`,
    );
  });

  it("names the rate signals the way the rest of the product does", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros);
    /* Read from the canonical table rather than a literal: the point of this
       test is that the brief and the site agree, and a literal here would let
       them disagree by only failing the rename in one direction. */
    assert.ok(brief.includes(`${regimeSignalLabel.baseRate}:`));
    assert.ok(brief.includes(regimeSignalLabel.curveSlope));
    assert.doesNotMatch(brief, /^Curve slope:/m);
    /* The engine has never read a Fed policy rate, so this name must not come
       back. */
    assert.doesNotMatch(brief, /Fed interest rate/);
  });

  it("formats index values without the literal unit suffix", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros);

    assert.match(brief, /Chicago Fed National Financial Conditions Index: -0\.52 · refreshed 2026-02-27/);
    assert.doesNotMatch(brief, /-0\.52index/);
  });

  /* This block used to be computed from a hardcoded company (13 months of runway, $700k burn,
     $500k revenue, growth-stage B2B SaaS) and printed with nothing marking it as a sample, so a
     Slack channel read "Raise window: month 3 to 9" as a statement about its own company. The
     runway planner on /operate prints the same block from figures the reader entered. */
  it("carries no runway figures, because the brief has no company to compute them for", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros);

    assert.doesNotMatch(brief, /Financial implications:/);
    assert.doesNotMatch(brief, /Runway risk:|Raise window:|Burn adjustment:|Safe runway band:/);
  });

  it("uses bounded decision triplets in stable action-trigger-reversal order", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros, {
      modeledDecision: {
        actionStripItems: [
          {
            lever: "hiring-stance",
            label: "Hiring stance",
            areaActionNow: "Limit net new hiring.",
            triggerThreshold: "Pause approvals when tightness > 70.",
            reversalCondition: "Resume when tightness < 64.",
          },
        ],
      },
    });

    assert.match(brief, /Bounded decision \(Posture \/ Do now \/ Pause if \/ Re-open when\):/);
    assert.match(brief, /• Posture: Capital is available and risk appetite is healthy\./);
    assert.match(brief, /• Do now: Limit net new hiring\./);
    assert.match(brief, /• Pause if: Pause approvals when tightness > 70\./);
    assert.match(brief, /• Re-open when: Resume when tightness < 64\./);
    assert.ok(brief.indexOf("• Posture: Capital is available") < brief.indexOf("• Do now: Limit net new hiring."));
    assert.ok(brief.indexOf("• Do now: Limit net new hiring.") < brief.indexOf("• Pause if: Pause approvals when tightness > 70."));
    assert.ok(brief.indexOf("• Pause if: Pause approvals when tightness > 70.") < brief.indexOf("• Re-open when: Resume when tightness < 64."));
    assert.match(brief, /Decision transmission check:/);
    assert.match(brief, /• Confidence: MEDIUM confidence/);
    assert.match(brief, /• Why this could be wrong:/);
    assert.match(brief, /• Change-course trigger:/);
  });

  it("carries each lever's timing line into the per-lever bullets", async () => {
    const { buildCanonicalBoundedDecisionRules } = await import("../lib/report/boundedDecisionRules");
    const { buildActionStripItems } = await import("../lib/report/operatingCalls");
    const scores = { tightness: assessment.scores.tightness, riskAppetite: assessment.scores.riskAppetite };
    const rules = buildCanonicalBoundedDecisionRules({ regime: "EXPANSION", thresholds: assessment.thresholds, scores });
    const brief = buildSlackBrief(assessment, treasury, sensors, macros, {
      modeledDecision: { actionStripItems: buildActionStripItems(rules, scores) },
    });

    // Canonical rows always carry latency, so the per-lever bullets (items after
    // the first) each state when the action is felt and what unwinding costs.
    // First per-lever row is investment-pace, whose canonical area is burn
    // discipline — the lever label and the latency clock are different nouns.
    const timingLines = brief.match(/^  Timing: .+$/gm) ?? [];
    assert.equal(timingLines.length, 2, `expected two Timing lines, got ${timingLines.length}`);
    assert.match(timingLines[0], /Burn changes this month/);
  });

  it("omits the Timing line when a hand-built item carries none", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros, {
      modeledDecision: {
        actionStripItems: [
          {
            lever: "hiring-stance",
            label: "Hiring stance",
            areaActionNow: "Limit net new hiring.",
            triggerThreshold: "Pause approvals when tightness > 70.",
            reversalCondition: "Resume when tightness < 64.",
          },
          {
            lever: "investment-pace",
            label: "Investment pace",
            areaActionNow: "Stage discretionary spend behind proof milestones.",
            triggerThreshold: "Stage spend behind milestones.",
            reversalCondition: "Resume after proof milestones clear.",
          },
          {
            lever: "product-priorities",
            label: "Product priorities",
            areaActionNow: "Protect core roadmap tempo.",
            triggerThreshold: "Pause long-payback bets on weak reads.",
            reversalCondition: "Resume when weekly direction stabilizes.",
          },
        ],
      },
    });

    assert.doesNotMatch(brief, /^  Timing: /m);
  });

  it("optionally appends interpretation layer content for handoff", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros, {
      interpretationLayer: {
        view: "financial",
        label: "Financial view",
        summary: "Runway translation for near-term operating cadence.",
        bullets: ["Action: Tighten non-core spend.", "Trigger: Reopen when risk appetite improves.", "Reverse: Restore burn only after two stable updates."],
      },
    });

    assert.match(brief, /Interpretation context: Financial view \(financial\)/);
    assert.match(brief, /Interpretation summary: Runway translation for near-term operating cadence\./);
    assert.match(brief, /Interpretation trust: translation layer only; canonical posture\/confidence\/thresholds unchanged\./);
    assert.match(brief, /• Action: Tighten non-core spend\./);
  });

  it("formats bps values with readable spacing", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros);

    assert.match(brief, /BBB credit spread \(OAS\): 174\.00 bps \(basis points\) · refreshed 2026-03-04/);
  });

  it("carries interpretation context into board and citation artifacts", () => {
    const interpretationLayer = {
      view: "forecast" as const,
      label: "Forecast view",
      summary: "Boundary pressure translation for planning windows.",
      bullets: [
        "Action: Operate for Defensive (31%) while posture holds.",
        "Trigger: 3 points to boundary; crossing risk High.",
        "Reverse: Momentum mixed across boundary signals.",
      ],
    };

    const board = buildBoardBrief(assessment, treasury, sensors, macros, { interpretationLayer });
    const citation = buildCallCitation(assessment, treasury, { interpretationLayer });

    assert.match(board, /Interpretation context: Forecast view \(forecast\)/);
    assert.match(board, /Interpretation summary: Boundary pressure translation for planning windows\./);
    assert.match(citation, /Interpretation context: Forecast view \(forecast\)/);
  });

  it("includes posture stage label in export surfaces when provided", () => {
    const stageLabel = "Expansion — Late (Fragile)";
    const brief = buildSlackBrief(assessment, treasury, sensors, macros, { postureWithStageLabel: stageLabel });
    const citation = buildCallCitation(assessment, treasury, { postureWithStageLabel: stageLabel });

    assert.match(brief, /Posture: Expansion — Late \(Fragile\)/);
    assert.match(citation, /Posture: Expansion — Late \(Fragile\) \(EXPANSION\)/);
  });

  it("adds compact weekly call artifact lines when operating stance context is provided", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros, {
      postureWithStageLabel: "Guarded Expansion — Late",
      operatingStanceLine: "Stage decisions. Avoid irreversible spend.",
      trendLabel: "Deteriorating",
      transitionWatch: "ON",
      regimeDistancePoints: 2,
      confidenceLabel: "MED",
      freshnessLabel: "Unavailable",
      actionStripItems: [
        {
          lever: "hiring-stance",
          label: "Hiring stance",
          areaActionNow: "Backfills only",
          triggerThreshold: "Pause net-new hiring if tightness > 76",
          reversalCondition: "Resume staged approvals when tightness < 66",
        },
      ],
    });

    assert.match(brief, /Startup environment — weekly call:/);
    assert.match(brief, /• Posture: Guarded Expansion — Late/);
    assert.match(brief, /• Trend: DETERIORATING/);
    assert.match(brief, /• Distance to regime change: 2\.0 points/);
    assert.match(brief, /• Regime shift watch: ON/);
    assert.match(brief, /• Posture: Stage decisions/);
    assert.match(brief, /• Re-check: whoever owns the plan/);
    assert.match(brief, /• Trust markers: Confidence: Guarded/);
    assert.match(brief, /• Posture:/);
    assert.match(brief, /Do now: Backfills only/);
    assert.match(brief, /Pause if: Pause net-new hiring if tightness > 76/);
    assert.match(brief, /Re-open when: Resume staged approvals when tightness < 66/);
  });

  it("keeps citation-ready source lines in exported briefs", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros);
    assert.match(brief, /Citations:/);
    assert.match(brief, /Treasury source: https:\/\/fred\.stlouisfed\.org \(2026-03-04\)/);
    assert.match(brief, /Chicago Fed National Financial Conditions Index: https:\/\/fred\.stlouisfed\.org\/series\/NFCI \(2026-02-27\)/);
  });




  it("includes at least one false-signal warning line when active", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros, {
      failureModes: [
        {
          warning: "Boundary whipsaw risk: call is near a flip threshold with unstable weekly motion.",
          mitigationCheck: "Require one confirming week before escalating fixed-cost commitments.",
        },
      ],
    });

    assert.match(brief, /False-signal warning:/);
    assert.match(brief, /Boundary whipsaw/);
    assert.match(brief, /Require one confirming/);
  });

  it("adds compact historical analog references when provided", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros, {
      historicalAnalogs: [
        { date: "2024-10-31", similarityScore: 0.91, implication: "Keep approvals reversible while trend remains mixed." },
      ],
    });

    assert.match(brief, /Historical analogs:/);
    assert.match(brief, /2024-10-31 · 91% match/);
  });
  it("omits interpretation context when default layer is selected", () => {
    const citation = buildCallCitation(assessment, treasury, {
      interpretationLayer: {
        view: "default",
        label: "Default view",
        summary: "Core weekly interpretation.",
        bullets: ["Action: Hold core posture."],
      },
    });

    assert.doesNotMatch(citation, /Interpretation context:/);
  });
});
