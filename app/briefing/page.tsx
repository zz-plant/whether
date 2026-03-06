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
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">This week</p>
        <p className="text-sm text-slate-100">Boldness budget: {model.notchShiftLabel}</p>
        <p className="text-sm text-slate-100">Hiring window: {model.hiringWindow}</p>
        <p className="text-sm text-slate-100">Expansion window: {model.expansionWindow}</p>
        <p className="text-sm text-slate-100">Raise window: {model.raiseWindow}</p>
        <p className="text-sm text-slate-100">Stability: Moderate (Week {model.stabilityWeeks})</p>
        <p className="text-sm text-slate-100">Overall change: {model.netDeltaLabel}</p>
      </section>

      <section className="weather-panel space-y-1 px-5 py-3">
        <p className="text-base font-semibold text-slate-100">
          This week, we can be {model.boldnessDelta >= 0 ? `+${model.boldnessDelta}` : model.boldnessDelta} points bolder.
        </p>
        <p className="text-xs text-slate-400">Starting posture: {assessment.regime}.</p>
      </section>

      <section className="weather-panel space-y-3 px-5 py-4">
        <p className="text-sm font-semibold text-slate-100">Boldness budget: {model.boldnessScore} / 100</p>
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
        <p className="text-sm font-semibold text-slate-100">Should we revisit last week&apos;s roadmap and hiring decisions?</p>
        <p className="text-sm text-slate-100">
          {model.revisitYes ? "Yes — the regime shifted." : "No — stay with the current posture."}
        </p>
        {model.revisitYes ? (
          <p className="text-xs text-slate-300">
            Why: boldness moved outside the hold range or the hiring window changed.
          </p>
        ) : null}
      </section>

      <section className="weather-panel space-y-2 px-5 py-4 text-sm text-slate-100">
        <p>If tightness rises by 20 points → hiring window closes → boldness budget drops by 12 points</p>
        <p>If the curve inverts below 0.00% → payback tolerance tightens to ≤ 9 months</p>
      </section>

      <section className="weather-panel space-y-2 px-5 py-4 text-sm text-slate-100">
        <p>Expansion window: {model.expansionWindow}</p>
        <p>Trend: {model.expansionTrend}</p>
      </section>

      <section className="weather-panel space-y-2 px-5 py-4 text-sm text-slate-100">
        <p>Last 4 weeks: boldness {last4Boldness.join(" → ")}</p>
        <p>Hiring window trend: {model.hiringTrend}</p>
      </section>

      <section className="weather-panel px-5 py-3 text-xs text-slate-200">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <p>Data freshness: {treasuryProvenance.ageLabel.replace(".", "")}</p>
          <p>Confidence: {model.confidenceLabel}</p>
          <p>All inputs present: {model.inputsComplete ? "Yes" : "No"}</p>
        </div>
      </section>

      <section className="weather-panel space-y-2 border border-slate-700/70 bg-slate-950/80 px-5 py-4 text-sm text-slate-100">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Shareable Slack card
        </p>
        <p>Macro: {model.macroLabel}</p>
        <p>Boldness: {model.boldnessScore} ({model.boldnessDelta >= 0 ? `+${model.boldnessDelta}` : model.boldnessDelta})</p>
        <p>Hiring: {model.hiringWindow}</p>
        <p>Expansion: {model.expansionWindow}</p>
        <p>Stability: Week {model.stabilityWeeks} (8-week average)</p>
        <p>Net: {model.boldnessDelta >= 0 ? "Slightly more aggressive this week." : "Slightly more defensive this week."}</p>
        <p className="pt-1 text-xs text-slate-400">Updated {recordDateLabel}</p>
      </section>
    </main>
  );
}
