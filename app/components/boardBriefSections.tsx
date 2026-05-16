import type { RegimeAssessment } from "../../lib/regimeEngine";
import type { TreasuryData } from "../../lib/types";
import { getWeeklyActionGuidance } from "../../lib/summary/weeklySummary";
import { formatTimestampUTC } from "../../lib/formatters";
import { DataProvenanceStrip, type DataProvenance } from "./dataProvenanceStrip";
import { ArrowRightIcon } from "./uiIcons";
import { buildWeeklyLockCommitment } from "../../lib/report/decisionKnobs";
import { ConfidenceTooltipBadge } from "./board-brief/ConfidenceTooltipBadge";
import { postureBlocksByRegime } from "./board-brief/postureBlocks";
import {
  clampToRange,
  formatNumber,
  getRegimeBadge,
  getRegimeLabel,
  mapToPercent,
} from "./reportSectionUtils";

export const WeeklyActionSummaryPanel = ({
  assessment,
  provenance,
  recordDateLabel,
}: {
  assessment: RegimeAssessment;
  provenance: DataProvenance;
  recordDateLabel: string;
}) => {
  const regimeLabel = getRegimeLabel(assessment.regime);
  const actionGuidance = getWeeklyActionGuidance(assessment.regime);
  const guardrail = `Pause net-new commitments if tightness > ${assessment.thresholds.tightnessRegime + 6} or risk appetite < ${Math.max(assessment.thresholds.riskAppetiteRegime - 6, 0)}.`;
  const flipCondition = `Loosen pace when tightness < ${Math.max(assessment.thresholds.tightnessRegime - 4, 0)} and risk appetite > ${Math.min(assessment.thresholds.riskAppetiteRegime + 4, 100)}.`;

  return (
    <section
      id="weekly-action-summary"
      aria-labelledby="weekly-action-summary-title"
      className="mt-8"
    >
      <div className="weather-panel space-y-5 px-5 py-5">
        <p className="type-label text-slate-400">Weekly plan</p>
        <h2 id="weekly-action-summary-title" className="type-section text-slate-100">
          {regimeLabel} execution plan
        </h2>

        <div className="grid gap-2 md:grid-cols-3">
          <article className="weather-surface rounded-lg border border-violet-500/45 bg-violet-500/10 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-violet-100">Action now</p>
            <p className="mt-1 text-sm text-slate-100">{actionGuidance}</p>
          </article>
          <article className="weather-surface rounded-lg border border-amber-500/45 bg-amber-500/10 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-100">Pause if</p>
            <p className="mt-1 text-sm text-slate-100">{guardrail}</p>
          </article>
          <article className="weather-surface rounded-lg border border-sky-500/45 bg-sky-500/10 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-100">Change course if</p>
            <p className="mt-1 text-sm text-slate-100">{flipCondition}</p>
          </article>
        </div>

        <article className="weather-surface p-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
            Weekly plan by lane
          </h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {postureBlocksByRegime[assessment.regime].map((block, index) => {
              const [actionCue, watchCue] = block.bullets;

              return (
                <section key={block.title} className="rounded-md border border-slate-700/70 bg-slate-950/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-100">{block.title}</h4>
                    <span className="rounded-full border border-slate-600/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-300">{index + 1}</span>
                  </div>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-200">Action</p>
                  <p className="mt-1 text-sm text-slate-200">{actionCue}</p>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-200">Watch</p>
                  <p className="mt-1 text-xs text-slate-300">{watchCue}</p>
                </section>
              );
            })}
          </div>
        </article>

        <DataProvenanceStrip
          provenance={provenance}
          label={`Weekly plan derived from ${regimeLabel} regime on ${recordDateLabel}`}
          variant="compact"
        />
      </div>
    </section>
  );
};

export const ExecutiveSnapshotPanel = ({
  treasury,
  assessment,
  provenance,
  sectionId = "executive-snapshot",
}: {
  treasury: TreasuryData;
  assessment: RegimeAssessment;
  provenance: DataProvenance;
  sectionId?: string;
}) => {
  const curveSlope = assessment.scores.curveSlope;
  const regimeLabel = getRegimeLabel(assessment.regime);
  const regimeBadge = getRegimeBadge(assessment.regime);
  const curveLabel = curveSlope === null ? "—" : curveSlope < 0 ? "Inverted" : "Normal";

  const curveSlopePercent = curveSlope === null ? 50 : mapToPercent(curveSlope, -2, 2);
  const curveIndicator = clampToRange(curveSlopePercent, 0, 100);
  const curveIndicatorColor =
    curveSlope === null ? "#94a3b8" : curveSlope < 0 ? "#fb7185" : "#38bdf8";
  const curveMarkerId = `${sectionId}-curve-marker`.replace(/[^a-zA-Z0-9_-]/g, "");

  const isFallback = Boolean(treasury.fallback_at || treasury.fallback_reason);
  const hasDataWarnings = assessment.dataWarnings.length > 0;
  const confidenceDegraded = isFallback || hasDataWarnings;
  const freshnessDegraded = provenance.statusLabel !== "Live (high confidence)";
  const confidenceLabel = confidenceDegraded ? "Guarded" : "High";
  const confidenceTone =
    confidenceDegraded
      ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
      : "border-emerald-400/40 bg-emerald-500/10 text-emerald-100";

  const weeklyLockCommitment = buildWeeklyLockCommitment({
    regime: assessment.regime,
    tightnessRegime: assessment.thresholds.tightnessRegime,
    riskAppetiteRegime: assessment.thresholds.riskAppetiteRegime,
    confidenceDegraded,
    freshnessDegraded,
  });

  const constraintHighlights = assessment.constraints.slice(0, 3);

  return (
    <section id={sectionId} aria-labelledby="executive-snapshot-title" className="mt-8">
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="type-label text-slate-400">Decision commitment</p>
            <h3 id="executive-snapshot-title" className="type-section text-slate-100">
              Lock this week&apos;s operating posture
            </h3>
            <p className="mt-2 text-sm text-slate-300">Lock the current call, track measurable flip conditions, and assign a re-check owner cadence.</p>
          </div>
          <DataProvenanceStrip provenance={provenance} />
        </div>

        <div className="mt-5 weather-bento-grid">
          <div className="weather-tile col-span-1 bg-gradient-to-br from-slate-950 via-slate-900/70 to-slate-950 p-5 sm:col-span-2 lg:col-span-2 lg:row-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex min-h-[32px] items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.12em] ${
                    regimeBadge?.classes ?? "border-slate-600/60 bg-slate-500/10 text-slate-100"
                  }`}
                >
                  {regimeBadge?.label ?? assessment.regime}
                </span>
                <span className="text-sm text-slate-200">{regimeLabel}</span>
              </div>

              <ConfidenceTooltipBadge
                confidenceLabel={confidenceLabel}
                confidenceTone={confidenceTone}
              />
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <article className="rounded-md border border-violet-500/45 bg-violet-500/10 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-violet-100">Current call</p>
                <p className="mt-1 text-xs font-semibold text-slate-100">{weeklyLockCommitment.currentCall}</p>
              </article>
              <article className="rounded-md border border-sky-500/45 bg-sky-500/10 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-100">Change-course signals</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-slate-100">
                  {weeklyLockCommitment.flipConditions.map((condition) => (
                    <li key={condition}>{condition}</li>
                  ))}
                </ul>
              </article>
              <article className="rounded-md border border-amber-500/45 bg-amber-500/10 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-100">Owner cadence</p>
                <p className="mt-1 text-xs text-slate-100">{weeklyLockCommitment.ownerCadence}</p>
              </article>
            </div>
            {weeklyLockCommitment.trustMarkers.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                {weeklyLockCommitment.trustMarkers.map((marker) => (
                  <span key={marker} className="rounded-full border border-amber-400/45 bg-amber-500/10 px-2 py-0.5 font-semibold uppercase tracking-[0.1em] text-amber-100">
                    {marker}
                  </span>
                ))}
              </div>
            ) : null}
            <ul className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
              {constraintHighlights.slice(0, 2).map((constraint) => (
                <li key={constraint} className="rounded-md border border-slate-700/70 bg-slate-950/55 px-2.5 py-2">{constraint}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">{assessment.description}</p>
          </div>

          <div className="weather-tile p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Yield curve</p>
            <div className="mt-3 space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">US 10Y</span>
                <span className="mono text-slate-100">{formatNumber(treasury.yields.tenYear, "%")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">US 2Y</span>
                <span className="mono text-slate-100">{formatNumber(treasury.yields.twoYear, "%")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Curve slope</span>
                <span className="mono text-slate-100">
                  {curveSlope === null ? "—" : formatNumber(curveSlope, "%")}
                </span>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Curve slope = 10Y minus 2Y. Negative values can signal inversion risk.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Higher 10Y levels usually imply more expensive long-term borrowing, which can pressure fixed-cost expansion plans.
            </p>
            <div className="mt-3">
              <svg
                viewBox="0 0 100 12"
                className="h-3 w-full"
                aria-hidden="true"
                focusable="false"
                preserveAspectRatio="none"
              >
                <defs>
                  <marker
                    id={curveMarkerId}
                    markerWidth="6"
                    markerHeight="6"
                    refX="5"
                    refY="3"
                    markerUnits="strokeWidth"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 6 3 L 0 6 Z" fill={curveIndicatorColor} />
                  </marker>
                </defs>
                <line
                  x1="6"
                  y1="6"
                  x2="94"
                  y2="6"
                  stroke="#1e293b"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1="50"
                  y1="1"
                  x2="50"
                  y2="11"
                  stroke="#475569"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1="50"
                  y1="6"
                  x2={curveIndicator}
                  y2="6"
                  stroke={curveIndicatorColor}
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  markerEnd={`url(#${curveMarkerId})`}
                />
              </svg>
              <p className="mt-2 text-xs text-slate-500">Curve status: {curveLabel}</p>
            </div>
          </div>

          <div className="weather-tile p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Data freshness</p>
            <p className="mono mt-2 text-sm text-slate-100">
              <time dateTime={treasury.record_date}>{treasury.record_date}</time>
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Fetched{" "}
              <time dateTime={treasury.fetched_at}>{formatTimestampUTC(treasury.fetched_at)}</time>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
