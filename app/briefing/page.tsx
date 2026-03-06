import type { Metadata } from "next";
import { evaluateRegime } from "../../lib/regimeEngine";
import { loadReportDataSafe } from "../../lib/report/reportData";
import { buildBoldnessScore, buildWeeklyLeadershipBriefModel } from "../../lib/report/weeklyLeadershipBrief";
import { getPreviousTimeMachineSnapshot } from "../../lib/timeMachine/timeMachineCache";

export const metadata: Metadata = {
  title: "One-screen weekly leadership brief — Whether",
  description:
    "Decision-complete weekly leadership brief with posture, boldness budget, revisit trigger, and bounded downside guardrails.",
};

export default async function BriefingPage() {
  const reportResult = await loadReportDataSafe(undefined, { route: "/briefing" });
  const { assessment, recordDateLabel, treasury, treasuryProvenance, regimeSeries } =
    reportResult.ok ? reportResult.data : reportResult.fallback;
  const previousSnapshot = getPreviousTimeMachineSnapshot(treasury.record_date);
  const previousAssessment = previousSnapshot ? evaluateRegime(previousSnapshot) : null;

  const latestRegimeSeries = regimeSeries.slice(-8);
  let stabilityWeeks = 0;
  for (let index = latestRegimeSeries.length - 1; index >= 0; index -= 1) {
    if (latestRegimeSeries[index]?.regime === assessment.regime) {
      stabilityWeeks += 1;
      continue;
    }
    break;
  }

  const snapshots: Array<typeof treasury> = [treasury];
  while (snapshots.length < 4) {
    const previous = getPreviousTimeMachineSnapshot(snapshots[0].record_date);
    if (!previous) {
      break;
    }
    snapshots.unshift(previous);
  }

  const assessedSnapshots = snapshots.map((snapshot) => evaluateRegime(snapshot));
  const last4Boldness = assessedSnapshots.map((snapshotAssessment) =>
    buildBoldnessScore(
      snapshotAssessment.scores.tightness,
      snapshotAssessment.scores.riskAppetite,
    ),
  );
  const hiringTrendDelta = assessedSnapshots.reduce((accumulator, snapshotAssessment, index) => {
    if (index === 0) {
      return accumulator;
    }

    return accumulator +
      (assessedSnapshots[index - 1].scores.tightness - snapshotAssessment.scores.tightness);
  }, 0);

  const model = buildWeeklyLeadershipBriefModel({
    assessment,
    previousAssessment,
    treasury,
    last4Boldness,
    hiringTrendDelta,
    stabilityWeeks,
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-6 sm:px-6 sm:py-8">
      <section className="weather-panel space-y-2 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">THIS WEEK</p>
        <p className="text-sm text-slate-100">Boldness budget: {model.notchShiftLabel}</p>
        <p className="text-sm text-slate-100">Hiring window: {model.hiringWindow}</p>
        <p className="text-sm text-slate-100">Expansion window: {model.expansionWindow}</p>
        <p className="text-sm text-slate-100">Raise window: {model.raiseWindow}</p>
        <p className="text-sm text-slate-100">Stability: Moderate (Week {model.stabilityWeeks})</p>
        <p className="text-sm text-slate-100">Net delta: {model.netDeltaLabel}</p>
      </section>

      <section className="weather-panel space-y-1 px-5 py-3">
        <p className="text-base font-semibold text-slate-100">
          We&apos;re {model.boldnessDelta >= 0 ? `+${model.boldnessDelta}` : model.boldnessDelta} bold this week.
        </p>
        <p className="text-xs text-slate-400">Baseline posture: {assessment.regime}.</p>
      </section>

      <section className="weather-panel space-y-3 px-5 py-4">
        <p className="text-sm font-semibold text-slate-100">Boldness Budget: {model.boldnessScore} / 100</p>
        <p className="text-sm text-slate-200">Change: {model.boldnessDelta >= 0 ? `+${model.boldnessDelta}` : model.boldnessDelta}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="weather-pill">Risk appetite {model.riskDelta >= 0 ? `+${model.riskDelta}` : model.riskDelta}</span>
          <span className="weather-pill">
            Tightness {model.tightnessDelta === 0 ? "unchanged" : model.tightnessDelta > 0 ? `+${model.tightnessDelta}` : model.tightnessDelta}
          </span>
          <span className="weather-pill">
            Curve {Math.abs(model.curveDelta) < 0.05 ? "stable" : model.curveDelta > 0 ? "steeper" : "flatter"}
          </span>
        </div>
      </section>

      <section className="weather-panel space-y-2 px-5 py-4">
        <p className="text-sm font-semibold text-slate-100">Revisit last week&apos;s roadmap/hiring decisions?</p>
        <p className="text-sm text-slate-100">
          {model.revisitYes ? "YES — Regime shift detected." : "NO — Hold posture."}
        </p>
        {model.revisitYes ? (
          <p className="text-xs text-slate-300">
            Cause: boldness moved outside the hold band or hiring window changed.
          </p>
        ) : null}
      </section>

      <section className="weather-panel space-y-2 px-5 py-4 text-sm text-slate-100">
        <p>If tightness rises 20 points → Hiring window closes → Boldness budget drops 12 points</p>
        <p>If curve inverts below 0.00% → Payback tolerance tightens to ≤ 9 months</p>
      </section>

      <section className="weather-panel space-y-2 px-5 py-4 text-sm text-slate-100">
        <p>Expansion window: {model.expansionWindow}</p>
        <p>Trend: {model.expansionTrend}</p>
      </section>

      <section className="weather-panel space-y-2 px-5 py-4 text-sm text-slate-100">
        <p>Last 4 weeks: Boldness {last4Boldness.join(" → ")}</p>
        <p>Hiring window trend: {model.hiringTrend}</p>
      </section>

      <section className="weather-panel px-5 py-3 text-xs text-slate-200">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <p>Data freshness: {treasuryProvenance.ageLabel.replace(".", "")}</p>
          <p>Confidence: {model.confidenceLabel}</p>
          <p>Inputs complete: {model.inputsComplete ? "Yes" : "No"}</p>
        </div>
      </section>

      <section className="weather-panel space-y-2 border border-slate-700/70 bg-slate-950/80 px-5 py-4 text-sm text-slate-100">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Slack screenshot card
        </p>
        <p>Macro: {model.macroLabel}</p>
        <p>Boldness: {model.boldnessScore} ({model.boldnessDelta >= 0 ? `+${model.boldnessDelta}` : model.boldnessDelta})</p>
        <p>Hiring: {model.hiringWindow}</p>
        <p>Expansion: {model.expansionWindow}</p>
        <p>Stability: Week {model.stabilityWeeks} / Avg 8</p>
        <p>Net: {model.boldnessDelta >= 0 ? "Slightly more aggressive." : "Slightly more defensive."}</p>
        <p className="pt-1 text-xs text-slate-400">As of {recordDateLabel}</p>
      </section>
    </main>
  );
}
