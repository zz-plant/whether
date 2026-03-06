"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import type { RegimeAssessment } from "../../lib/regimeEngine";
import type { TreasuryData } from "../../lib/types";
import { getWeeklyActionGuidance } from "../../lib/summary/weeklySummary";
import { formatTimestampUTC } from "../../lib/formatters";
import { DataProvenanceStrip, type DataProvenance } from "./dataProvenanceStrip";
import {
  clampToRange,
  formatNumber,
  getRegimeBadge,
  getRegimeLabel,
  mapToPercent,
} from "./reportSectionUtils";

export const HistoricalBanner = ({
  banner,
  liveHref,
  previousHref,
  timeMachineHref,
}: {
  banner: string;
  liveHref?: string;
  previousHref?: string;
  timeMachineHref?: string;
}) => {
  const backwardHref = previousHref ?? timeMachineHref;

  return (
    <div className="mt-6 rounded-2xl border border-slate-600 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="type-label text-slate-400">Viewing past data</span>
        <div className="flex flex-wrap gap-2">
          {backwardHref ? (
            <a
              href={backwardHref}
              className="inline-flex min-h-[44px] items-center rounded-full border border-cyan-400/60 bg-cyan-500/10 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-cyan-100 transition hover:border-cyan-300 hover:text-cyan-50"
            >
              ← View older snapshot
            </a>
          ) : null}
          {timeMachineHref ? (
            <a
              href={timeMachineHref}
              className="inline-flex min-h-[44px] items-center rounded-full border border-slate-500/70 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-slate-100 transition hover:border-slate-300/80 hover:text-white"
            >
              Choose another date
            </a>
          ) : null}
          {liveHref ? (
            <a
              href={liveHref}
              className="inline-flex min-h-[44px] items-center rounded-full border border-slate-500/70 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-slate-100 transition hover:border-slate-300/80 hover:text-white"
            >
              Back to current week
            </a>
          ) : null}
        </div>
      </div>
      <p className="mt-1 font-semibold text-slate-100">{banner}</p>
      <p className="mt-2 text-xs text-slate-400">
        You are viewing archived Treasury data, so live signals are hidden for now.
        {previousHref
          ? " Use “View older snapshot” to step to an earlier week."
          : " Use “View older snapshot” to open Time Machine and pick an earlier week."}
      </p>
    </div>
  );
};

const postureBlocksByRegime: Record<RegimeAssessment["regime"], Array<{ title: string; bullets: string[] }>> = {
  SCARCITY: [
    { title: "Hiring posture", bullets: ["Restrict hiring to revenue-supporting or reliability-critical roles.", "Delay speculative team expansion until signals improve."] },
    { title: "Roadmap posture", bullets: ["Prioritize reliability, retention, and near-term payback work.", "Defer long-cycle bets unless they are reversible."] },
    { title: "Capital posture", bullets: ["Maintain burn discipline and tighten approval gates.", "Require short payback windows for incremental spend."] },
  ],
  DEFENSIVE: [
    { title: "Hiring posture", bullets: ["Backfill only essential execution gaps.", "Gate net-new hires behind explicit ROI proof."] },
    { title: "Roadmap posture", bullets: ["Protect core delivery and customer commitments.", "Stage expansionary initiatives behind milestones."] },
    { title: "Capital posture", bullets: ["Preserve cash durability with measured spend.", "Keep optionality for downside scenarios."] },
  ],
  VOLATILE: [
    { title: "Hiring posture", bullets: ["Keep hiring selective and reversible.", "Use short planning cycles before adding fixed costs."] },
    { title: "Roadmap posture", bullets: ["Prioritize adaptable work that can be re-sequenced quickly.", "Avoid irreversible scope commitments."] },
    { title: "Capital posture", bullets: ["Sequence spend in tranches tied to checkpoints.", "Protect downside while preserving upside options."] },
  ],
  EXPANSION: [
    { title: "Hiring posture", bullets: ["Expand in proven demand areas first.", "Maintain quality bar and ramp discipline."] },
    { title: "Roadmap posture", bullets: ["Advance growth initiatives with milestone gates.", "Preserve reliability and margin guardrails."] },
    { title: "Capital posture", bullets: ["Deploy capital selectively with clear payback targets.", "Monitor burn as growth spend increases."] },
  ],
};

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
  const constraints = [
    `Cash availability: ${assessment.scores.tightness}/100`,
    `Risk appetite: ${assessment.scores.riskAppetite}/100`,
    `Execution mandate: Keep bets short-cycle and reversible.`,
  ];

  return (
    <section
      id="weekly-action-summary"
      aria-labelledby="weekly-action-summary-title"
      className="mt-8"
    >
      <div className="weather-panel space-y-5 px-5 py-5">
        <p className="type-label text-slate-400">Weekly plan</p>
        <h2 id="weekly-action-summary-title" className="type-section text-slate-100">
          {regimeLabel} plan for this week
        </h2>
        <p className="text-sm text-slate-200">{actionGuidance}</p>

        <article className="weather-surface p-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
            What’s limiting us this week
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            {constraints.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </article>

        <article className="weather-surface p-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
            How to operate this week
          </h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {postureBlocksByRegime[assessment.regime].map((block) => (
              <section key={block.title} className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-3">
                <h4 className="text-sm font-semibold text-slate-100">{block.title}</h4>
                <ul className="mt-2 space-y-1 text-sm text-slate-300">
                  {block.bullets.map((bullet) => (
                    <li key={bullet}>• {bullet}</li>
                  ))}
                </ul>
              </section>
            ))}
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
}: {
  treasury: TreasuryData;
  assessment: RegimeAssessment;
  provenance: DataProvenance;
}) => {
  const curveSlope = assessment.scores.curveSlope;
  const regimeLabel = getRegimeLabel(assessment.regime);
  const regimeBadge = getRegimeBadge(assessment.regime);
  const curveLabel = curveSlope === null ? "—" : curveSlope < 0 ? "Inverted" : "Normal";

  const curveSlopePercent = curveSlope === null ? 50 : mapToPercent(curveSlope, -2, 2);
  const curveIndicator = clampToRange(curveSlopePercent, 0, 100);
  const curveIndicatorColor =
    curveSlope === null ? "#94a3b8" : curveSlope < 0 ? "#fb7185" : "#38bdf8";
  const curveMarkerId = "curve-marker";

  const isFallback = Boolean(treasury.fallback_at || treasury.fallback_reason);
  const hasDataWarnings = assessment.dataWarnings.length > 0;
  const confidenceLabel = isFallback || hasDataWarnings ? "Guarded" : "High";
  const confidenceTone =
    isFallback || hasDataWarnings
      ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
      : "border-emerald-400/40 bg-emerald-500/10 text-emerald-100";

  const confidenceDetail = isFallback
    ? "Live Treasury feed is degraded; this snapshot is running on cached inputs."
    : hasDataWarnings
      ? "Some Treasury inputs are missing; verify gaps before increasing commitment size."
      : "Full Treasury coverage is healthy for this report window.";

  const constraintHighlights = assessment.constraints.slice(0, 3);

  return (
    <section id="executive-snapshot" aria-labelledby="executive-snapshot-title" className="mt-8">
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="type-label text-slate-400">Executive snapshot</p>
            <h3 id="executive-snapshot-title" className="type-section text-slate-100">
              Rules of engagement this week
            </h3>
            <p className="mt-2 text-sm text-slate-300">A quick decision view for this planning cycle.</p>
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

              <Tooltip.Root>
                <Tooltip.Trigger
                  type="button"
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.12em] ${confidenceTone}`}
                  aria-label={`${confidenceLabel} confidence`}
                >
                  <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
                  {confidenceLabel} confidence
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Positioner side="bottom" sideOffset={8} className="z-30">
                    <Tooltip.Popup className="weather-panel w-72 space-y-2 border border-slate-800/80 bg-slate-950/95 px-3 py-3 text-left text-xs text-slate-200 shadow-lg">
                      <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                        Signal confidence
                      </p>
                      <p className="text-sm text-slate-200">{confidenceDetail}</p>
                      <Tooltip.Arrow className="h-2.5 w-2.5 rotate-45 border border-slate-800/80 bg-slate-950/95" />
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>

            <p className="mt-3 text-lg font-semibold text-slate-100">
              Right now: require clear ROI before approving new spend.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-slate-300">
              {constraintHighlights.map((constraint) => (
                <li key={constraint}>• {constraint}</li>
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
