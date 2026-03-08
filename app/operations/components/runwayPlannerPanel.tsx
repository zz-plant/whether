"use client";

import { useMemo, useState } from "react";
import { ClipboardActionRow } from "../../components/clipboardActionRow";
import { getClipboardUiState, useClipboardCopy } from "../../components/useClipboardCopy";
import {
  buildRunwayPlan,
  formatRunwayPlanCompactBlock,
  type PlannerPosture,
  type PlannerSector,
  type PlannerStage,
} from "../../../lib/report/runwayPlanner";
import type { RegimeAssessment } from "../../../lib/regimeEngine";

const stageOptions: PlannerStage[] = ["seed", "series-a", "growth", "public"];
const sectorOptions: PlannerSector[] = ["b2b-saas", "consumer", "infrastructure"];

const postureForPolicyPosture = (posture: RegimeAssessment["policyAssessment"]["posture"]): PlannerPosture => {
  if (posture === "RISK_ON") return "RISK_ON";
  if (posture === "TRANSITION") return "TRANSITION";
  return "SAFETY_MODE";
};

export function RunwayPlannerPanel({ assessment }: { assessment: RegimeAssessment }) {
  const [runway, setRunway] = useState(12);
  const [burn, setBurn] = useState(700000);
  const [revenue, setRevenue] = useState(450000);
  const [growthRate, setGrowthRate] = useState(12);
  const [sector, setSector] = useState<PlannerSector>("b2b-saas");
  const [stage, setStage] = useState<PlannerStage>("growth");

  const output = useMemo(
    () =>
      buildRunwayPlan({
        runway,
        burn,
        revenue,
        growthRate,
        sector,
        stage,
        regime: assessment.regime,
        posture: postureForPolicyPosture(assessment.policyAssessment.posture),
      }),
    [assessment.policyAssessment.posture, assessment.regime, burn, growthRate, revenue, runway, sector, stage],
  );

  const shareBlock = useMemo(() => formatRunwayPlanCompactBlock(output), [output]);
  const { status, error, activeTarget, copiedTarget, copyToClipboard } = useClipboardCopy();
  const clipboardState = getClipboardUiState("runway-plan", { status, error, activeTarget, copiedTarget });

  return (
    <section className="weather-panel-static mt-6 space-y-4 p-6" aria-label="Runway planner">
      <div>
        <p className="type-label text-slate-400">Financial implications</p>
        <h3 className="text-lg font-semibold text-slate-100">Runway planner</h3>
        <p className="mt-2 text-sm text-slate-300">
          Model runway decisions against current posture so burn, raise timing, and reversal triggers stay aligned.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="weather-surface p-3 text-sm text-slate-200">
          Runway (months)
          <input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2" type="number" min={1} value={runway} onChange={(event) => setRunway(Number(event.target.value))} />
        </label>
        <label className="weather-surface p-3 text-sm text-slate-200">
          Monthly burn ($)
          <input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2" type="number" min={0} step={50000} value={burn} onChange={(event) => setBurn(Number(event.target.value))} />
        </label>
        <label className="weather-surface p-3 text-sm text-slate-200">
          Monthly revenue ($)
          <input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2" type="number" min={0} step={50000} value={revenue} onChange={(event) => setRevenue(Number(event.target.value))} />
        </label>
        <label className="weather-surface p-3 text-sm text-slate-200">
          Monthly growth rate (%)
          <input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2" type="number" value={growthRate} onChange={(event) => setGrowthRate(Number(event.target.value))} />
        </label>
        <label className="weather-surface p-3 text-sm text-slate-200">
          Sector
          <select className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2" value={sector} onChange={(event) => setSector(event.target.value as PlannerSector)}>
            {sectorOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="weather-surface p-3 text-sm text-slate-200">
          Stage
          <select className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2" value={stage} onChange={(event) => setStage(event.target.value as PlannerStage)}>
            {stageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <article className="weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Runway risk</p>
          <p className="mt-2 text-sm text-slate-100">{output.runwayRisk.summary}</p>
        </article>
        <article className="weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Safe runway band</p>
          <p className="mt-2 text-sm text-slate-100">{output.safeRunwayBand.summary}</p>
        </article>
        <article className="weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Raise timing window</p>
          <p className="mt-2 text-sm text-slate-100">{output.raiseTimingWindow.summary}</p>
        </article>
        <article className="weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Burn adjustment range</p>
          <p className="mt-2 text-sm text-slate-100">{output.burnAdjustmentRange.summary}</p>
        </article>
      </div>

      <div className="weather-surface p-4">
        <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Bounded guardrails</p>
        <ul className="mt-3 space-y-2 text-sm text-slate-200">
          <li>• {output.boundedRules.capitalRaising}</li>
          <li>• {output.boundedRules.burnDiscipline}</li>
        </ul>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400">Copy this compact block into Slack or your weekly finance sync.</p>
        <ClipboardActionRow
          label="Copy financial block"
          state={clipboardState}
          onClick={() => {
            void copyToClipboard(shareBlock, "runway-plan");
          }}
          buttonProps={{
            "data-premium-intent": "runway_planner",
            "data-premium-cta": "copy_financial_block",
          }}
          compact
        />
      </div>
    </section>
  );
}
