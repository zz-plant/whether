import { buildHomeBriefModel } from "../lib/report/homeBriefModel";

const model = buildHomeBriefModel({
  fetchedAtLabel: "Updated 2h ago",
  assessment: {
    regime: "DEFENSIVE",
    thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
    scores: { tightness: 74, riskAppetite: 46, baseRate: 5.1, curveSlope: -0.3 },
  },
  regimeAlert: { previousRegime: "VOLATILE" },
  stopItems: ["Do not approve net-new headcount without revenue coverage."],
  reportDynamics: {
    directionLabel: "deteriorating",
    changedSignals: [
      { key: "tightness", delta: 2.4 },
      { key: "riskAppetite", delta: -1.8 },
    ],
    anomalySignals: [],
  },
});

console.log("— netConstraintSummary —\n" + model.netConstraintSummary);
console.log("\n— signalConfidenceReason —\n" + model.signalConfidenceReason);
console.log("\n— decisionShiftSummary —\n" + model.decisionShiftSummary);
console.log("\n— reversalTrigger —\n" + model.reversalTrigger);
console.log("\n— weeklyMemoLines —\n" + model.weeklyMemoLines.join("\n"));
console.log("\n— primaryRisk —\n" + model.regimeHeader.primaryRisk);
console.log("\n— whyThisCall —\n" + model.whyThisCall.map((i) => `${i.label}: ${i.detail}`).join("\n"));
console.log("\n— revisitQueue reasons —\n" + model.revisitQueue.map((i) => i.reason).join("\n"));
console.log("\n— sinceLastReview —\n" + model.sinceLastReview.items.map((i) => `${i.label}: ${i.detail}`).join("\n"));
console.log("\n— macroOverlay (sector) —\n" + model.macroOverlay[4].detail);
console.log("\n— shorthandLine —\n" + model.weeklyLeadershipSummary.shorthandLine);
