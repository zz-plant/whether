"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { Tooltip } from "@base-ui/react/tooltip";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import { DataProvenanceStrip, type DataProvenance } from "../dataProvenanceStrip";
import { RegimeBadgeIcon } from "../regimeIcons";
import {
  clampToRange,
  formatNumber,
  getRegimeAccent,
  getRegimeLabel,
  regimeBadges,
} from "../reportSectionUtils";

export const RegimeAssessmentCard = ({
  assessment,
  provenance,
}: {
  assessment: RegimeAssessment;
  provenance: DataProvenance;
}) => {
  const regimeLabel = getRegimeLabel(assessment.regime);
  const regimeAccent = getRegimeAccent(assessment.regime);
  const hasWarnings = assessment.dataWarnings.length > 0;
  const constraintCount = assessment.constraints.length;
  const tightnessScore = clampToRange(assessment.scores.tightness, 0, 100);
  const riskScore = clampToRange(assessment.scores.riskAppetite, 0, 100);
  const progressId = `regime-progress-${assessment.regime.toLowerCase()}`;
  const tightnessGradientId = `${progressId}-tightness-gradient`;
  const riskGradientId = `${progressId}-risk-gradient`;
  const tightnessMaskId = `${progressId}-tightness-mask`;
  const riskMaskId = `${progressId}-risk-mask`;
  const baseRateThreshold = assessment.thresholds.baseRateTightness;
  const tightnessThreshold = assessment.thresholds.tightnessRegime;
  const riskThreshold = assessment.thresholds.riskAppetiteRegime;
  const curveSlopeValue = assessment.scores.curveSlope;
  const curveSlopeLabel =
    curveSlopeValue === null
      ? "Yield curve slope unavailable."
      : curveSlopeValue < 0
        ? `Yield curve inversion (${curveSlopeValue.toFixed(2)}%).`
        : `Yield curve normal (${curveSlopeValue.toFixed(2)}%).`;
  const tightnessLabel = `Cash availability (tightness) ${assessment.scores.tightness}/100 ${
    assessment.scores.tightness > tightnessThreshold ? "above" : "below"
  } ${tightnessThreshold}.`;
  const riskLabel = `Market risk appetite ${assessment.scores.riskAppetite}/100 ${
    assessment.scores.riskAppetite > riskThreshold ? "above" : "below"
  } ${riskThreshold}.`;
  const baseRateLabel = `Rate baseline ${formatNumber(
    assessment.scores.baseRate,
    "%",
  )} ${assessment.scores.baseRate > baseRateThreshold ? "above" : "below"} ${baseRateThreshold}%.`;
  const constraintDrivers = [
    {
      id: "curve-slope",
      label: curveSlopeLabel,
      href: "/signals#sensor-array",
      linkLabel: "View curve slope",
    },
    {
      id: "base-rate",
      label: baseRateLabel,
      href: "/signals#sensor-array",
      linkLabel: "View base rate",
    },
    {
      id: "tightness",
      label: tightnessLabel,
      href: "/signals#thresholds",
      linkLabel: "View thresholds",
    },
    {
      id: "risk-appetite",
      label: riskLabel,
      href: "/signals#thresholds",
      linkLabel: "View thresholds",
    },
  ];

  return (
    <section
      id="regime-assessment"
      aria-labelledby="regime-assessment-title"
      className="relative overflow-hidden weather-panel p-6"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80 blur-2xl" />
      <div className={`absolute inset-0 bg-gradient-to-br ${regimeAccent.panel} opacity-40`} />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="type-label text-slate-400">Current capital posture</p>
          <h2 id="regime-assessment-title" className="type-section text-slate-100">
            {regimeLabel}
          </h2>
          <p className="mt-2 text-xs font-semibold tracking-[0.12em] text-slate-400">
            System code: {assessment.regime}
          </p>
          <p className="mt-2 text-sm text-slate-300">
            Plain-English read: this is a macro guardrail, not a product vision change.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3 text-xs font-semibold tracking-[0.12em] text-slate-300">
          <span className="weather-pill flex items-center gap-2 px-3 py-1">
            <span className={`h-2 w-2 rounded-full ${regimeAccent.dot}`} />
            Climate status
          </span>
          <span className="weather-pill px-3 py-1">
            Cash availability <span className="tabular-nums">{assessment.scores.tightness}</span>
            {" "}· Risk <span className="tabular-nums">{assessment.scores.riskAppetite}</span>
          </span>
        </div>
        <div className="w-full">
          <DataProvenanceStrip provenance={provenance} />
        </div>
      </div>
      <Tooltip.Provider delay={200} closeDelay={50}>
        <div className="relative mt-4 flex flex-wrap gap-2 text-xs font-semibold tracking-[0.12em]">
          {regimeBadges.map((badge) => {
            const isActive = badge.key === assessment.regime;
            return (
              <Tooltip.Root key={badge.key}>
                <Tooltip.Trigger
                  type="button"
                  className={`weather-pill flex min-h-[44px] items-center gap-2 px-3 py-2 ${badge.classes} ${
                    isActive ? "text-slate-100" : "opacity-60"
                  }`}
                  aria-current={isActive ? "true" : undefined}
                >
                  <RegimeBadgeIcon icon={badge.icon} />
                  <span className="text-xs">{badge.label}</span>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Positioner side="bottom" align="start" sideOffset={10}>
                    <Tooltip.Popup className="max-w-[220px] rounded-2xl border border-slate-800/80 bg-slate-950/95 px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-200 shadow-xl">
                      {badge.description}
                      <Tooltip.Arrow className="h-2 w-2 translate-y-[1px] rotate-45 rounded-[2px] bg-slate-950/95" />
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </Tooltip.Root>
            );
          })}
        </div>
      </Tooltip.Provider>
      <p className="relative mt-3 text-xs text-slate-400">
        Badge colors map to posture so anyone can scan the report quickly.
      </p>
      <p className="relative mt-4 type-data break-words text-slate-200">
        {assessment.description}
      </p>
      <div className="weather-surface relative mt-4 grid gap-3 p-4 text-xs text-slate-400 md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500">Constraints</p>
          <p className="mt-2 text-lg font-semibold text-slate-100 tabular-nums">
            {constraintCount}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500">
            Cash availability (tightness)
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-100 tabular-nums">
            {assessment.scores.tightness}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500">
            Market risk appetite
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-100 tabular-nums">
            {assessment.scores.riskAppetite}
          </p>
        </div>
      </div>
      <div className="weather-surface relative mt-3 grid gap-3 p-4 text-xs text-slate-400 md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500">
            Cash availability
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Higher tightness means cash is harder to access, so prefer short payback work.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500">
            Risk appetite
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Lower appetite means reduce experiments and protect core revenue.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500">
            Score guidance
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Treat scores above the threshold as a stronger constraint on approvals.
          </p>
        </div>
      </div>
      <ul className="relative mt-4 space-y-3 text-sm text-slate-300">
        {assessment.constraints.map((item) => (
          <li key={item} className="space-y-2">
            <div className="flex gap-2">
              <span className="text-slate-500">•</span>
              <span className="break-words">{item}</span>
            </div>
            <Collapsible.Root className="ml-5 rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-2 text-xs text-slate-300">
              <Collapsible.Trigger
                type="button"
                className="flex min-h-[44px] items-center gap-2 text-xs font-semibold tracking-[0.12em] text-slate-400 transition-colors hover:text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                Because
                <span className="text-slate-500">(show drivers)</span>
              </Collapsible.Trigger>
              <Collapsible.Panel className="mt-2 space-y-2">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-500">
                  Driven by
                </p>
                <ul className="space-y-2">
                  {constraintDrivers.map((driver) => (
                    <li key={driver.id} className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-500">•</span>
                      <span className="break-words">{driver.label}</span>
                      <a
                        href={driver.href}
                        className="touch-target inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.12em] text-slate-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100 touch-manipulation"
                      >
                        {driver.linkLabel}
                      </a>
                    </li>
                  ))}
                </ul>
              </Collapsible.Panel>
            </Collapsible.Root>
          </li>
        ))}
      </ul>
      <div className="weather-surface relative mt-6 grid gap-4 p-4 text-xs text-slate-400 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold tracking-[0.12em] text-slate-500">
            <span>Cash availability (tightness)</span>
            <span className="text-slate-200 tabular-nums">
              {assessment.scores.tightness}/100
            </span>
          </div>
          <meter
            className="sr-only"
            min={0}
            max={100}
            value={tightnessScore}
            aria-label="Cash availability tightness score"
          />
          <svg
            viewBox="0 0 100 8"
            className="h-2 w-full"
            aria-hidden="true"
            focusable="false"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={tightnessGradientId} x1="0" y1="0" x2="100" y2="0">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
              <mask id={tightnessMaskId} maskUnits="userSpaceOnUse">
                <rect width="100" height="8" rx="4" fill="#fff" />
              </mask>
            </defs>
            <g mask={`url(#${tightnessMaskId})`}>
              <rect width="100" height="8" fill="#1e293b" />
              <rect width={tightnessScore} height="8" fill={`url(#${tightnessGradientId})`} />
            </g>
          </svg>
          <p>{assessment.tightnessExplanation}</p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold tracking-[0.12em] text-slate-500">
            <span>Market risk appetite</span>
            <span className="text-slate-200 tabular-nums">
              {assessment.scores.riskAppetite}/100
            </span>
          </div>
          <meter
            className="sr-only"
            min={0}
            max={100}
            value={riskScore}
            aria-label="Market risk appetite score"
          />
          <svg
            viewBox="0 0 100 8"
            className="h-2 w-full"
            aria-hidden="true"
            focusable="false"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={riskGradientId} x1="0" y1="0" x2="100" y2="0">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <mask id={riskMaskId} maskUnits="userSpaceOnUse">
                <rect width="100" height="8" rx="4" fill="#fff" />
              </mask>
            </defs>
            <g mask={`url(#${riskMaskId})`}>
              <rect width="100" height="8" fill="#1e293b" />
              <rect width={riskScore} height="8" fill={`url(#${riskGradientId})`} />
            </g>
          </svg>
          <p>{assessment.riskAppetiteExplanation}</p>
        </div>
      </div>
      {hasWarnings ? (
        <div className="relative mt-6 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-xs text-amber-100">
          <p className="text-xs font-semibold tracking-[0.12em] text-amber-200">
            Data quality flags
          </p>
          <ul className="mt-3 space-y-2">
            {assessment.dataWarnings.map((warning) => (
              <li key={warning} className="flex gap-2">
                <span className="text-amber-200/80">•</span>
                <span className="break-words">{warning}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-amber-200/80">
            Scores may be less reliable when source fields are missing.
          </p>
        </div>
      ) : null}
    </section>
  );
};
