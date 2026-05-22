import { WeeklyDecisionCard } from "../app/components/weeklyDecisionCard";
import type { ReportDynamics } from "../lib/report/reportData";
import type { BoundedDecisionRule } from "../lib/report/boundedDecisionRules";
import { buildWeeklyDecisionCardModel } from "../tests/factories/weeklyDecisionCardModel";
import { renderToStaticMarkup } from "react-dom/server";
import * as fs from "fs";
import * as path from "path";

const reportDynamics: ReportDynamics = {
  directionLabel: "deteriorating",
  totalSignalChanges: 2,
  regimeChanged: false,
  changedSignals: [
    { key: "tightness", label: "Cash tightness", delta: 3 },
    { key: "riskAppetite", label: "Risk appetite", delta: -2 },
  ],
  anomalySignals: [],
};

const decisionRules: BoundedDecisionRule[] = [
  {
    area: "hiring",
    recommendation: "Keep backfills only.",
    doNow: ["Keep backfills only."],
    avoidNow: ["Avoid speculative hiring."],
    scope: "New headcount requires CFO review.",
    pauseTrigger: "Pause when tightness rises above 74.",
    resumeTrigger: "Resume when tightness falls below 65.",
    flipConditions: [{ metric: "tightness", operator: "<", value: 65, label: "Tightness < 65" }],
    rationale: "Preserve fixed-cost discipline under pressure.",
  },
];

const model = buildWeeklyDecisionCardModel({
  decision: {
    reportDynamics,
    decisionRules,
  },
  diagnostics: {
    regimeVelocity: {
      status: "ok",
      from: "Expansion",
      to: "Mixed",
      sampleSize: 4,
      lowerBoundMonths: 3,
      upperBoundMonths: 6,
      typicalRangeLabel: "3–6 months",
      displayLabel: "Expansion→Mixed typically 3–6 months",
    },
  },
});

const html = renderToStaticMarkup(
  <WeeklyDecisionCard
    model={model}
  />
);

fs.writeFileSync(path.join(__dirname, "output.html"), html);
console.log("Wrote to output.html");
