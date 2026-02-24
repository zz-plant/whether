/**
 * Report section components for the Whether Report dashboard.
 * Keeps layout blocks focused and reusable across the Market Climate Station UI.
 */
"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Accordion } from "@base-ui/react/accordion";
import { Collapsible } from "@base-ui/react/collapsible";
import { Field } from "@base-ui/react/field";
import { Input } from "@base-ui/react/input";
import { Select } from "@base-ui/react/select";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Tooltip } from "@base-ui/react/tooltip";
import type { RegimeAssessment } from "../../lib/regimeEngine";
import type { PlaybookEntry } from "../../lib/playbook";
import type {
  MacroSeriesReading,
  SensorReading,
  SensorTimeWindow,
  TreasuryData,
} from "../../lib/types";
import {
  getSensorWindowAggregation,
  sensorTimeWindows,
} from "../../lib/sensors";
import { cxoFunctionOutputs } from "../../lib/cxoFunctionOutputs";
import { operatorRequests } from "../../lib/operatorRequests";
import { buildMonthlySummary, getMonthlyActionGuidance } from "../../lib/summary/monthlySummary";
import { buildWeeklySummary, getWeeklyActionGuidance } from "../../lib/summary/weeklySummary";
import { buildCadenceAlignment } from "../../lib/cadenceAlignment";
import { formatDateUTC, formatTimestampUTC } from "../../lib/formatters";
import { buildMacroPriorityScore, rankMacroSignalsByPriority } from "../../lib/macroPrioritization";
import { DataProvenanceStrip, type DataProvenance } from "./dataProvenanceStrip";
import { MonthlySummaryCard } from "./monthlySummaryCard";
import { SummaryDeltaPanel } from "./summaryDeltaPanel";
import { WeeklySummaryCard } from "./weeklySummaryCard";
import { insightDatabase } from "../../data/recommendations";
import {
  buildSparkline,
  CLIMATE_ORDER,
  clampToRange,
  formatDelta,
  formatNumber,
  getRegimeAccent,
  getRegimeBadge,
  getRegimeLabel,
  mapToPercent,
  regimeBadges,
  SPARKLINE_HEIGHT,
  SPARKLINE_WIDTH,
} from "./reportSectionUtils";

type SeriesFreshnessProps = {
  label?: string;
  sourceLabel: string;
  sourceUrl: string;
  recordDate: string;
  fetchedAt: string;
  isLive: boolean;
};

const SeriesFreshnessBadge = ({
  label = "Data freshness",
  sourceLabel,
  sourceUrl,
  recordDate,
  fetchedAt,
  isLive,
}: SeriesFreshnessProps) => {
  const statusLabel = isLive ? "Live source" : "Cached snapshot";
  const statusTone = isLive
    ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
    : "border-amber-400/60 bg-amber-500/15 text-amber-100";

  return (
    <div className="weather-surface px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">{label}</p>
        <span
          className={`inline-flex min-h-[24px] items-center rounded-full border px-2 py-1 text-xs font-semibold tracking-[0.12em] ${statusTone}`}
        >
          {statusLabel}
        </span>
      </div>
      <dl className="mt-2 space-y-2 text-xs text-slate-400">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-slate-500">Source</dt>
          <dd>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="touch-target inline-flex min-h-[44px] items-center text-slate-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100"
            >
              {sourceLabel}
            </a>
          </dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-slate-500">Record date</dt>
          <dd className="mono text-slate-200">
            <time dateTime={recordDate}>{formatDateUTC(recordDate)}</time>
          </dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-slate-500">Fetched</dt>
          <dd className="mono text-slate-200">
            <time dateTime={fetchedAt}>{formatTimestampUTC(fetchedAt)}</time>
          </dd>
        </div>
      </dl>
    </div>
  );
};


type ActionSummaryBlock = {
  heading: string;
  bullets: string[];
};

type ActionSummaryPanelProps = {
  id: string;
  label: string;
  title: string;
  description: ReactNode;
  summaryCard: ReactNode;
  blocks: ActionSummaryBlock[];
  footer?: ReactNode;
};

const ActionSummaryPanel = ({
  id,
  label,
  title,
  description,
  summaryCard,
  blocks,
  footer,
}: ActionSummaryPanelProps) => (
  <section id={id} aria-labelledby={`${id}-title`} className="mt-8">
    <div className="weather-panel flex flex-col gap-4 px-5 py-4">
      <p className="type-label text-slate-400">{label}</p>
      <h2 id={`${id}-title`} className="type-section text-slate-100">
        {title}
      </h2>
      <p className="max-w-3xl text-sm leading-relaxed text-slate-300/90">{description}</p>
      {summaryCard}
      <div className="grid gap-3 md:grid-cols-2">
        {blocks.map((block) => (
          <div key={block.heading} className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
              {block.heading}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {block.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="text-slate-500">•</span>
                  <span className="break-words">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {footer}
    </div>
  </section>
);

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
  const weeklySummary = buildWeeklySummary({
    assessment,
    provenance,
    recordDateLabel,
  });
  const weeklyBlocks: ActionSummaryBlock[] = [
    {
      heading: "Product strategy",
      bullets: [
        "“Our core user problem is unchanged, and we can prove the payoff in 1–2 quarters.”",
        "“We’re trading scope for reliability because retention is the constraint.”",
      ],
    },
    {
      heading: "Macro guidance",
      bullets: [
        "“Delay long-payback bets until cash availability loosens or risk appetite turns.”",
        "“Keep hiring approvals tighter while the curve is inverted.”",
      ],
    },
  ];
  const decisionChecklist = [
    {
      title: "Anchor on posture",
      detail: `Operate in ${regimeLabel} mode: ${actionGuidance}.`,
    },
    {
      title: "Name the constraint",
      detail: `Cash availability ${assessment.scores.tightness}/100 · Risk appetite ${assessment.scores.riskAppetite}/100 (0–100 scores).`,
    },
    {
      title: "Lock the one-week bet",
      detail: "Pick the smallest scope that protects retention or reliability.",
    },
  ];
  const decisionFlow = [
    {
      title: "Posture",
      value: regimeLabel,
      detail: actionGuidance,
    },
    {
      title: "Constraints",
      value: `${assessment.scores.tightness}/100 · ${assessment.scores.riskAppetite}/100`,
      detail: "Cash availability · Risk appetite",
    },
    {
      title: "One-week bet",
      value: "Smallest scope",
      detail: "Protect retention or reliability.",
    },
  ];
  const weeklyQuickLinks = [
    { href: "#executive-snapshot", label: "Leadership summary" },
    { href: "/operations#ops-playbook", label: "Actions playbook" },
    { href: "/signals#thresholds", label: "Thresholds (score cutoffs)" },
  ];
  const curveSlopeValue = assessment.scores.curveSlope;
  const curveSlopeDisplay =
    curveSlopeValue === null ? "Unavailable" : `${curveSlopeValue.toFixed(2)}%`;
  const curveSlopeStatus =
    curveSlopeValue === null
      ? "Awaiting curve update"
      : curveSlopeValue < 0
        ? "Curve inverted"
        : "Curve normal";
  const weeklySignalTiles = [
    {
      label: "Cash availability",
      value: `${assessment.scores.tightness}/100`,
      detail: `Threshold ${assessment.thresholds.tightnessRegime} (higher = tighter).`,
    },
    {
      label: "Risk appetite",
      value: `${assessment.scores.riskAppetite}/100`,
      detail: `Threshold ${assessment.thresholds.riskAppetiteRegime} (higher = more risk-on).`,
    },
    {
      label: "Curve slope",
      value: curveSlopeDisplay,
      detail: curveSlopeStatus,
    },
  ];
  const timingWindows = [
    {
      label: "Best window to commit roadmap scope",
      detail:
        assessment.scores.riskAppetite >= assessment.thresholds.riskAppetiteRegime
          ? "Early week after leadership sync; confidence supports bounded expansion."
          : "After review with finance guardrails; keep reversibility explicit.",
    },
    {
      label: "Best window for hiring approvals",
      detail:
        assessment.scores.tightness >= assessment.thresholds.tightnessRegime
          ? "Late week with contingency plan attached."
          : "Midweek once role-to-revenue linkage is clear.",
    },
  ];
  const [showMetricDefinitions, setShowMetricDefinitions] = useState(false);

  return (
    <section id="weekly-action-summary" aria-labelledby="weekly-action-summary-title" className="mt-8">
      <div className="weather-panel flex flex-col gap-6 px-6 py-5">
        <Tooltip.Provider delay={200} closeDelay={50}>
          <div className="grid gap-6 lg:grid-cols-[1.35fr,0.65fr]">
            <div className="space-y-4">
              <div>
                <p className="type-label text-slate-400">This week&apos;s forecast</p>
                <h2 id="weekly-action-summary-title" className="type-section text-slate-100">
                  Weekly action map
                </h2>
                <p className="mt-3 text-sm text-slate-200">
                  Set posture fast, then skim the{" "}
                  <a
                    href="#executive-snapshot"
                    className="touch-target inline-flex min-h-[44px] items-center text-slate-100 underline decoration-slate-600 underline-offset-4 hover:text-slate-50 touch-manipulation"
                  >
                    leadership summary
                  </a>{" "}
                  for sources.
                </p>
                <div className="mt-4">
                  <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">
                    Decision flow
                  </p>
                  <ol className="mt-3 grid gap-3 sm:grid-cols-3">
                    {decisionFlow.map((step, index) => (
                      <li
                        key={step.title}
                        className="relative rounded-xl border border-slate-800/80 bg-slate-950/60 p-4"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700/70 text-xs font-semibold text-slate-200">
                          {index + 1}
                        </span>
                        <p className="mt-3 text-xs font-semibold tracking-[0.14em] text-slate-400">
                          {step.title}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-100">{step.value}</p>
                        <p className="mt-1 text-xs text-slate-400">{step.detail}</p>
                        {index < decisionFlow.length - 1 ? (
                          <span
                            className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-slate-600 sm:block"
                            aria-hidden="true"
                          >
                            →
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            <div className="rounded-2xl border border-sky-400/40 bg-slate-950/60 p-4">
              <p className="text-xs font-semibold tracking-[0.18em] text-sky-200">
                Recommended stance
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-100">
                Operate in {regimeLabel} mode.
              </p>
              <p className="mt-2 text-sm text-slate-200">{actionGuidance}</p>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Since last read</p>
              <p className="mt-2 text-sm text-slate-200">
                View the delta snapshot before you lock weekly decisions.{" "}
                <a
                  href="#change-since-last-read"
                  className="touch-target inline-flex min-h-[44px] items-center text-slate-100 underline decoration-slate-600 underline-offset-4 hover:text-slate-50 touch-manipulation"
                >
                  Jump to the change log
                </a>
                .
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold tracking-[0.12em] text-slate-300">
              <span className="weather-pill inline-flex min-h-[32px] items-center px-3 py-1">
                Regime: {regimeLabel}
              </span>
              <span className="weather-pill-muted inline-flex min-h-[32px] items-center px-3 py-1">
                Strategy: tool-need fit
              </span>
              <span className="weather-pill-muted inline-flex min-h-[32px] items-center px-3 py-1">
                Macro: cash + risk appetite
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {weeklySignalTiles.map((tile) => (
                <div key={tile.label} className="weather-surface p-4">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">{tile.label}</p>
                  <p className="mono mt-3 text-2xl text-slate-100">{tile.value}</p>
                  <p className="mt-2 text-xs text-slate-500">{tile.detail}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-700/90 bg-slate-950/60 px-4 py-3">
              <button
                type="button"
                aria-expanded={showMetricDefinitions}
                aria-controls="weekly-metric-definitions"
                onClick={() => setShowMetricDefinitions((current) => !current)}
                className="flex min-h-[44px] w-full items-center justify-between gap-3 text-left text-xs font-semibold tracking-[0.12em] text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                <span>How these three metrics are defined</span>
                <span
                  aria-hidden="true"
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-600/80 text-slate-300 transition-transform duration-200 ${showMetricDefinitions ? "rotate-180" : ""}`}
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                    <path
                      d="M7 10l5 5 5-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="sr-only">{showMetricDefinitions ? "Expanded" : "Collapsed"}</span>
              </button>
              {showMetricDefinitions ? (
                <ul id="weekly-metric-definitions" className="mt-3 space-y-2 text-xs text-slate-400">
                  <li><span className="text-slate-200">Cash availability:</span> Normalized score of how tight or loose credit conditions appear in Treasury-linked signals.</li>
                  <li><span className="text-slate-200">Risk appetite:</span> Normalized score of market willingness to fund risk-on bets versus defensive posture.</li>
                  <li><span className="text-slate-200">Curve slope:</span> Difference between long- and short-term Treasury rates; negative values indicate inversion risk.</li>
                </ul>
              ) : null}
            </div>
          </div>
          <div className="grid gap-4">
            <WeeklySummaryCard summary={weeklySummary} />
            <div className="weather-surface p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Cadence</p>
              <p className="mt-3 text-sm text-slate-200">
                Next Treasury refresh recorded {recordDateLabel}.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Keep weekly decisions within this window unless new alerts publish.
              </p>
            </div>
            <div className="weather-surface p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Best timing windows
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {timingWindows.map((window) => (
                  <li key={window.label}>
                    <p className="text-xs font-semibold tracking-[0.08em] text-slate-200">
                      {window.label}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{window.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        </Tooltip.Provider>

        <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="grid gap-3">
            {weeklyBlocks.map((block) => (
              <div key={block.heading} className="weather-surface p-4">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  {block.heading}
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {block.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <span className="text-slate-500">•</span>
                      <span className="break-words">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <aside className="weather-surface p-4" aria-label="Weekly decision points">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Decision points</p>
            <ol className="mt-3 space-y-4 text-sm text-slate-300">
              {decisionChecklist.map((item, index) => (
                <li key={item.title} className="flex gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/70 bg-slate-950 text-xs font-semibold text-slate-200">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-slate-500">
              Reference these points before roadmap or staffing changes.
            </p>
          </aside>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Quick routes</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {weeklyQuickLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="touch-target inline-flex min-h-[44px] items-center text-sm text-slate-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-500">
          Keep the weekly narrative tight so leaders can decide without re-reading the data lanes.
        </p>
      </div>
    </section>
  );
};

export const MonthlyActionSummaryPanel = ({
  assessment,
  provenance,
  recordDateLabel,
}: {
  assessment: RegimeAssessment;
  provenance: DataProvenance;
  recordDateLabel: string;
}) => {
  const regimeLabel = getRegimeLabel(assessment.regime);
  const actionGuidance = getMonthlyActionGuidance(assessment.regime);
  const weeklySummary = buildWeeklySummary({
    assessment,
    provenance,
    recordDateLabel,
  });
  const monthlySummary = buildMonthlySummary({
    assessment,
    provenance,
    recordDateLabel,
  });
  const cadenceAlignment = buildCadenceAlignment(weeklySummary, monthlySummary);
  const cadenceBadge =
    cadenceAlignment.status === "aligned"
      ? {
          label: "Aligned",
          classes: "border-emerald-400/60 bg-emerald-500/10 text-emerald-100",
        }
      : cadenceAlignment.status === "watch"
        ? {
            label: "Needs review",
            classes: "border-amber-400/60 bg-amber-500/10 text-amber-100",
          }
        : {
            label: "Mismatch",
            classes: "border-rose-500/60 bg-rose-500/10 text-rose-100",
          };
  const monthlyBlocks: ActionSummaryBlock[] = [
    {
      heading: "Monthly leadership asks sound like",
      bullets: [
        "“These three bets can still pay back within the climate constraints.”",
        "“We’re sequencing roadmap work to reduce risk before expanding scope.”",
      ],
    },
    {
      heading: "Monthly constraints should force",
      bullets: [
        "“Only one major growth bet at a time until cash availability improves.”",
        "“Move hires to contingency approval and revisit after the next Treasury refresh.”",
      ],
    },
  ];
  const monthlyFocus = assessment.constraints.slice(0, 3);

  return (
    <ActionSummaryPanel
      id="monthly-action-summary"
      label="What should I do this month?"
      title="Monthly action summary"
      description={
        <>
          This month, operate in {regimeLabel} mode: {actionGuidance}. Use these constraints to
          align staffing, sequencing, and approval cadence before you lock the next sprint slate.
        </>
      }
      summaryCard={
        <>
          <div className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
              Monthly focus (at a glance)
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              {monthlyFocus.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-slate-500">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <MonthlySummaryCard summary={monthlySummary} />
          <SummaryDeltaPanel weeklySummary={weeklySummary} monthlySummary={monthlySummary} />
          <div className="weather-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Cadence alignment
              </p>
              <span
                className={`inline-flex min-h-[24px] items-center rounded-full border px-2 py-1 text-xs font-semibold tracking-[0.12em] ${cadenceBadge.classes}`}
              >
                {cadenceBadge.label}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-200">{cadenceAlignment.note}</p>
          </div>
        </>
      }
      blocks={monthlyBlocks}
    />
  );
};

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
    "%"
  )} ${
    assessment.scores.baseRate > baseRateThreshold ? "above" : "below"
  } ${baseRateThreshold}%.`;
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
          <p className="type-label text-slate-400">Current market climate</p>
          <h2 id="regime-assessment-title" className="type-section text-slate-100">
            {regimeLabel}
          </h2>
          <p className="mt-2 text-xs font-semibold tracking-[0.12em] text-slate-400">
            System code: {assessment.regime}
          </p>
          <p className="mt-2 text-sm text-slate-300">
            Plain-English read: this defines the operating envelope for decisions this cycle.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3 text-xs font-semibold tracking-[0.12em] text-slate-300">
          <span className="weather-pill flex items-center gap-2 px-3 py-1">
            <span className={`h-2 w-2 rounded-full ${regimeAccent.dot}`} />
            Climate status
          </span>
          <span className="weather-pill px-3 py-1">
            Cash availability{" "}
            <span className="tabular-nums">{assessment.scores.tightness}</span> · Risk{" "}
            <span className="tabular-nums">{assessment.scores.riskAppetite}</span>
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
                  className={`weather-pill flex min-h-[44px] items-center gap-2 px-3 py-2 ${
                    badge.classes
                  } ${isActive ? "text-slate-100" : "opacity-60"}`}
                  aria-current={isActive ? "true" : undefined}
                >
                  <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
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
      <p className="relative mt-4 type-data text-slate-200 break-words">{assessment.description}</p>
      <div className="weather-surface relative mt-4 grid gap-3 p-4 text-xs text-slate-400 md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500">Constraints</p>
          <p className="mt-2 text-lg font-semibold text-slate-100 tabular-nums">{constraintCount}</p>
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
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500">Cash availability</p>
          <p className="mt-2 text-xs text-slate-400">
            Higher tightness means cash is harder to access, so prefer short payback work.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500">Risk appetite</p>
          <p className="mt-2 text-xs text-slate-400">
            Lower appetite means reduce experiments and protect core revenue.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500">Score guidance</p>
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
            <span className="text-slate-200 tabular-nums">{assessment.scores.tightness}/100</span>
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
            <span className="text-slate-200 tabular-nums">{assessment.scores.riskAppetite}/100</span>
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
          <p className="text-xs font-semibold tracking-[0.12em] text-amber-200">Data quality flags</p>
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

export const FirstTimeGuidePanel = ({
  statusLabel,
  recordDateLabel,
  fetchedAtLabel,
}: {
  statusLabel: string;
  recordDateLabel: string;
  fetchedAtLabel: string;
}) => (
  <section id="first-time-guide" aria-labelledby="first-time-guide-title" className="mt-10">
    <div className="weather-panel weather-panel-static p-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <p className="type-label text-slate-400">Recommended start</p>
          <h2 id="first-time-guide-title" className="type-section text-slate-100">
            Recommended quick scan in three stops
          </h2>
          <p className="mt-2 type-data text-slate-300">
            Use this walkthrough to align on the core posture before you dive into deeper lanes.
          </p>
        </div>
        <div className="weather-surface px-4 py-3 text-xs font-semibold tracking-[0.12em] text-slate-300">
          <p className="text-xs text-slate-500">Current snapshot</p>
          <p className="mt-2 text-xs text-slate-200">Status: {statusLabel}</p>
          <p className="mt-1 text-xs text-slate-400">Record: {recordDateLabel}</p>
          <p className="mt-1 text-xs text-slate-500">Fetched: {fetchedAtLabel}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
        <ul className="space-y-3">
          {[
            {
              label: "Summary",
              detail:
                "Confirm the weekly posture and top constraints before you open deeper diagnostics.",
              example: "Example decision: defer expansion hires when cash is tight.",
            },
            {
              label: "Proof",
              detail:
                "Use the signal breakdown here, then open the data lane to see the source metrics.",
              example: "Example decision: confirm curve inversion before approving long bets.",
            },
            {
              label: "Actions",
              detail:
                "Use the actions lane to brief leadership with clear, plain-English constraints.",
              example: "Example decision: focus on retention when risk appetite is cautious.",
            },
          ].map((step) => (
            <li key={step.label} className="weather-surface p-4 text-sm text-slate-300">
              <Collapsible.Root className="space-y-2">
                <Collapsible.Trigger
                  type="button"
                  className="group flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-slate-800/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700/70 bg-slate-950 text-xs font-semibold text-slate-300">
                      ✓
                    </span>
                    <span className="text-xs font-semibold tracking-[0.12em] text-slate-200">{step.label}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-slate-400">
                    <span>Details</span>
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700/70 text-slate-400 transition-transform duration-200 group-data-[panel-open]:rotate-180">⌄</span>
                  </span>
                </Collapsible.Trigger>
                <Collapsible.Panel className="animate-collapsible-in space-y-2 text-xs text-slate-400">
                  <p>{step.detail}</p>
                  <p className="text-xs text-slate-500">{step.example}</p>
                </Collapsible.Panel>
              </Collapsible.Root>
            </li>
          ))}
        </ul>
        <aside className="weather-surface p-4" aria-label="Onboarding highlights">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
            Quick scan highlights
          </p>
          <ul className="mt-3 space-y-3 text-sm text-slate-300">
            <li className="flex gap-2">
              <span className="text-slate-500">•</span>
              <span>Climate badge and weekly action summary.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-slate-500">•</span>
              <span>Source freshness and capture timestamp.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-slate-500">•</span>
              <span>Playbook links for constraint and action context.</span>
            </li>
          </ul>
          <div className="mt-4 rounded-lg border border-sky-900/60 bg-slate-950/60 p-3 text-xs text-slate-400">
            Tip: share the selected time-machine URL to keep assumptions aligned.
          </div>
        </aside>
      </div>

      <div className="mt-6 space-y-2 text-sm text-slate-300">
        <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
          Next
        </p>
        <ul className="space-y-2">
          {[
            { href: "#executive-snapshot", label: "Leadership summary" },
            { href: "/operations#ops-playbook", label: "Actions playbook" },
            { href: "/signals#time-machine", label: "Time machine" },
          ].map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="touch-target inline-flex min-h-[44px] items-center text-sm text-slate-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Share the URL when you lock thresholds or time machine selections so every stakeholder sees
        the same climate assumptions.
      </p>
    </div>
  </section>
);

export const BeginnerGlossaryPanel = () => {
  const glossaryEntries = [
    {
      value: "tightness",
      term: "Cash availability (tightness)",
      summary:
        "How hard it is to access funding. Higher tightness means conserve cash and focus on runway.",
      why: "Why it matters: tight capital makes long payback projects riskier.",
      usedInLabel: "Executive snapshot",
      usedInHref: "#executive-snapshot",
    },
    {
      value: "risk-appetite",
      term: "Market risk appetite",
      summary:
        "How willing the market is to take risk. Lower appetite means de-risk launches and hiring.",
      why: "Why it matters: risk appetite sets how bold your roadmap can be.",
      usedInLabel: "Signal matrix",
      usedInHref: "#signal-matrix",
    },
    {
      value: "curve-slope",
      term: "Curve slope (recession risk)",
      summary:
        "A read on recession risk. Inversion signals caution and favors defensive planning.",
      why: "Why it matters: an inverted curve warns against long-horizon bets.",
      usedInLabel: "Executive snapshot",
      usedInHref: "#executive-snapshot",
    },
    {
      value: "fallback-mode",
      term: "Fallback mode",
      summary:
        "When live data is unavailable, the report uses the latest cached Treasury snapshot.",
      why: "Why it matters: stale inputs can mislead time-sensitive decisions.",
      usedInLabel: "Executive snapshot",
      usedInHref: "#executive-snapshot",
    },
  ];

  return (
    <section id="beginner-glossary" aria-labelledby="beginner-glossary-title" className="mt-10">
      <div className="weather-panel weather-panel-static p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Glossary</p>
            <h3 id="beginner-glossary-title" className="type-section text-slate-100">
              Translate finance terms into day-to-day product decisions
            </h3>
            <p className="mt-2 type-data text-slate-300">
              New to Treasury data? Reference this glossary as needed to translate jargon into
              concrete product moves before you share the report.
            </p>
          </div>
          <div className="weather-surface px-4 py-3 text-xs font-semibold tracking-[0.12em] text-slate-300">
            <p className="text-xs text-slate-500">Onboarding lens</p>
            <p className="mt-2 text-xs text-slate-200">Plain English over jargon</p>
            <p className="mt-1 text-xs text-slate-400">Focus on constraints</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="weather-surface p-4 text-sm text-slate-300">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-200">
              Reading notes
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>
                <span className="text-slate-200">Climate badge</span> summarizes current macro stance.
              </li>
              <li>
                <span className="text-slate-200">Signals map to constraints</span> rather than forecasts.
              </li>
              <li>
                <span className="text-slate-200">Exports support alignment</span> across teams.
              </li>
            </ul>
          </div>
          <aside className="weather-surface p-4" aria-label="Glossary sidebar">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Glossary</p>
            <Accordion.Root
              multiple
              className="mt-3 space-y-3 text-sm text-slate-300"
            >
              {glossaryEntries.map((entry) => (
                <Accordion.Item
                  key={entry.value}
                  value={entry.value}
                  className="rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-2"
                >
                  <Accordion.Header>
                    <Accordion.Trigger className="group flex min-h-[44px] w-full items-center justify-between gap-3 py-2 text-left touch-manipulation">
                      <span>
                        <span className="text-xs font-semibold tracking-[0.12em] text-slate-200">
                          {entry.term}
                        </span>
                        <span className="mt-1 block text-xs text-slate-400">
                          {entry.summary}
                        </span>
                        <span className="mt-1 block text-[11px] uppercase tracking-[0.14em] text-slate-500">Select to expand or collapse</span>
                      </span>
                      <span className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-slate-700/70 text-slate-300 transition-transform group-data-[panel-open]:rotate-180" aria-hidden="true">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                          <path
                            d="M7 10l5 5 5-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Panel className="mt-3 space-y-2 text-sm text-slate-400">
                    <p className="text-xs text-slate-500">{entry.why}</p>
                    <p className="text-xs text-slate-400">
                      Used in:{" "}
                      <a
                        href={entry.usedInHref}
                        className="touch-target inline-flex min-h-[44px] items-center text-xs text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-slate-100"
                      >
                        {entry.usedInLabel}
                      </a>
                    </p>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          </aside>
        </div>
      </div>
    </section>
  );
};

export const OperatorRequestsPanel = ({ provenance }: { provenance: DataProvenance }) => {
  const backlogRequests = operatorRequests.filter((request) => request.status === "BACKLOG");

  return (
    <section
      id="operator-requests"
      aria-labelledby="operator-requests-title"
      className="mt-10 weather-panel p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="type-label text-slate-400">Post-MVP demand</p>
          <h3 id="operator-requests-title" className="type-section text-slate-100">
            Operator request backlog
          </h3>
        </div>
        <DataProvenanceStrip provenance={provenance} />
      </div>
      <p className="mt-3 max-w-3xl type-data text-slate-300">
        These are the most common expansion requests expected after launch, curated to highlight
        what remains outstanding while keeping traceable data sources and plain-English operational
        guidance front and center.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {backlogRequests.map((request) => (
          <div
            key={request.title}
            className="weather-surface rounded-2xl px-4 py-4"
          >
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
              {request.title}
            </p>
            <p className="mt-2 text-sm text-slate-200">{request.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export const CxoFunctionPanel = ({ provenance }: { provenance: DataProvenance }) => (
  <section
    id="cxo-functions"
    aria-labelledby="cxo-functions-title"
    className="mt-10 weather-panel p-6"
  >
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="type-label text-slate-400">CXO outputs</p>
        <h3 id="cxo-functions-title" className="type-section text-slate-100">
          Executive function replacement map
        </h3>
      </div>
      <DataProvenanceStrip provenance={provenance} />
    </div>
    <p className="mt-3 max-w-3xl type-data text-slate-300">
      Each module below translates market climate signals into CXO-ready artifacts. Use them to align
      finance, operations, and product leadership on a shared macro posture.
    </p>
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {cxoFunctionOutputs.map((item) => (
        <div
          key={item.role}
          className="weather-surface rounded-2xl px-5 py-4"
        >
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">{item.role}</p>
          <p className="mt-3 text-sm text-slate-200">{item.focus}</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {item.outputs.map((output) => (
              <li key={output} className="flex gap-2">
                <span className="text-slate-500">•</span>
                <span className="break-words">{output}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </section>
);

export const SignalMatrixPanel = ({
  assessment,
  provenance,
}: {
  assessment: RegimeAssessment;
  provenance: DataProvenance;
}) => {
  const x = assessment.scores.riskAppetite;
  const y = assessment.scores.tightness;
  const matrixDotX = clampToRange(x, 0, 100);
  const matrixDotY = clampToRange(100 - y, 0, 100);
  const matrixGridId = "matrix-grid";
  const matrixGlowId = "matrix-glow";
  const tightnessThreshold = assessment.thresholds.tightnessRegime;
  const riskThreshold = assessment.thresholds.riskAppetiteRegime;
  const tightnessStatus = assessment.scores.tightness > tightnessThreshold ? "Tight" : "Loose";
  const riskStatus = assessment.scores.riskAppetite > riskThreshold ? "Bold" : "Cautious";
  const quadrantLabel = `${tightnessStatus} + ${riskStatus}`;
  const quadrants = [
    {
      id: "tight-cautious",
      label: "Tight + Cautious",
      description: "Cash conservation, tighter budgets, and slower hiring.",
      action: "Default action: cut burn and freeze risky launches.",
      className: "border-rose-500/40 bg-rose-500/10 text-rose-100",
    },
    {
      id: "tight-bold",
      label: "Tight + Bold",
      description: "Selective bets with strong governance and runway checks.",
      action: "Default action: fund only high-ROI bets with short payback.",
      className: "border-amber-400/40 bg-amber-500/10 text-amber-100",
    },
    {
      id: "loose-cautious",
      label: "Loose + Cautious",
      description: "Stable funding but risk appetite is muted; prioritize durability.",
      action: "Default action: prioritize reliability and retention projects.",
      className: "border-sky-400/40 bg-sky-500/10 text-sky-100",
    },
    {
      id: "loose-bold",
      label: "Loose + Bold",
      description: "Expansion-friendly conditions; scale responsibly.",
      action: "Default action: accelerate growth bets with clear guardrails.",
      className: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100",
    },
  ];

  return (
    <section
      id="signal-matrix"
      aria-labelledby="signal-matrix-title"
      aria-describedby="signal-matrix-description"
      className="weather-panel p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="type-label text-slate-400">Signal breakdown</p>
          <h3 id="signal-matrix-title" className="type-section text-slate-100">
            Risk posture matrix
          </h3>
          <p className="mt-2 text-sm text-slate-300">
            Read the balance of cash tightness and market risk appetite to anchor staffing and
            roadmap approvals. Tightness tracks funding friction; risk appetite tracks how willing
            markets are to fund growth bets.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-xs font-semibold tracking-[0.12em] text-slate-500">
          <span>Cash availability (tightness) vs. market risk appetite</span>
          <DataProvenanceStrip provenance={provenance} />
        </div>
      </div>
      <div className="mt-4 weather-surface p-4">
        <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Executive summary</p>
        <p className="mt-2 text-sm text-slate-200">
          Current posture: {quadrantLabel}. Use tightness {assessment.scores.tightness}/100 and risk
          appetite {assessment.scores.riskAppetite}/100 (normalized 0–100) to decide whether
          approvals should tighten or loosen.
        </p>
      </div>
      <Collapsible.Root className="mt-4">
        <Collapsible.Trigger
          type="button"
          className="group flex min-h-[44px] w-full items-center justify-between gap-3 text-left text-xs font-semibold tracking-[0.12em] text-slate-300 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
        >
          <span>Deep dive: matrix positioning and quadrant guidance</span>
          <span className="inline-flex min-h-[44px] items-center rounded-full border border-slate-700/80 px-3 text-[0.65rem] font-semibold tracking-[0.14em] text-slate-200">
            <span className="group-data-[panel-open]:hidden">Expand section</span>
            <span className="hidden group-data-[panel-open]:inline">Collapse section</span>
          </span>
        </Collapsible.Trigger>
        <Collapsible.Panel className="mt-4 grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <figure className="space-y-4">
            <div className="weather-surface p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Current posture</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-200">
                <span className="weather-pill inline-flex min-h-[44px] items-center px-3 py-1 text-xs font-semibold tracking-[0.12em] text-slate-200">
                  {quadrantLabel}
                </span>
                <span className="text-xs text-slate-400">
                  Tightness{" "}
                  <span className="mono text-slate-100">{assessment.scores.tightness}</span> · Risk{" "}
                  <span className="mono text-slate-100">{assessment.scores.riskAppetite}</span>
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Thresholds: tightness {tightnessThreshold}, risk {riskThreshold}. Use these to decide
                when to shift approvals or move between quadrants.
              </p>
            </div>
            <div className="weather-surface relative h-72">
              <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                role="img"
                aria-labelledby="signal-matrix-visual-title signal-matrix-visual-desc"
              >
                <title id="signal-matrix-visual-title">Signal matrix grid</title>
                <desc id="signal-matrix-visual-desc">
                  A two-by-two matrix showing the balance of tightness and market risk appetite.
                </desc>
                <defs>
                  <pattern
                    id={matrixGridId}
                    width="50"
                    height="50"
                    patternUnits="userSpaceOnUse"
                    patternTransform="scale(1)"
                  >
                    <path
                      d="M 50 0 H 0 V 50"
                      fill="none"
                      stroke="rgba(30,41,59,0.9)"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                  </pattern>
                  <filter id={matrixGlowId} x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow
                      dx="0"
                      dy="0"
                      stdDeviation="2"
                      floodColor="#fbbf24"
                      floodOpacity="0.45"
                    />
                  </filter>
                </defs>
                <rect width="100" height="100" fill={`url(#${matrixGridId})`} />
                <line
                  x1="50"
                  y1="0"
                  x2="50"
                  y2="100"
                  stroke="rgba(71,85,105,0.6)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1="0"
                  y1="50"
                  x2="100"
                  y2="50"
                  stroke="rgba(71,85,105,0.6)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x="50"
                  y="52"
                  textAnchor="middle"
                  fill="rgba(100,116,139,0.55)"
                  fontSize="8"
                  letterSpacing="6"
                >
                  MATRIX
                </text>
                <circle
                  cx={matrixDotX}
                  cy={matrixDotY}
                  r="4"
                  fill="#fbbf24"
                  stroke="#0f172a"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                  filter={`url(#${matrixGlowId})`}
                />
                <text
                  x={matrixDotX}
                  y={matrixDotY + 1.2}
                  textAnchor="middle"
                  fontSize="6"
                  fontWeight="600"
                  fill="#0f172a"
                  stroke="#0f172a"
                  strokeWidth="0.6"
                  paintOrder="stroke fill"
                >
                  +
                </text>
              </svg>
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute bottom-3 left-3 text-xs font-semibold tracking-[0.12em] text-slate-500">
                  Cautious
                </div>
                <div className="absolute bottom-3 right-3 text-xs font-semibold tracking-[0.12em] text-slate-500">
                  Bold
                </div>
                <div className="absolute left-3 top-3 -rotate-90 text-xs font-semibold tracking-[0.12em] text-slate-500">
                  Tight
                </div>
                <div className="absolute right-3 top-3 -rotate-90 text-xs font-semibold tracking-[0.12em] text-slate-500">
                  Loose
                </div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-semibold tracking-[0.12em] text-slate-500">
                  Risk appetite →
                </div>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-semibold tracking-[0.12em] text-slate-500">
                  Cash tightness ↑
                </div>
              </div>
              <Tooltip.Root>
                <Tooltip.Trigger
                  type="button"
                  aria-label={`Matrix position. Tightness ${assessment.scores.tightness}, risk appetite ${assessment.scores.riskAppetite}.`}
                  className="absolute flex min-h-[44px] min-w-[44px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                  style={{ left: `${matrixDotX}%`, top: `${matrixDotY}%` }}
                >
                  <span className="sr-only">Matrix position</span>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Positioner side="top" align="center" className="z-20">
                    <Tooltip.Popup className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 shadow-lg">
                      Tightness {assessment.scores.tightness} · Risk appetite{" "}
                      {assessment.scores.riskAppetite}
                      <Tooltip.Arrow className="h-2 w-2 rotate-45 border border-slate-700 bg-slate-950" />
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>
            <figcaption id="signal-matrix-description" className="text-xs text-slate-500">
              Position is derived from tightness (
              <span className="tabular-nums">{assessment.scores.tightness}</span>) and market risk
              appetite (<span className="tabular-nums">{assessment.scores.riskAppetite}</span>).
              Higher tightness means less cash availability; higher risk appetite means more
              willingness to fund growth.
            </figcaption>
          </figure>
          <div className="space-y-3">
            <div className="weather-surface p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Decision guide</p>
              <p className="mt-2 text-sm text-slate-200">
                Use the quadrant actions below to align staffing, budget approvals, and roadmap bets
                with the current macro posture.
              </p>
            </div>
            <div className="grid gap-3">
              {quadrants.map((quadrant) => (
                <div key={quadrant.id} className={`rounded-xl border p-4 ${quadrant.className}`}>
                  <p className="text-xs font-semibold tracking-[0.12em]">{quadrant.label}</p>
                  <p className="mt-2 text-sm text-slate-100">{quadrant.description}</p>
                  <p className="mt-3 text-xs text-slate-200">{quadrant.action}</p>
                </div>
              ))}
            </div>
          </div>
        </Collapsible.Panel>
      </Collapsible.Root>
    </section>
  );
};

export const HistoricalBanner = ({
  banner,
  liveHref,
}: {
  banner: string;
  liveHref?: string;
}) => {
  return (
    <div className="mt-6 rounded-2xl border border-slate-600 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="type-label text-slate-400">Historical mode</span>
        {liveHref ? (
          <a
            href={liveHref}
            className="inline-flex min-h-[32px] items-center rounded-full border border-slate-500/70 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-slate-100 transition hover:border-slate-300/80 hover:text-white"
          >
            Return to live
          </a>
        ) : null}
      </div>
      <p className="mt-1 font-semibold text-slate-100">{banner}</p>
      <p className="mt-2 text-xs text-slate-400">
        You are viewing archived Treasury data; live signals are temporarily hidden.
      </p>
    </div>
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
  const curveSlopePercent =
    curveSlope === null ? 50 : mapToPercent(curveSlope, -2, 2);
  const curveIndicator = clampToRange(curveSlopePercent, 0, 100);
  const curveIndicatorColor =
    curveSlope === null ? "#94a3b8" : curveSlope < 0 ? "#fb7185" : "#38bdf8";
  const curveMarkerId = "curve-marker";
  const isFallback = Boolean(treasury.fallback_at || treasury.fallback_reason);
  const fallbackReason = treasury.fallback_reason ?? "Fallback triggered.";
  const constraintHighlights = assessment.constraints.slice(0, 3);
  const hasDataWarnings = assessment.dataWarnings.length > 0;
  const tightnessThreshold = assessment.thresholds.tightnessRegime;
  const riskThreshold = assessment.thresholds.riskAppetiteRegime;
  const tightnessStatus =
    assessment.scores.tightness > tightnessThreshold ? "tightening" : "loosening";
  const riskStatus = assessment.scores.riskAppetite > riskThreshold ? "open" : "cautious";
  const curveRiskNote =
    curveSlope === null
      ? "Curve slope unavailable; avoid long-cycle bets without additional confirmation."
      : curveSlope < 0
        ? "Curve inverted; pressure-test long-horizon revenue bets and liquidity plans."
        : "Curve normal; maintain growth bets but validate payback windows.";
  const executionChecklist = [
    `Capital is ${tightnessStatus} (${assessment.scores.tightness}/100 vs ${tightnessThreshold}).`,
    `Risk appetite is ${riskStatus} (${assessment.scores.riskAppetite}/100 vs ${riskThreshold}).`,
    curveRiskNote,
  ];
  const confidenceLabel = isFallback || hasDataWarnings ? "Guarded" : "High";
  const confidenceTone =
    isFallback || hasDataWarnings
      ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
      : "border-emerald-400/40 bg-emerald-500/10 text-emerald-100";
  const confidenceDetail = isFallback
    ? "Live feed degraded; this report is running on cached Treasury data until the stream recovers."
    : hasDataWarnings
      ? "Some Treasury inputs are missing; treat this as directional guidance and tighten approval checks."
      : "Full Treasury coverage verified; signal quality is strong for this planning cycle.";
  const freshnessAction = isFallback
    ? "Action: keep decisions reversible and hold long-lock commitments until live signals return."
    : "Action: proceed with routine budget, hiring, and roadmap approvals using standard human review.";
  const scoringInputs = assessment.inputs;
  const scoringSource = scoringInputs[0]?.sourceLabel ?? "US Treasury";
  const scoringSourceUrl = scoringInputs[0]?.sourceUrl ?? treasury.source;

  return (
    <section
      id="executive-snapshot"
      aria-labelledby="executive-snapshot-title"
      className="mt-8 scroll-mb-24 pb-20 sm:pb-0"
    >
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="type-label text-slate-400">Executive snapshot</p>
            <h3 id="executive-snapshot-title" className="type-section text-slate-100">
              Operating directives
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              Execution directives that translate macro conditions into budget, hiring, and approval policy.
            </p>
          </div>
          <DataProvenanceStrip provenance={provenance} />
        </div>
        <div className="mt-5 weather-bento-grid">
          <div className="weather-tile col-span-1 sm:col-span-2 lg:col-span-2 lg:row-span-2 p-5 bg-gradient-to-br from-slate-950 via-slate-900/70 to-slate-950">
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
                        <p className="text-xs text-slate-400">
                          Confidence reflects data freshness and missing inputs, not forecast certainty.
                        </p>
                        <p className="text-xs text-slate-400">{freshnessAction}</p>
                        <Tooltip.Arrow className="h-2.5 w-2.5 rotate-45 border border-slate-800/80 bg-slate-950/95" />
                      </Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </div>
              <p className="mt-3 text-lg font-semibold text-slate-100">
                Set hard ROI gates before approving net-new spend, and sequence commitments by payback speed.
              </p>
              <p className="mt-2 text-sm text-slate-300">{assessment.description}</p>
              <p className="mt-2 text-xs text-slate-500">
                Regime posture blends cash tightness and market risk appetite from Treasury signals.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                    Tightness score
                  </p>
                  <p className="mono mt-2 text-lg text-slate-100">
                    {assessment.scores.tightness}/100
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Threshold {assessment.thresholds.tightnessRegime}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    0 = easy capital access, 100 = tightest funding conditions.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                    Risk appetite
                  </p>
                  <p className="mono mt-2 text-lg text-slate-100">
                    {assessment.scores.riskAppetite}/100
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Threshold {assessment.thresholds.riskAppetiteRegime}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    0 = risk-off, 100 = markets most willing to fund growth bets.
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-400">
                Constraints tracked:{" "}
                <span className="mono text-slate-100">{assessment.constraints.length}</span>
              </p>
            </div>
          <div className="weather-tile p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
              Rate baseline
            </p>
            <p className="mono mt-2 text-sm text-slate-100">
              {formatNumber(assessment.scores.baseRate, "%")}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Using {assessment.scores.baseRateUsed} for policy anchor
            </p>
            <p className="mt-2 text-xs text-slate-300">
              Macro check: higher rates usually mean capital is pickier about ROI.
            </p>
          </div>
          <div className="weather-tile p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Yield curve</p>
            <div className="mt-3 space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">US 10Y</span>
                <span className="mono text-slate-100">
                  {formatNumber(treasury.yields.tenYear, "%")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">US 2Y</span>
                <span className="mono text-slate-100">
                  {formatNumber(treasury.yields.twoYear, "%")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Curve slope</span>
                <span className="mono text-slate-100">
                  {curveSlope === null ? "—" : formatNumber(curveSlope, "%")}
                </span>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Curve slope = 10Y minus 2Y; negative values indicate inversion risk.
            </p>
            <p className="mt-3 text-xs text-slate-300">
              Macro check: inversion favors shorter-cycle bets and tighter hiring.
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
              <div className="mt-2 flex items-center justify-between text-xs font-semibold tracking-[0.12em] text-slate-500">
                <span>-2%</span>
                <span>0%</span>
                <span>+2%</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Slope is {curveLabel}</p>
          </div>
          <div className="weather-tile p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
              Data freshness
            </p>
            <p className="mono mt-2 text-sm text-slate-100">
              <time dateTime={treasury.record_date}>{treasury.record_date}</time>
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Fetched{" "}
              <time dateTime={treasury.fetched_at}>
                {formatTimestampUTC(treasury.fetched_at)}
              </time>
            </p>
            <p className="mt-3 text-xs text-slate-400">{freshnessAction}</p>
            <p className="mt-2 text-xs text-slate-300">
              Macro check: stale data can make strategy advice look stricter than it is.
            </p>
            {isFallback ? (
              <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/10 p-2 text-xs text-amber-100">
                <p className="text-xs font-semibold tracking-[0.12em] text-amber-200">
                  Cached fallback
                </p>
                <p className="mt-2 text-amber-100">{fallbackReason}</p>
                <p className="mt-2 text-amber-200/80">
                  Snapshot fetched:{" "}
                  <span className="mono">
                    <time dateTime={treasury.fetched_at}>
                      {formatTimestampUTC(treasury.fetched_at)}
                    </time>
                  </span>
                </p>
                <p className="text-amber-200/80">
                  Fallback activated:{" "}
                  <span className="mono">
                    {treasury.fallback_at ? (
                      <time dateTime={treasury.fallback_at}>
                        {formatTimestampUTC(treasury.fallback_at)}
                      </time>
                    ) : (
                      "Unknown"
                    )}
                  </span>
                </p>
              </div>
            ) : null}
          </div>
          <div className="weather-tile min-[420px]:col-span-2 lg:col-span-2 xl:col-span-2 p-4">
            <Collapsible.Root className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  Scoring inputs
                </p>
                <Collapsible.Trigger
                  type="button"
                  className="inline-flex min-h-[44px] items-center rounded-full border border-slate-700/70 bg-slate-950/60 px-3 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-slate-500/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                >
                  View {scoringInputs.length} inputs
                </Collapsible.Trigger>
              </div>
              <p className="text-xs text-slate-500">
                Source:{" "}
                <a
                  href={scoringSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="touch-target inline-flex min-h-[44px] items-center text-xs text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-slate-100 touch-manipulation"
                >
                  {scoringSource}
                </a>{" "}
                · Record{" "}
                <time dateTime={treasury.record_date} className="mono text-slate-100">
                  {treasury.record_date}
                </time>{" "}
                · Fetched{" "}
                <time dateTime={treasury.fetched_at} className="mono text-slate-100">
                  {formatTimestampUTC(treasury.fetched_at)}
                </time>
              </p>
              <Collapsible.Panel className="space-y-2 text-xs text-slate-300">
                <ul className="space-y-2">
                  {scoringInputs.map((input) => (
                    <li key={input.id} className="flex items-start justify-between gap-3">
                      <span className="text-slate-400">{input.label}</span>
                      <span className="mono text-slate-100">
                        {input.value === null ? "—" : formatNumber(input.value, input.unit)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Collapsible.Panel>
            </Collapsible.Root>
          </div>
          <div className="weather-tile min-[420px]:col-span-2 xl:col-span-2 p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
              So what (1 minute)
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Quick actions for teams without macro context.
            </p>
            <ul className="mt-3 space-y-2 text-xs text-slate-300">
              <li className="flex gap-2">
                <span className="text-slate-500">•</span>
                <span className="break-words">
                  {tightnessStatus === "tightening"
                    ? "Freeze non-essential hires unless payback is under 6 months."
                    : "Keep growth hires but require clear ROI and runway checks."}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-slate-500">•</span>
                <span className="break-words">
                  {riskStatus === "cautious"
                    ? "Prioritize reliability and retention over risky launches."
                    : "Greenlight measured growth bets with clear guardrails."}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-slate-500">•</span>
                <span className="break-words">{curveRiskNote}</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="weather-tile p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
              Executive constraints
            </p>
            <p className="mt-3 text-sm text-slate-200">
              Translate Treasury signals into immediate operating guardrails for the next planning
              cycle.
            </p>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              {constraintHighlights.map((constraint) => (
                <li key={constraint} className="flex gap-2">
                  <span className="text-slate-500">•</span>
                  <span className="break-words">{constraint}</span>
                </li>
              ))}
            </ul>
            <a
              href="#regime-assessment"
              className="mt-4 inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.12em] text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-slate-100 touch-manipulation"
            >
              Review full constraint set
            </a>
          </div>
          <div className="weather-tile p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Signal confidence</p>
            <p className="mt-3 text-sm text-slate-300">{confidenceDetail}</p>
            <p className="mt-2 text-xs text-slate-500">
              Confidence is derived from data freshness and missing input checks, not forecasting
              precision.
            </p>
            {hasDataWarnings ? (
              <ul className="mt-4 space-y-2 text-xs text-amber-100">
                {assessment.dataWarnings.map((warning) => (
                  <li key={warning} className="flex gap-2">
                    <span className="text-amber-200/70">•</span>
                    <span className="break-words">{warning}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="weather-tile p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
              Execution points
            </p>
            <p className="mt-3 text-sm text-slate-200">
              Reference points for next-week planning and leadership updates.
            </p>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              {executionChecklist.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-slate-500">•</span>
                  <span className="break-words">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="weather-tile p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Quick actions</p>
            <p className="mt-3 text-sm text-slate-200">
              Pull the full signal detail or export constraints directly into your operations brief.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/signals#thresholds"
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
              >
                Review thresholds
              </a>
              <a
                href="/operations/briefings#ops-export-briefs"
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
              >
                Export brief
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const RegimeSummaryPanel = ({
  assessment,
  provenance,
}: {
  assessment: RegimeAssessment;
  provenance: DataProvenance;
}) => {
  const regimeLabel = getRegimeLabel(assessment.regime);
  const regimeBadge = getRegimeBadge(assessment.regime);
  const tightnessStatus =
    assessment.scores.tightness > assessment.thresholds.tightnessRegime ? "tight" : "loose";
  const riskStatus =
    assessment.scores.riskAppetite > assessment.thresholds.riskAppetiteRegime
      ? "open"
      : "cautious";
  const narrative = `Cash availability is ${tightnessStatus} and risk appetite is ${riskStatus}. ${assessment.description}`;
  const constraintHighlights = assessment.constraints.slice(0, 3);

  return (
    <section id="regime-summary" aria-labelledby="regime-summary-title" className="mt-10">
      <div className="weather-panel p-6">
        <div>
          <p className="type-label text-slate-400">Market climate summary</p>
          <h3 id="regime-summary-title" className="type-section text-slate-100">
            Plain-English market readout
          </h3>
          <p className="mt-2 type-data text-slate-300">
            A direct interpretation of Treasury signals into the posture you should operate under
            this week.
          </p>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-4">
            <div className="weather-surface bg-gradient-to-br from-slate-950 via-slate-900/80 to-slate-950 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span
                  className={`inline-flex min-h-[44px] items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.12em] ${
                    regimeBadge?.classes ?? "border-slate-600/60 bg-slate-500/10 text-slate-100"
                  }`}
                >
                  {regimeBadge?.label ?? assessment.regime}
                </span>
                <DataProvenanceStrip provenance={provenance} label="Treasury source" />
              </div>
              <p className="mt-3 text-sm text-slate-200">{narrative}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                    Cash availability
                  </p>
                  <p className="mono mt-2 text-lg text-slate-100">
                    {assessment.scores.tightness}/100
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Threshold {assessment.thresholds.tightnessRegime}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                    Risk appetite
                  </p>
                  <p className="mono mt-2 text-lg text-slate-100">
                    {assessment.scores.riskAppetite}/100
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Threshold {assessment.thresholds.riskAppetiteRegime}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-400">
                Regime label: <span className="text-slate-200">{regimeLabel}</span>
              </p>
            </div>
            <div className="weather-surface p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Operational consequences
              </p>
              <p className="mt-3 text-sm text-slate-200">
                Use these guardrails to align product, engineering, and GTM planning.
              </p>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                {assessment.constraints.map((constraint) => (
                  <li key={constraint} className="flex gap-2">
                    <span className="text-slate-500">•</span>
                    <span className="break-words">{constraint}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="space-y-4">
            <div className="weather-surface p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Regime highlights
              </p>
              <p className="mt-3 text-sm text-slate-200">
                This regime is defined by the tightness and risk scores above. Use these highlights
                to anchor leadership conversations.
              </p>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                {constraintHighlights.map((constraint) => (
                  <li key={constraint} className="flex gap-2">
                    <span className="text-slate-500">•</span>
                    <span className="break-words">{constraint}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="weather-surface p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Decision signals
              </p>
              <p className="mt-3 text-sm text-slate-200">
                Translate the scores into how you run next-week approvals.
              </p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                    Funding posture
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {tightnessStatus === "tight"
                      ? "Cap spend increases; require hard ROI evidence on any new headcount."
                      : "Keep growth spend, but insist on payback clarity and runway updates."}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                    Risk posture
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {riskStatus === "open"
                      ? "Greenlight growth experiments with guardrails and explicit exit points."
                      : "Favor reliability bets and retention improvements over new launches."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

type RegimeAlert = {
  changed: boolean;
  currentRegime: RegimeAssessment["regime"];
  previousRegime: RegimeAssessment["regime"];
  currentRecordDate: string;
  previousRecordDate: string;
  reasons: string[];
  summary: string;
};

export const RegimeChangeAlertPanel = ({
  alert,
  provenance,
}: {
  alert: RegimeAlert | null;
  provenance: DataProvenance;
}) => {
  const statusLabel = alert ? (alert.changed ? "Changed" : "Threshold crossed") : "Quiet";
  const statusTone = alert
    ? alert.changed
      ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
      : "border-amber-500/40 bg-amber-500/10 text-amber-100"
    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100";

  return (
    <section id="regime-alerts" aria-labelledby="regime-alerts-title" className="mt-10">
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Market climate change alerts</p>
            <h3 id="regime-alerts-title" className="type-section text-slate-100">
              Alert preview and response plan
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Monitor climate shifts with a clear before/after snapshot, reason codes, and the next
              action to take.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <span
              className={`weather-pill inline-flex min-h-[44px] items-center px-3 py-1 text-xs font-semibold tracking-[0.12em] ${statusTone}`}
            >
              {statusLabel}
            </span>
            <DataProvenanceStrip provenance={provenance} />
          </div>
        </div>
        {alert ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
            <div className="space-y-4">
              <div className="weather-surface p-4">
                <p className="type-label text-slate-400">Latest alert</p>
                <p className="mt-3 text-sm text-slate-100">{alert.summary}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3">
                    <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                      Previous record
                    </p>
                    <p className="mt-2 text-xs text-slate-200">
                      <time dateTime={alert.previousRecordDate}>
                        {formatDateUTC(alert.previousRecordDate)}
                      </time>
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Regime: <span className="text-slate-200">{alert.previousRegime}</span>
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3">
                    <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                      Current record
                    </p>
                    <p className="mt-2 text-xs text-slate-200">
                      <time dateTime={alert.currentRecordDate}>
                        {formatDateUTC(alert.currentRecordDate)}
                      </time>
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Regime: <span className="text-slate-200">{alert.currentRegime}</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="weather-surface p-4">
                <p className="type-label text-slate-400">Reason codes</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {alert.reasons.map((reason) => (
                    <li key={reason} className="flex gap-2">
                      <span className="text-slate-500">•</span>
                      <span className="break-words">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="space-y-4">
              <div className="weather-surface p-4">
                <p className="type-label text-slate-400">Next actions</p>
                <p className="mt-3 text-sm text-slate-300">
                  Use the Time Machine to replay the prior month and share the shift in your
                  planning review.
                </p>
                <ul className="mt-4 space-y-2 text-xs text-slate-400">
                  <li className="flex gap-2">
                    <span className="text-slate-500">•</span>
                    <span>Re-confirm approvals tied to long payback bets.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-slate-500">•</span>
                    <span>Update leadership briefs before the next planning sync.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-slate-500">•</span>
                    <span>Document the change in the operations log.</span>
                  </li>
                </ul>
                <a
                  href="/signals#time-machine"
                  className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-sky-500/40 bg-slate-950/70 px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
                >
                  Open Time Machine
                </a>
              </div>
              <div className="weather-surface p-4">
                <p className="type-label text-slate-400">Alert discipline</p>
                <p className="mt-2 text-sm text-slate-200">
                  Alerts fire only on regime shifts or threshold crossings to avoid noise.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Use this section to confirm the new posture before you move backlog approvals.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="weather-surface p-4">
              <p className="type-label text-slate-400">No alert</p>
              <p className="mt-3 text-sm text-slate-300">
                There is no active change alert. Alerts only fire when the regime changes or
                tightness / risk appetite cross a threshold.
              </p>
              <p className="mt-3 text-xs text-slate-500">
                Stay focused on weekly execution until the next signal shift is confirmed.
              </p>
            </div>
            <div className="weather-surface p-4">
              <p className="type-label text-slate-400">What would trigger an alert?</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li className="flex gap-2">
                  <span className="text-slate-500">•</span>
                  <span>Regime flips between Survival, Safety, Stability, and Growth.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-slate-500">•</span>
                  <span>Tightness or risk appetite crosses the configured threshold.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-slate-500">•</span>
                  <span>Material data quality flags force a posture review.</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export const SensorArray = ({
  sensors,
  provenance,
}: {
  sensors: SensorReading[];
  provenance: DataProvenance;
}) => {
  const [selectedWindow, setSelectedWindow] = useState<SensorTimeWindow>("3M");

  const availableWindows = useMemo(() => {
    const windowSet = new Set<SensorTimeWindow>();
    sensors.forEach((sensor) => {
      sensor.availableTimeWindows?.forEach((window) => windowSet.add(window));
    });
    if (windowSet.size === 0) {
      return sensorTimeWindows;
    }
    return sensorTimeWindows.filter((window) => windowSet.has(window.id));
  }, [sensors]);

  useEffect(() => {
    if (!availableWindows.find((window) => window.id === selectedWindow)) {
      setSelectedWindow(availableWindows[0]?.id ?? "3M");
    }
  }, [availableWindows, selectedWindow]);

  const activeWindow =
    availableWindows.find((window) => window.id === selectedWindow) ?? availableWindows[0];
  const mostChanged = useMemo(() => {
    const candidates = sensors.flatMap((sensor) => {
      const aggregation = getSensorWindowAggregation(sensor, selectedWindow);
      const change = aggregation?.change;
      return typeof change === "number" ? [{ sensor, aggregation, change }] : [];
    });

    if (!candidates.length) {
      return null;
    }

    return candidates.reduce((best, entry) =>
      Math.abs(entry.change) > Math.abs(best.change) ? entry : best
    );
  }, [sensors, selectedWindow]);

  return (
    <section id="sensor-array" aria-labelledby="sensor-array-title" className="mt-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 id="sensor-array-title" className="type-label text-slate-400">
          Live Sensor Array
        </h3>
        <DataProvenanceStrip provenance={provenance} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="weather-panel p-6">
          <p className="type-label text-slate-400">Primary market pulse</p>
          <h4 className="mt-2 text-lg font-semibold text-slate-100">Signal spotlight</h4>
          <p className="mt-2 text-sm text-slate-300">
            Tracking {sensors.length} signal{sensors.length === 1 ? "" : "s"}.
          </p>
          {mostChanged ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-[1.1fr,0.9fr]">
              <div>
                <p className="text-sm text-slate-300">{mostChanged.sensor.label}</p>
                <p className="mono mt-2 text-3xl text-slate-100">
                  {formatDelta(mostChanged.change ?? null, mostChanged.sensor.unit)}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {activeWindow.label} change · Current{" "}
                  <span className="text-slate-300">
                    {formatNumber(mostChanged.sensor.value, mostChanged.sensor.unit)}
                  </span>{" "}
                  · Prior{" "}
                  <span className="text-slate-300">
                    {formatNumber(
                      mostChanged.aggregation?.previousValue ?? null,
                      mostChanged.sensor.unit
                    )}
                  </span>
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/70 p-4 text-xs text-slate-400">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Leading group
                </p>
                <p className="mt-2 text-sm text-slate-200">{mostChanged.sensor.group.label}</p>
                <p className="mt-2 text-slate-500">{mostChanged.sensor.group.description}</p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No measurable change in this window.</p>
          )}
        </div>
        <div className="weather-panel p-5">
          <p className="type-label text-slate-400">Window</p>
          <ToggleGroup
            value={[selectedWindow]}
            onValueChange={(value) => {
              const nextValue = value[0] as SensorTimeWindow | undefined;
              if (nextValue) {
                setSelectedWindow(nextValue);
              }
            }}
            className="mt-3 flex flex-wrap gap-2"
          >
            {availableWindows.map((window) => (
              <Toggle
                key={window.id}
                value={window.id}
                className="min-h-[44px] rounded-full border border-slate-800/70 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300 transition-colors data-[pressed]:border-sky-400/70 data-[pressed]:bg-sky-500/15 data-[pressed]:text-slate-100 touch-manipulation"
              >
                {window.label}
              </Toggle>
            ))}
          </ToggleGroup>
          {activeWindow ? <p className="mt-3 text-xs text-slate-500">{activeWindow.description}</p> : null}
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {sensors.map((sensor) => {
          const hasTrend = Boolean(sensor.trend?.length);
          const sparkline = buildSparkline(hasTrend ? sensor.trend : sensor.history);
          const sparklineId = `sensor-spark-${sensor.id}`;
          const windowAggregation = getSensorWindowAggregation(sensor, selectedWindow);

          return (
            <div key={sensor.id} className="weather-panel rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="break-words text-sm text-slate-300">{sensor.label}</p>
                  <p className="mono mt-2 text-2xl text-slate-100">
                    {formatNumber(sensor.value, sensor.unit)}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Δ {activeWindow.label}{" "}
                    <span className="text-slate-300">
                      {formatDelta(windowAggregation?.change ?? null, sensor.unit)}
                    </span>
                  </p>
                </div>
                <span className="weather-pill px-2 py-1 text-xs font-semibold tracking-[0.12em] text-slate-400">
                  {provenance.statusLabel}
                </span>
              </div>
              <figure className="mt-3">
                {sparkline ? (
                  <svg
                    viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
                    className="h-8 w-full"
                    aria-hidden="true"
                    focusable="false"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id={sparklineId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(56,189,248,0.35)" />
                        <stop offset="100%" stopColor="rgba(56,189,248,0)" />
                      </linearGradient>
                    </defs>
                    <path d={sparkline.area} fill={`url(#${sparklineId})`} pathLength={100} />
                    <path
                      d={sparkline.path}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      vectorEffect="non-scaling-stroke"
                      pathLength={100}
                    />
                  </svg>
                ) : (
                  <div
                    className="h-8 rounded-md border border-sky-900/40 bg-slate-950/80"
                    aria-hidden="true"
                  />
                )}
                <figcaption className="mt-3 space-y-2 text-xs text-slate-400">
                  {hasTrend ? (
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      12-month trend (cache)
                    </p>
                  ) : null}
                  <p className="break-words">{sensor.explanation}</p>
                </figcaption>
              </figure>
              <div className="mt-4 text-xs text-slate-500">
                <p>
                  Formula:{" "}
                  <a
                    href={sensor.formulaUrl}
                    className="touch-target text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-slate-100"
                  >
                    Method notes
                  </a>
                </p>
                <div className="mt-3">
                  <SeriesFreshnessBadge
                    sourceLabel={sensor.sourceLabel}
                    sourceUrl={sensor.sourceUrl}
                    recordDate={sensor.record_date}
                    fetchedAt={sensor.fetched_at}
                    isLive={sensor.isLive}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};


export const MacroSignalsPanel = ({
  series,
  provenance,
}: {
  series: MacroSeriesReading[];
  provenance: DataProvenance;
}) => {
  const prioritizedSeries = useMemo(() => rankMacroSignalsByPriority(series), [series]);

  return (
    <section id="macro-signals" aria-labelledby="macro-signals-title" className="mt-10">
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Macro signals</p>
            <h3 id="macro-signals-title" className="type-section text-slate-100">
              Expanded signal pack
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Supplement Treasury yields with inflation, labor health, and credit stress indicators.
            </p>
          </div>
        <div className="flex flex-col items-end gap-2">
          <span className="weather-pill px-3 py-1 text-xs font-semibold tracking-[0.12em] text-slate-300">
            {provenance.statusLabel}
          </span>
          <DataProvenanceStrip provenance={provenance} />
        </div>
      </div>
      <div className="mt-4 weather-surface p-4">
        <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Executive summary</p>
        <p className="mt-2 text-sm text-slate-200">
          Use this expanded pack to validate the Treasury-led climate call against inflation,
          labor, and credit stress signals.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Cards are ranked by action impact × recency so the first scan surfaces the most urgent
          checks.
        </p>
      </div>
      <Collapsible.Root className="mt-4">
        <Collapsible.Trigger
          type="button"
          className="group flex min-h-[44px] w-full items-center justify-between gap-3 text-left text-xs font-semibold tracking-[0.12em] text-slate-300 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
        >
          <span>Deep dive: signal cards and freshness checks</span>
          <span className="inline-flex min-h-[44px] items-center rounded-full border border-slate-700/80 px-3 text-[0.65rem] font-semibold tracking-[0.14em] text-slate-200">
            <span className="group-data-[panel-open]:hidden">Expand section</span>
            <span className="hidden group-data-[panel-open]:inline">Collapse section</span>
          </span>
        </Collapsible.Trigger>
        <Collapsible.Panel className="mt-4 grid gap-4 md:grid-cols-3">
          {prioritizedSeries.map((signal, index) => {
            const sparkline = buildSparkline(signal.history);
            const sparklineId = `macro-spark-${signal.id}`;
            const priority = buildMacroPriorityScore(signal);

            return (
              <div key={signal.id} className="weather-surface rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                    {signal.label}
                  </p>
                  <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-2 py-1 text-[10px] font-semibold tracking-[0.14em] text-sky-100">
                    Priority #{index + 1}
                  </span>
                </div>
                <p className="mono mt-3 text-2xl text-slate-100">
                  {formatNumber(signal.value, signal.unit)}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Impact {Math.round(priority.impact * 100)} · Recency {Math.round(priority.recency * 100)}
                </p>
                <figure className="mt-3">
                  {sparkline ? (
                    <svg
                      viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
                      className="h-8 w-full"
                      aria-hidden="true"
                      focusable="false"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id={sparklineId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(251,191,36,0.3)" />
                          <stop offset="100%" stopColor="rgba(251,191,36,0)" />
                        </linearGradient>
                      </defs>
                      <path d={sparkline.area} fill={`url(#${sparklineId})`} pathLength={100} />
                      <path
                        d={sparkline.path}
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                        pathLength={100}
                      />
                    </svg>
                  ) : (
                    <div
                      className="h-8 rounded-md border border-sky-900/40 bg-slate-950/80"
                      aria-hidden="true"
                    />
                  )}
                  <figcaption className="mt-2 text-xs text-slate-500">
                    {signal.explanation}
                  </figcaption>
                </figure>
                <div className="mt-3 text-xs text-slate-500">
                  <p>
                    Formula:{" "}
                    <a
                      href={signal.formulaUrl}
                      className="touch-target text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-slate-100"
                    >
                      Method notes
                    </a>
                  </p>
                  <div className="mt-3">
                    <SeriesFreshnessBadge
                      sourceLabel={signal.sourceLabel}
                      sourceUrl={signal.sourceUrl}
                      recordDate={signal.record_date}
                      fetchedAt={signal.fetched_at}
                      isLive={signal.isLive}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </Collapsible.Panel>
      </Collapsible.Root>
      </div>
    </section>
  );
};

export const PlaybookPanel = ({
  playbook,
  stopItems,
  startItems,
  fenceItems,
  provenance,
}: {
  playbook: PlaybookEntry | null;
  stopItems: string[];
  startItems: string[];
  fenceItems: string[];
  provenance: DataProvenance;
}) => {
  const playbookQuickLinks = [
    { href: "/operations#ops-decision-shield", label: "Decision shield" },
    { href: "/operations#ops-strategy-brief", label: "Strategy brief" },
    { href: "/operations/briefings#ops-export-briefs", label: "Export briefs" },
  ];

  return (
    <section id="playbook" aria-labelledby="playbook-title" className="mt-10">
      <div className="weather-panel p-6">
        <div>
          <p className="type-label text-slate-400">Playbook</p>
          <h3 id="playbook-title" className="type-section text-slate-100">
            {playbook?.title ?? "Operational Guidance"}
          </h3>
        </div>
        <div className="mt-4 weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Executive summary</p>
          <p className="mt-2 text-sm text-slate-200">
            {playbook
              ? playbook.insight
              : "Playbook data unavailable. Use climate constraints as guardrails."}
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Align the team on what to stop, start, and fence before approvals move forward.
          </p>
        </div>
        <Collapsible.Root className="mt-4">
          <Collapsible.Trigger
            type="button"
            className="group flex min-h-[44px] w-full items-center justify-between gap-3 text-left text-xs font-semibold tracking-[0.12em] text-slate-300 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            <span>Deep dive: playbook snapshot and action lanes</span>
            <span className="inline-flex min-h-[44px] items-center rounded-full border border-slate-700/80 px-3 text-[0.65rem] font-semibold tracking-[0.14em] text-slate-200">
              <span className="group-data-[panel-open]:hidden">Expand section</span>
              <span className="hidden group-data-[panel-open]:inline">Collapse section</span>
            </span>
          </Collapsible.Trigger>
          <Collapsible.Panel className="mt-4 space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.25fr,0.75fr]">
              <div className="grid gap-4 lg:grid-cols-3 lg:col-span-2">
                <div className="weather-surface border-l-4 border-rose-500/50 p-4">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Stop</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {stopItems.map((item) => (
                      <li key={item} className="break-words">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="weather-surface border-l-4 border-emerald-400/50 p-4">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Start</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {startItems.map((item) => (
                      <li key={item} className="break-words">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="weather-surface border-l-4 border-sky-400/50 p-4">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Fence</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {fenceItems.map((item) => (
                      <li key={item} className="break-words">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="grid gap-3">
                <div className="weather-surface p-4">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                    Playbook snapshot
                  </p>
                  {playbook ? (
                    <div className="mt-3 space-y-2 text-xs text-slate-300">
                      <p className="font-semibold text-slate-200">{playbook.tone}</p>
                      <p>Mandate: {playbook.mandate}</p>
                      <p className="text-slate-400">Metric: {playbook.metric}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">
                      Playbook signals will return once Treasury data is refreshed.
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {playbookQuickLinks.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        className="weather-pill inline-flex min-h-[44px] items-center px-4 py-2 text-[0.6rem] font-semibold tracking-[0.18em] text-slate-300 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
                <DataProvenanceStrip provenance={provenance} />
              </div>
            </div>
            {playbook ? (
              <div className="weather-surface p-4">
                <Collapsible.Root defaultOpen>
                  <Collapsible.Trigger
                    type="button"
                    className="min-h-[44px] text-xs font-semibold tracking-[0.12em] text-slate-400 transition-colors hover:text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 touch-manipulation"
                  >
                    Leadership signals (phrases to use or avoid)
                  </Collapsible.Trigger>
                  <Collapsible.Panel className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.12em] text-emerald-200">
                        More often
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-slate-300">
                        {playbook.leadershipPhrases.more.map((item) => (
                          <li key={item} className="break-words">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold tracking-[0.12em] text-rose-200">
                        Less often
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-slate-300">
                        {playbook.leadershipPhrases.less.map((item) => (
                          <li key={item} className="break-words">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Collapsible.Panel>
                </Collapsible.Root>
              </div>
            ) : null}
          </Collapsible.Panel>
        </Collapsible.Root>
      </div>
    </section>
  );
};

export const InsightDatabasePanel = ({
  regime,
  provenance,
}: {
  regime: RegimeAssessment["regime"];
  provenance: DataProvenance;
}) => {
  type EvidenceLibraryItem = Omit<
    (typeof insightDatabase.regimeEvidence.regimes)[number]["citations"][number],
    "tags"
  > & {
    climate: string;
    summary: string;
    id: string;
    tags: readonly string[];
  };
  const evidence = insightDatabase.regimeEvidence.regimes.find((entry) => entry.key === regime);
  const fossilRecord = insightDatabase.fossilRecord;
  const evidenceLibrary = useMemo<EvidenceLibraryItem[]>(
    () =>
      insightDatabase.regimeEvidence.regimes.flatMap((entry) =>
        entry.citations.map((citation, index) => {
          const climate = citation.climate ?? entry.key;
          return {
            ...citation,
            climate,
            summary: entry.summary,
            id: `${climate}-${index}-${citation.url}`,
            tags: citation.tags,
          };
        })
      ),
    []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClimate, setSelectedClimate] = useState("all");
  const [selectedSignal, setSelectedSignal] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const climateOptions = useMemo(
    () =>
      Array.from(new Set(evidenceLibrary.map((item) => item.climate))).sort(
        (first, second) =>
          CLIMATE_ORDER.indexOf(first) - CLIMATE_ORDER.indexOf(second)
      ),
    [evidenceLibrary]
  );
  const signalOptions = useMemo(
    () => Array.from(new Set(evidenceLibrary.map((item) => item.signal))).sort(),
    [evidenceLibrary]
  );
  const tagOptions = useMemo(
    () => Array.from(new Set(evidenceLibrary.flatMap((item) => item.tags))).sort(),
    [evidenceLibrary]
  );
  const filteredEvidence = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const startTime = dateRange.start ? Date.parse(dateRange.start) : null;
    const endTime = dateRange.end ? Date.parse(dateRange.end) : null;

    return evidenceLibrary.filter((item) => {
      if (selectedClimate !== "all" && item.climate !== selectedClimate) {
        return false;
      }
      if (selectedSignal !== "all" && item.signal !== selectedSignal) {
        return false;
      }
      if (selectedTags.length > 0 && !selectedTags.some((tag) => item.tags.includes(tag))) {
        return false;
      }
      if (normalizedQuery) {
        const haystack = [
          item.title,
          item.source,
          item.signal,
          item.summary,
          item.recommendation?.label,
          ...item.tags,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(normalizedQuery)) {
          return false;
        }
      }
      if (startTime || endTime) {
        const itemTime = Date.parse(item.date);
        if (!Number.isNaN(itemTime)) {
          if (startTime && itemTime < startTime) {
            return false;
          }
          if (endTime && itemTime > endTime) {
            return false;
          }
        }
      }
      return true;
    });
  }, [
    dateRange.end,
    dateRange.start,
    evidenceLibrary,
    searchQuery,
    selectedClimate,
    selectedSignal,
    selectedTags,
  ]);
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((entry) => entry !== tag) : [...prev, tag]
    );
  };
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedClimate("all");
    setSelectedSignal("all");
    setDateRange({ start: "", end: "" });
    setSelectedTags([]);
  };
  return (
    <section id="insight-database" aria-labelledby="insight-database-title" className="mt-10">
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Insight database</p>
            <h3 id="insight-database-title" className="type-section text-slate-100">
              Evidence-backed climate rationale
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Attach cited macro evidence and historical patterns to explain the current posture.
            </p>
          </div>
          <DataProvenanceStrip provenance={provenance} />
        </div>
        <div className="mt-4 weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Executive summary</p>
          <p className="mt-2 text-sm text-slate-200">
            {evidence?.summary ?? "No evidence summary available for this climate."}
          </p>
        </div>
        <Collapsible.Root className="mt-4">
          <Collapsible.Trigger
            type="button"
            className="group flex min-h-[44px] w-full items-center justify-between gap-3 text-left text-xs font-semibold tracking-[0.12em] text-slate-300 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            <span>Deep dive: searchable evidence library</span>
            <span className="inline-flex min-h-[44px] items-center rounded-full border border-slate-700/80 px-3 text-[0.65rem] font-semibold tracking-[0.14em] text-slate-200">
              <span className="group-data-[panel-open]:hidden">Expand section</span>
              <span className="hidden group-data-[panel-open]:inline">Collapse section</span>
            </span>
          </Collapsible.Trigger>
          <Collapsible.Panel className="mt-4 space-y-4">
            <div className="weather-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  Filter evidence
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold tracking-[0.12em] text-slate-300 underline decoration-slate-500 underline-offset-4 transition-opacity hover:text-slate-100"
                >
                  Clear filters
                </button>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field.Root className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  <Field.Label>Search</Field.Label>
                  <Input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by source, tag, or recommendation"
                    className="mt-2 w-full rounded-lg border border-slate-800/70 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
                  />
                </Field.Root>
                <Field.Root className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  <Field.Label id="evidence-climate-label" nativeLabel={false}>
                    Climate
                  </Field.Label>
                  <Select.Root
                    value={selectedClimate}
                    onValueChange={(value) => setSelectedClimate(value as string)}
                  >
                    <Select.Trigger
                      aria-labelledby="evidence-climate-label"
                      className="mt-2 flex min-h-[44px] w-full items-center justify-between rounded-lg border border-slate-800/70 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    >
                      <Select.Value placeholder="All climates" />
                      <Select.Icon className="text-slate-400">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                          <path
                            d="M7 10l5 5 5-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Positioner side="bottom" align="start" sideOffset={8}>
                        <Select.Popup className="min-w-[220px] rounded-xl border border-slate-800/80 bg-slate-950/95 p-1 text-sm text-slate-100 shadow-xl">
                          <Select.List className="max-h-64 overflow-y-auto">
                            <Select.Item
                              value="all"
                              className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition-colors data-[highlighted]:bg-slate-800/70 data-[selected]:text-sky-200"
                            >
                              <Select.ItemText>All climates</Select.ItemText>
                            </Select.Item>
                            {climateOptions.map((option) => (
                              <Select.Item
                                key={option}
                                value={option}
                                className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition-colors data-[highlighted]:bg-slate-800/70 data-[selected]:text-sky-200"
                              >
                                <Select.ItemText>
                                  {getRegimeLabel(option as RegimeAssessment["regime"])}
                                </Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.List>
                        </Select.Popup>
                      </Select.Positioner>
                    </Select.Portal>
                  </Select.Root>
                </Field.Root>
                <Field.Root className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  <Field.Label id="evidence-signal-label" nativeLabel={false}>
                    Signal
                  </Field.Label>
                  <Select.Root
                    value={selectedSignal}
                    onValueChange={(value) => setSelectedSignal(value as string)}
                  >
                    <Select.Trigger
                      aria-labelledby="evidence-signal-label"
                      className="mt-2 flex min-h-[44px] w-full items-center justify-between rounded-lg border border-slate-800/70 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    >
                      <Select.Value placeholder="All signals" />
                      <Select.Icon className="text-slate-400">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                          <path
                            d="M7 10l5 5 5-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Positioner side="bottom" align="start" sideOffset={8}>
                        <Select.Popup className="min-w-[220px] rounded-xl border border-slate-800/80 bg-slate-950/95 p-1 text-sm text-slate-100 shadow-xl">
                          <Select.List className="max-h-64 overflow-y-auto">
                            <Select.Item
                              value="all"
                              className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition-colors data-[highlighted]:bg-slate-800/70 data-[selected]:text-sky-200"
                            >
                              <Select.ItemText>All signals</Select.ItemText>
                            </Select.Item>
                            {signalOptions.map((option) => (
                              <Select.Item
                                key={option}
                                value={option}
                                className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition-colors data-[highlighted]:bg-slate-800/70 data-[selected]:text-sky-200"
                              >
                                <Select.ItemText>{option}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.List>
                        </Select.Popup>
                      </Select.Positioner>
                    </Select.Portal>
                  </Select.Root>
                </Field.Root>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field.Root className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                    <Field.Label>Start date</Field.Label>
                    <Input
                      type="date"
                      value={dateRange.start}
                      aria-describedby="evidence-date-hint"
                      onChange={(event) =>
                        setDateRange((prev) => ({ ...prev, start: event.target.value }))
                      }
                      className="mt-2 w-full rounded-lg border border-slate-800/70 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    />
                  </Field.Root>
                  <Field.Root className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                    <Field.Label>End date</Field.Label>
                    <Input
                      type="date"
                      value={dateRange.end}
                      aria-describedby="evidence-date-hint"
                      onChange={(event) =>
                        setDateRange((prev) => ({ ...prev, end: event.target.value }))
                      }
                      className="mt-2 w-full rounded-lg border border-slate-800/70 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    />
                  </Field.Root>
                </div>
                <p id="evidence-date-hint" className="text-xs text-slate-500">
                  Use YYYY-MM-DD to filter evidence by publish date.
                </p>
              </div>
              <div className="mt-4">
                <p
                  id="evidence-tags-label"
                  className="text-xs font-semibold tracking-[0.12em] text-slate-400"
                >
                  Tags
                </p>
                <ToggleGroup
                  value={selectedTags}
                  onValueChange={(value) => setSelectedTags(value as string[])}
                  multiple
                  aria-labelledby="evidence-tags-label"
                  className="mt-2 flex flex-wrap gap-2"
                >
                  {tagOptions.map((tag) => (
                    <Toggle
                      key={tag}
                      value={tag}
                      className="min-h-[44px] rounded-full border px-3 py-2 text-xs font-semibold tracking-[0.12em] transition-colors data-[pressed]:border-sky-400/70 data-[pressed]:bg-sky-500/20 data-[pressed]:text-sky-100 border-slate-700/70 text-slate-300 hover:border-slate-500/80 hover:text-slate-100 touch-manipulation"
                    >
                      {tag}
                    </Toggle>
                  ))}
                </ToggleGroup>
              </div>
            </div>
            <div
              className="mt-4 flex items-center justify-between text-xs font-semibold tracking-[0.12em] text-slate-400"
              role="status"
              aria-live="polite"
            >
              <span>{filteredEvidence.length} evidence items</span>
              <span>Linked recommendations included</span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {filteredEvidence.length === 0 ? (
                <div className="weather-surface p-4 text-sm text-slate-400">
                  No evidence items match these filters. Try clearing the date range or tags.
                </div>
              ) : (
                filteredEvidence.map((item) => (
                  <article key={item.id} className="weather-surface p-4">
                    <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                      {item.source}
                    </p>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block text-sm font-semibold text-slate-100 underline decoration-slate-500 underline-offset-4 hover:text-slate-50"
                    >
                      {item.title}
                    </a>
                    <p className="mt-2 text-xs text-slate-500">{item.summary}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                      <span className="weather-pill-muted inline-flex items-center px-2 py-1">
                        Climate: {getRegimeLabel(item.climate as RegimeAssessment["regime"])}
                      </span>
                      <span className="weather-pill-muted inline-flex items-center px-2 py-1">
                        Signal: {item.signal}
                      </span>
                      <span className="weather-pill-muted inline-flex items-center px-2 py-1">
                        Date: {formatDateUTC(item.date)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <button
                          key={`${item.id}-${tag}`}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          aria-pressed={selectedTags.includes(tag)}
                          aria-label={`Filter by ${tag}`}
                          className={`min-h-[44px] rounded-full border px-3 py-2 text-xs font-semibold tracking-[0.12em] transition-colors touch-manipulation ${
                            selectedTags.includes(tag)
                              ? "border-sky-400/70 bg-sky-500/15 text-sky-100"
                              : "border-slate-700/70 text-slate-300 hover:border-slate-500/80 hover:text-slate-100"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    {item.recommendation ? (
                      <p className="mt-4 text-xs text-slate-400">
                        Decision recommendation:{" "}
                        <a
                          href={item.recommendation.href}
                          className="touch-target inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.12em] text-slate-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100"
                        >
                          {item.recommendation.label}
                        </a>
                      </p>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </Collapsible.Panel>
        </Collapsible.Root>
        <Collapsible.Root className="mt-4">
          <Collapsible.Trigger
            type="button"
            className="group flex min-h-[44px] w-full items-center justify-between gap-3 text-left text-xs font-semibold tracking-[0.12em] text-slate-300 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            <span>Deep dive: {fossilRecord.title}</span>
            <span className="inline-flex min-h-[44px] items-center rounded-full border border-slate-700/80 px-3 text-[0.65rem] font-semibold tracking-[0.14em] text-slate-200">
              <span className="group-data-[panel-open]:hidden">Expand section</span>
              <span className="hidden group-data-[panel-open]:inline">Collapse section</span>
            </span>
          </Collapsible.Trigger>
          <Collapsible.Panel className="mt-4">
            <div className="weather-surface p-4">
              <p className="type-label text-slate-400">{fossilRecord.title}</p>
              <p className="mt-2 text-xs text-slate-500">{fossilRecord.subtitle}</p>
              <p className="mt-3 text-sm text-slate-300">{fossilRecord.description}</p>
            </div>
            <div className="mt-4 overflow-x-auto overscroll-contain">
              <table className="min-w-full text-left text-sm text-slate-300">
                <caption className="sr-only">{fossilRecord.title} comparison table</caption>
                <thead className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  <tr>
                    <th scope="col" className="px-3 py-2">
                      {fossilRecord.columns.domain}
                    </th>
                    <th scope="col" className="px-3 py-2">
                      {fossilRecord.columns.lowRateArtifact}
                    </th>
                    <th scope="col" className="px-3 py-2">
                      {fossilRecord.columns.highRateArtifact}
                    </th>
                    <th scope="col" className="px-3 py-2">
                      {fossilRecord.columns.insight}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {fossilRecord.rows.map((row) => (
                    <tr key={row.domain} className="border-t border-slate-800/60">
                      <td className="px-3 py-3 text-slate-200">{row.domain}</td>
                      <td className="px-3 py-3">{row.lowRateArtifact}</td>
                      <td className="px-3 py-3">{row.highRateArtifact}</td>
                      <td className="px-3 py-3">{row.insight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Collapsible.Panel>
        </Collapsible.Root>
      </div>
    </section>
  );
};

export const FinanceStrategyPanel = ({
  regime,
  provenance,
}: {
  regime: RegimeAssessment["regime"];
  provenance: DataProvenance;
}) => {
  const financeMode = insightDatabase.financeStrategyMode;
  const entry = financeMode.regimes.find((item) => item.key === regime);

  return (
    <section id="finance-strategy" aria-labelledby="finance-strategy-title" className="mt-10">
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Finance strategy</p>
            <h3 id="finance-strategy-title" className="type-section text-slate-100">
              {financeMode.title}
            </h3>
            <p className="mt-2 type-data text-slate-300">{financeMode.subtitle}</p>
            <p className="mt-2 text-sm text-slate-400">{financeMode.description}</p>
          </div>
          <DataProvenanceStrip provenance={provenance} />
        </div>
        <div className="mt-4 weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Executive summary</p>
          <p className="mt-2 text-sm text-slate-200">
            {entry?.runwayPosture ?? "Runway posture will update when data refreshes."}
          </p>
        </div>
        <Collapsible.Root className="mt-4">
          <Collapsible.Trigger
            type="button"
            className="group flex min-h-[44px] w-full items-center justify-between gap-3 text-left text-xs font-semibold tracking-[0.12em] text-slate-300 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            <span>Deep dive: runway guidance and watchlist</span>
            <span className="inline-flex min-h-[44px] items-center rounded-full border border-slate-700/80 px-3 text-[0.65rem] font-semibold tracking-[0.14em] text-slate-200">
              <span className="group-data-[panel-open]:hidden">Expand section</span>
              <span className="hidden group-data-[panel-open]:inline">Collapse section</span>
            </span>
          </Collapsible.Trigger>
          <Collapsible.Panel className="mt-4 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="weather-surface p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Runway posture</p>
              <p className="mt-3 text-sm text-slate-200">{entry?.runwayPosture}</p>
              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                <div>
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                    Hiring throttle
                  </p>
                  <p className="mt-2">{entry?.hiringThrottle}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                    Budget focus
                  </p>
                  <ul className="mt-2 space-y-1">
                    {(entry?.budgetFocus ?? []).map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="text-slate-500">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="weather-surface p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Watch these signals
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {(entry?.watchSignals ?? []).map((signal) => (
                  <li key={signal} className="flex gap-2">
                    <span className="text-slate-500">•</span>
                    <span>{signal}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-slate-500">
                Public data only. No internal finance inputs required.
              </p>
            </div>
          </Collapsible.Panel>
        </Collapsible.Root>
      </div>
    </section>
  );
};

export const DecisionShieldTemplatesPanel = ({
  provenance,
}: {
  provenance: DataProvenance;
}) => {
  const templates = insightDatabase.decisionShieldTemplates;

  return (
    <section
      id="decision-shield-templates"
      aria-labelledby="decision-shield-templates-title"
      className="mt-10"
    >
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Decision templates</p>
            <h3 id="decision-shield-templates-title" className="type-section text-slate-100">
              {templates.title}
            </h3>
            <p className="mt-2 type-data text-slate-300">{templates.subtitle}</p>
          </div>
          <DataProvenanceStrip provenance={provenance} />
        </div>
        <div className="mt-4 weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Executive summary</p>
          <p className="mt-2 text-sm text-slate-200">
            Use these templates as default decision language when you brief leadership or document
            approvals.
          </p>
        </div>
        <Collapsible.Root className="mt-4">
          <Collapsible.Trigger
            type="button"
            className="group flex min-h-[44px] w-full items-center justify-between gap-3 text-left text-xs font-semibold tracking-[0.12em] text-slate-300 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            <span>Deep dive: decision shield templates by regime</span>
            <span className="inline-flex min-h-[44px] items-center rounded-full border border-slate-700/80 px-3 text-[0.65rem] font-semibold tracking-[0.14em] text-slate-200">
              <span className="group-data-[panel-open]:hidden">Expand section</span>
              <span className="hidden group-data-[panel-open]:inline">Collapse section</span>
            </span>
          </Collapsible.Trigger>
          <Collapsible.Panel className="mt-4 grid gap-4 md:grid-cols-3">
            {templates.decisions.map((decision) => (
              <div key={decision.title} className="weather-surface p-4">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  {decision.title}
                </p>
                <ul className="mt-4 space-y-3 text-sm text-slate-300">
                  {Object.entries(decision.stances).map(([regimeKey, stance]) => (
                    <li key={regimeKey} className="flex flex-col gap-1">
                      <span className="text-xs font-semibold tracking-[0.12em] text-slate-500">
                        {regimeKey}
                      </span>
                      <span>{stance}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Collapsible.Panel>
        </Collapsible.Root>
      </div>
    </section>
  );
};
