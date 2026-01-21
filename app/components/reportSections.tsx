/**
 * Report section components for the Whether Report dashboard.
 * Keeps layout blocks focused and reusable across the Market Climate Station UI.
 */
import type { ReactNode } from "react";
import type { RegimeAssessment } from "../../lib/regimeEngine";
import type { PlaybookEntry } from "../../lib/playbook";
import type {
  MacroSeriesReading,
  SensorReading,
  SeriesHistoryPoint,
  TreasuryData,
} from "../../lib/types";
import { cxoFunctionOutputs } from "../../lib/cxoFunctionOutputs";
import { operatorRequests } from "../../lib/operatorRequests";
import { buildMonthlySummary, getMonthlyActionGuidance } from "../../lib/monthlySummary";
import { buildWeeklySummary, getWeeklyActionGuidance } from "../../lib/weeklySummary";
import { DataProvenanceStrip, type DataProvenance } from "./dataProvenanceStrip";
import { MonthlySummaryCard } from "./monthlySummaryCard";
import { SummaryDeltaPanel } from "./summaryDeltaPanel";
import { WeeklySummaryCard } from "./weeklySummaryCard";
import { insightDatabase } from "../../data/recommendations";

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});
const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.valueOf()) ? iso : timestampFormatter.format(date);
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : dateFormatter.format(date);
};

const formatNumber = (value: number | null, unit: string) => {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  return `${numberFormatter.format(value)}${unit}`;
};

const clampToRange = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const mapToPercent = (value: number, min: number, max: number) => {
  const clamped = clampToRange(value, min, max);
  return ((clamped - min) / (max - min)) * 100;
};

const SPARKLINE_WIDTH = 160;
const SPARKLINE_HEIGHT = 40;
const SPARKLINE_PADDING = 4;

const buildSparkline = (history?: SeriesHistoryPoint[]) => {
  const points = (history ?? [])
    .filter((point): point is { date: string; value: number } => typeof point.value === "number")
    .map((point) => ({ value: point.value }));

  if (points.length === 0) {
    return null;
  }

  const normalizedPoints = points.length === 1 ? [points[0], points[0]] : points;
  const values = normalizedPoints.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  const innerWidth = SPARKLINE_WIDTH - SPARKLINE_PADDING * 2;
  const innerHeight = SPARKLINE_HEIGHT - SPARKLINE_PADDING * 2;
  const coords = normalizedPoints.map((point, index) => {
    const x =
      SPARKLINE_PADDING + (index / (normalizedPoints.length - 1)) * innerWidth;
    const y =
      SPARKLINE_HEIGHT -
      SPARKLINE_PADDING -
      ((point.value - minValue) / range) * innerHeight;
    return { x, y };
  });

  const path = coords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const first = coords[0];
  const last = coords[coords.length - 1];
  const baseY = SPARKLINE_HEIGHT - SPARKLINE_PADDING;
  const area = `${path} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`;

  return { path, area };
};

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
    ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-100"
    : "border-amber-400/60 bg-amber-500/10 text-amber-100";

  return (
    <div className="rounded-lg border border-slate-800/70 bg-slate-950/70 px-3 py-3">
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
            <time dateTime={recordDate}>{formatDate(recordDate)}</time>
          </dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-slate-500">Fetched</dt>
          <dd className="mono text-slate-200">
            <time dateTime={fetchedAt}>{formatTimestamp(fetchedAt)}</time>
          </dd>
        </div>
      </dl>
    </div>
  );
};

const getRegimeLabel = (regime: RegimeAssessment["regime"]) => {
  switch (regime) {
    case "SCARCITY":
      return "Survival Mode";
    case "DEFENSIVE":
      return "Safety Mode";
    case "VOLATILE":
      return "Stability Mode";
    case "EXPANSION":
      return "Growth Mode";
    default:
      return regime;
  }
};

const regimeBadges = [
  {
    key: "SCARCITY",
    label: "Survival",
    description: "Cash is scarce; protect runway and defer bets.",
    classes: "border-rose-500/60 bg-rose-500/15 text-rose-100",
  },
  {
    key: "DEFENSIVE",
    label: "Safety",
    description: "Capital is cautious; prioritize durability and retention.",
    classes: "border-amber-400/60 bg-amber-400/15 text-amber-100",
  },
  {
    key: "VOLATILE",
    label: "Stability",
    description: "Signals are mixed; balance experimentation with controls.",
    classes: "border-sky-400/60 bg-sky-400/15 text-sky-100",
  },
  {
    key: "EXPANSION",
    label: "Growth",
    description: "Risk appetite is open; scale initiatives responsibly.",
    classes: "border-emerald-400/60 bg-emerald-400/15 text-emerald-100",
  },
] as const;

const getRegimeBadge = (regime: RegimeAssessment["regime"]) =>
  regimeBadges.find((badge) => badge.key === regime);

const getRegimeAccent = (regime: RegimeAssessment["regime"]) => {
  switch (regime) {
    case "SCARCITY":
      return {
        panel: "from-rose-600/20 via-rose-500/10 to-transparent border-rose-500/40",
        dot: "bg-rose-500",
        text: "text-rose-200",
      };
    case "DEFENSIVE":
      return {
        panel: "from-amber-500/20 via-amber-400/10 to-transparent border-amber-400/40",
        dot: "bg-amber-400",
        text: "text-amber-200",
      };
    case "VOLATILE":
      return {
        panel: "from-sky-500/20 via-sky-400/10 to-transparent border-sky-400/40",
        dot: "bg-sky-400",
        text: "text-sky-200",
      };
    case "EXPANSION":
      return {
        panel: "from-emerald-500/20 via-emerald-400/10 to-transparent border-emerald-400/40",
        dot: "bg-emerald-400",
        text: "text-emerald-200",
      };
    default:
      return {
        panel: "from-slate-700/20 via-slate-600/10 to-transparent border-slate-600/40",
        dot: "bg-slate-500",
        text: "text-slate-200",
      };
  }
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
      <p className="text-sm text-slate-200">{description}</p>
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
  const regimeBadge = getRegimeBadge(assessment.regime);
  const regimeDescription =
    regimeBadge?.description ??
    "Use the current signals to set weekly guardrails before debating strategy.";
  const weeklySummary = buildWeeklySummary({
    assessment,
    provenance,
    recordDateLabel,
  });
  const weeklyBlocks: ActionSummaryBlock[] = [
    {
      heading: "Good product strategy sounds like",
      bullets: [
        "“Our core user problem is unchanged, and we can prove the payoff in 1–2 quarters.”",
        "“We’re trading scope for reliability because retention is the constraint.”",
      ],
    },
    {
      heading: "Macro-driven advice sounds like",
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
      detail: `Cash availability ${assessment.scores.tightness}/100 · Risk appetite ${assessment.scores.riskAppetite}/100.`,
    },
    {
      title: "Lock the one-week bet",
      detail: "Pick the smallest scope that protects retention or reliability in under two quarters.",
    },
  ];
  const weeklyQuickLinks = [
    { href: "#executive-snapshot", label: "Leadership summary" },
    { href: "/operations#playbook", label: "Actions playbook" },
    { href: "/signals#thresholds", label: "Thresholds" },
    { href: "#beginner-glossary", label: "Glossary" },
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
      detail: `Threshold ${assessment.thresholds.tightnessRegime}.`,
    },
    {
      label: "Risk appetite",
      value: `${assessment.scores.riskAppetite}/100`,
      detail: `Threshold ${assessment.thresholds.riskAppetiteRegime}.`,
    },
    {
      label: "Curve slope",
      value: curveSlopeDisplay,
      detail: curveSlopeStatus,
    },
  ];

  return (
    <section id="weekly-action-summary" aria-labelledby="weekly-action-summary-title" className="mt-8">
      <div className="weather-panel flex flex-col gap-6 px-6 py-5">
        <div className="grid gap-6 lg:grid-cols-[1.35fr,0.65fr]">
          <div className="space-y-4">
            <div>
              <p className="type-label text-slate-400">What should I do this week?</p>
              <h2 id="weekly-action-summary-title" className="type-section text-slate-100">
                Weekly action control room
              </h2>
              <p className="mt-3 text-sm text-slate-200">
                This week, operate in {regimeLabel} mode: {actionGuidance}. {regimeDescription} Skim the{" "}
                <a
                  href="#executive-snapshot"
                  className="touch-target inline-flex min-h-[44px] items-center text-slate-100 underline decoration-slate-600 underline-offset-4 hover:text-slate-50 touch-manipulation"
                >
                  leadership summary
                </a>{" "}
                for the source signals and decision guardrails.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold tracking-[0.12em] text-slate-300">
              <span className="weather-pill inline-flex min-h-[32px] items-center px-3 py-1">
                Regime: {regimeLabel}
              </span>
              <span className="weather-pill-muted inline-flex min-h-[32px] items-center px-3 py-1">
                Strategy: problem/ROI fit
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
          </div>
        </div>

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
          <aside className="weather-surface p-4" aria-label="Weekly decision checklist">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Decision checklist</p>
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
              Run the checklist before any roadmap changes or staffing approvals.
            </p>
          </aside>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Quick routes</p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold tracking-[0.12em] text-slate-400">
            {weeklyQuickLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="weather-pill inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.14em] text-slate-300 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
              >
                {link.label}
              </a>
            ))}
          </div>
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
          <MonthlySummaryCard summary={monthlySummary} />
          <SummaryDeltaPanel weeklySummary={weeklySummary} monthlySummary={monthlySummary} />
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
            Plain-English read: this is a macro guardrail, not a product vision change.
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
      <div className="relative mt-4 flex flex-wrap gap-2 text-xs font-semibold tracking-[0.12em]">
        {regimeBadges.map((badge) => {
          const isActive = badge.key === assessment.regime;
          return (
            <span
              key={badge.key}
              className={`weather-pill flex min-h-[44px] items-center gap-2 px-3 py-2 ${
                badge.classes
              } ${isActive ? "text-slate-100" : "opacity-60"}`}
              aria-current={isActive ? "true" : undefined}
            >
              <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
              <span className="text-xs">{badge.label}</span>
            </span>
          );
        })}
      </div>
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
            <details className="ml-5 rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-2 text-xs text-slate-300">
              <summary className="flex min-h-[44px] cursor-pointer items-center gap-2 text-xs font-semibold tracking-[0.12em] text-slate-400 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">
                Because
                <span className="text-slate-500">(show drivers)</span>
              </summary>
              <div className="mt-2 space-y-2">
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
              </div>
            </details>
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
          <p className="type-label text-slate-400">New here? Start here</p>
          <h2 id="first-time-guide-title" className="type-section text-slate-100">
            Get oriented in three plain-English steps
          </h2>
          <p className="mt-2 type-data text-slate-300">
            This report turns Treasury signals into weekly constraints. Use this quick onboarding
            path before you dive into the deeper data lanes.
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
        <ol className="space-y-4">
          {[
            {
              title: "Read the leadership summary",
              detail:
                "Confirm the weekly posture and top constraints before you open deeper diagnostics.",
              example: "Example decision: defer expansion hires when cash is tight.",
            },
            {
              title: "Check the proof",
              detail:
                "Use the signal breakdown here, then open the data lane to see the source metrics.",
              example: "Example decision: confirm curve inversion before approving long bets.",
            },
            {
              title: "Turn it into actions",
              detail:
                "Use the actions lane to brief leadership with clear, plain-English constraints.",
              example: "Example decision: focus on retention when risk appetite is cautious.",
            },
          ].map((step, index) => (
            <li key={step.title} className="weather-surface p-4 text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/70 bg-slate-950 text-xs font-semibold text-slate-200">
                  {index + 1}
                </span>
                <div>
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-200">
                    {step.title}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">{step.detail}</p>
                  <p className="mt-3 text-xs text-slate-500">{step.example}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <aside className="weather-surface p-4" aria-label="Onboarding checklist">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">First 10 minutes</p>
          <ul className="mt-3 space-y-3 text-sm text-slate-300">
            <li className="flex gap-2">
              <span className="text-slate-500">•</span>
              <span>Skim the climate badge and the weekly action summary together.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-slate-500">•</span>
              <span>Verify the source freshness before you share a recommendation.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-slate-500">•</span>
              <span>Use the playbook to translate macro constraints into concrete next steps.</span>
            </li>
          </ul>
          <div className="mt-4 rounded-lg border border-sky-900/60 bg-slate-950/60 p-3 text-xs text-slate-400">
            Tip: share the report URL after selecting a time machine snapshot so every stakeholder
            sees the same assumptions.
          </div>
        </aside>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {[
          { href: "#executive-snapshot", label: "Leadership summary" },
          { href: "#regime-assessment", label: "What the scores mean" },
          { href: "/operations#playbook", label: "Actions playbook" },
          { href: "/operations#export-briefs", label: "Shareable briefs" },
          { href: "/signals#time-machine", label: "Time machine" },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="weather-pill inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.14em] text-slate-300 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
          >
            {link.label}
          </a>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Share the URL when you lock thresholds or time machine selections so every stakeholder sees
        the same climate assumptions.
      </p>
    </div>
  </section>
);

export const BeginnerGlossaryPanel = () => (
  <section id="beginner-glossary" aria-labelledby="beginner-glossary-title" className="mt-10">
    <div className="weather-panel weather-panel-static p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="type-label text-slate-400">Plain-English glossary</p>
          <h3 id="beginner-glossary-title" className="type-section text-slate-100">
            Translate finance terms into day-to-day product decisions
          </h3>
          <p className="mt-2 type-data text-slate-300">
            New to Treasury data? Use this glossary to translate jargon into concrete product moves
            before you share the report.
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
            How to read the report
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            <li>
              <span className="text-slate-200">Start with the climate badge</span> to understand the
              macro stance before you interpret any single metric.
            </li>
            <li>
              <span className="text-slate-200">Translate signals into constraints</span>, not
              predictions. This report emphasizes operational guardrails.
            </li>
            <li>
              <span className="text-slate-200">Share the exports</span> when aligning leadership to
              reduce interpretation drift.
            </li>
          </ul>
        </div>
        <aside className="weather-surface p-4" aria-label="Glossary sidebar">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Glossary</p>
          <dl className="mt-3 space-y-3 text-sm text-slate-300">
            <div>
              <dt className="text-xs font-semibold tracking-[0.12em] text-slate-200">
                Cash availability (tightness)
              </dt>
              <dd className="mt-1 text-slate-400">
                How hard it is to access funding. Higher tightness means conserve cash and focus on
                runway.
              </dd>
              <dd className="mt-2 text-xs text-slate-500">
                Why it matters: tight capital makes long payback projects riskier.
              </dd>
              <dd className="mt-2 text-xs text-slate-400">
                Used in:{" "}
                <a
                  href="#executive-snapshot"
                  className="touch-target inline-flex min-h-[44px] items-center text-xs text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-slate-100"
                >
                  Executive snapshot
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-[0.12em] text-slate-200">
                Market risk appetite
              </dt>
              <dd className="mt-1 text-slate-400">
                How willing the market is to take risk. Lower appetite means de-risk launches and
                hiring.
              </dd>
              <dd className="mt-2 text-xs text-slate-500">
                Why it matters: risk appetite sets how bold your roadmap can be.
              </dd>
              <dd className="mt-2 text-xs text-slate-400">
                Used in:{" "}
                <a
                  href="#signal-matrix"
                  className="touch-target inline-flex min-h-[44px] items-center text-xs text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-slate-100"
                >
                  Signal matrix
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-[0.12em] text-slate-200">
                Curve slope (recession risk)
              </dt>
              <dd className="mt-1 text-slate-400">
                A read on recession risk. Inversion signals caution and favors defensive planning.
              </dd>
              <dd className="mt-2 text-xs text-slate-500">
                Why it matters: an inverted curve warns against long-horizon bets.
              </dd>
              <dd className="mt-2 text-xs text-slate-400">
                Used in:{" "}
                <a
                  href="#executive-snapshot"
                  className="touch-target inline-flex min-h-[44px] items-center text-xs text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-slate-100"
                >
                  Executive snapshot
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-[0.12em] text-slate-200">Fallback mode</dt>
              <dd className="mt-1 text-slate-400">
                When live data is unavailable, the report uses the latest cached Treasury snapshot.
              </dd>
              <dd className="mt-2 text-xs text-slate-500">
                Why it matters: stale inputs can mislead time-sensitive decisions.
              </dd>
              <dd className="mt-2 text-xs text-slate-400">
                Used in:{" "}
                <a
                  href="#executive-snapshot"
                  className="touch-target inline-flex min-h-[44px] items-center text-xs text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-slate-100"
                >
                  Executive snapshot
                </a>
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  </section>
);

export const OperatorRequestsPanel = ({ provenance }: { provenance: DataProvenance }) => (
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
      These are the most common expansion requests expected after launch. Delivered items are
      labeled and the remaining backlog keeps traceable data sources and plain-English operational
      guidance front and center.
    </p>
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {operatorRequests.map((request) => (
        <div
          key={request.title}
          className="weather-surface rounded-2xl px-4 py-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">{request.title}</p>
            <span className="weather-pill px-2 py-1 text-xs font-semibold tracking-[0.12em] text-slate-400">
              {request.status === "DELIVERED" ? "Delivered" : "Backlog"}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-200">{request.description}</p>
        </div>
      ))}
    </div>
  </section>
);

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
  const matrixTooltipId = "matrix-position-tooltip";
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
            roadmap approvals.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-xs font-semibold tracking-[0.12em] text-slate-500">
          <span>Cash availability vs. risk appetite</span>
          <DataProvenanceStrip provenance={provenance} />
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
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
              when to shift approvals.
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
            <button
              type="button"
              aria-label={`Matrix position. Tightness ${assessment.scores.tightness}, risk appetite ${assessment.scores.riskAppetite}.`}
              aria-describedby={matrixTooltipId}
              className="group absolute flex min-h-[44px] min-w-[44px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
              style={{ left: `${matrixDotX}%`, top: `${matrixDotY}%` }}
            >
              <span
                id={matrixTooltipId}
                role="tooltip"
                className="pointer-events-none absolute top-0 -translate-y-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                Tightness {assessment.scores.tightness} · Risk appetite {assessment.scores.riskAppetite}
              </span>
            </button>
          </div>
          <figcaption id="signal-matrix-description" className="text-xs text-slate-500">
            Position is derived from tightness (
            <span className="tabular-nums">{assessment.scores.tightness}</span>) and market risk
            appetite (<span className="tabular-nums">{assessment.scores.riskAppetite}</span>).
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
      </div>
    </section>
  );
};

export const HistoricalBanner = ({ banner }: { banner: string }) => {
  return (
    <div className="mt-6 rounded-2xl border border-slate-600 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
      <span className="type-label text-slate-400">Historical mode</span>
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
    ? "Live feed degraded; operating off cached Treasury data."
    : hasDataWarnings
      ? "Some Treasury inputs are missing; interpret signal strength with caution."
      : "Full Treasury data coverage verified for this report.";
  const freshnessAction = isFallback
    ? "Action: avoid irreversible decisions until live signals return."
    : "Action: safe to use for day-to-day planning approvals.";
  const scoringInputs = assessment.inputs;
  const scoringSource = scoringInputs[0]?.sourceLabel ?? "US Treasury";
  const scoringSourceUrl = scoringInputs[0]?.sourceUrl ?? treasury.source;

  return (
    <section id="executive-snapshot" aria-labelledby="executive-snapshot-title" className="mt-8">
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="type-label text-slate-400">Executive snapshot</p>
            <h3 id="executive-snapshot-title" className="type-section text-slate-100">
              Operating constraints
            </h3>
          </div>
          <DataProvenanceStrip provenance={provenance} />
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-[1.4fr,1fr]">
          <div className="space-y-4">
            <div className="weather-surface bg-gradient-to-br from-slate-950 via-slate-900/70 to-slate-950 p-5">
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
                <div
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.12em] ${confidenceTone}`}
                >
                  <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
                  {confidenceLabel} confidence
                </div>
              </div>
              <p className="mt-3 text-lg font-semibold text-slate-100">
                The current macro posture requires clear ROI gates before approving new spend.
              </p>
              <p className="mt-2 text-sm text-slate-300">{assessment.description}</p>
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
                Constraints tracked:{" "}
                <span className="mono text-slate-100">{assessment.constraints.length}</span>
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="weather-surface p-4">
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
              <div className="weather-surface p-4">
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
            </div>
          </div>
          <div className="space-y-4">
            <div className="weather-surface p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Data freshness
              </p>
              <p className="mono mt-2 text-sm text-slate-100">
                <time dateTime={treasury.record_date}>{treasury.record_date}</time>
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Fetched{" "}
                <time dateTime={treasury.fetched_at}>{formatTimestamp(treasury.fetched_at)}</time>
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
                        {formatTimestamp(treasury.fetched_at)}
                      </time>
                    </span>
                  </p>
                  <p className="text-amber-200/80">
                    Fallback activated:{" "}
                    <span className="mono">
                      {treasury.fallback_at ? (
                        <time dateTime={treasury.fallback_at}>
                          {formatTimestamp(treasury.fallback_at)}
                        </time>
                      ) : (
                        "Unknown"
                      )}
                    </span>
                  </p>
                </div>
              ) : null}
            </div>
            <div className="weather-surface p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Scoring inputs
              </p>
              <ul className="mt-3 space-y-2 text-xs text-slate-300">
                {scoringInputs.map((input) => (
                  <li key={input.id} className="flex items-start justify-between gap-3">
                    <span className="text-slate-400">{input.label}</span>
                    <span className="mono text-slate-100">
                      {input.value === null ? "—" : formatNumber(input.value, input.unit)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-500">
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
                  {formatTimestamp(treasury.fetched_at)}
                </time>
              </p>
            </div>
            <div className="weather-surface p-4">
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
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="weather-surface p-4">
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
          <div className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Signal confidence</p>
            <p className="mt-3 text-sm text-slate-300">{confidenceDetail}</p>
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
          <div className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
              Execution checklist
            </p>
            <p className="mt-3 text-sm text-slate-200">
              Use these calls to align next-week planning and leadership updates.
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
          <div className="weather-surface p-4">
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
                href="/operations#export-briefs"
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
                        {formatDate(alert.previousRecordDate)}
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
                        {formatDate(alert.currentRecordDate)}
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
  return (
    <section id="sensor-array" aria-labelledby="sensor-array-title" className="mt-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 id="sensor-array-title" className="type-label text-slate-400">
          Live Sensor Array
        </h3>
        <DataProvenanceStrip provenance={provenance} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {sensors.map((sensor) => {
          const hasTrend = Boolean(sensor.trend?.length);
          const sparkline = buildSparkline(sensor.trend ?? sensor.history);
          const sparklineId = `sensor-spark-${sensor.id}`;

          return (
            <div
              key={sensor.id}
              className="weather-panel rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-slate-300 break-words">{sensor.label}</p>
                  <p className="mono mt-2 text-2xl text-slate-100">
                    {formatNumber(sensor.value, sensor.unit)}
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
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {series.map((signal) => {
            const sparkline = buildSparkline(signal.history);
            const sparklineId = `macro-spark-${signal.id}`;

            return (
              <div
                key={signal.id}
                className="weather-surface rounded-2xl p-4"
              >
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">{signal.label}</p>
                <p className="mono mt-3 text-2xl text-slate-100">
                  {formatNumber(signal.value, signal.unit)}
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
        </div>
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
    { href: "/operations#decision-shield", label: "Decision shield" },
    { href: "/operations#strategy-brief", label: "Strategy brief" },
    { href: "/operations#export-briefs", label: "Export briefs" },
  ];

  return (
    <section id="playbook" aria-labelledby="playbook-title" className="mt-10">
      <div className="weather-panel p-6">
        <div className="grid gap-6 lg:grid-cols-[1.25fr,0.75fr]">
          <div>
            <p className="type-label text-slate-400">Playbook</p>
            <h3 id="playbook-title" className="type-section text-slate-100">
              {playbook?.title ?? "Operational Guidance"}
            </h3>
            {playbook ? (
              <p className="mt-2 type-data text-slate-300 break-words">{playbook.insight}</p>
            ) : (
              <p className="mt-2 type-data text-slate-300">
                Playbook data unavailable. Use climate constraints as guardrails.
              </p>
            )}
            <p className="mt-4 text-xs text-slate-500">
              Align the team on what to stop, start, and fence before approvals move forward.
            </p>
          </div>
          <div className="grid gap-3">
            <div className="weather-surface p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Playbook snapshot</p>
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
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
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
        {playbook ? (
          <div className="weather-surface mt-6 p-4">
            <details open>
              <summary className="min-h-[44px] cursor-pointer text-xs font-semibold tracking-[0.12em] text-slate-400 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
                Leadership signals (phrases to use or avoid)
              </summary>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                  <p className="text-xs font-semibold tracking-[0.12em] text-rose-200">Less often</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {playbook.leadershipPhrases.less.map((item) => (
                      <li key={item} className="break-words">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          </div>
        ) : null}
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
  const evidence = insightDatabase.regimeEvidence.regimes.find((entry) => entry.key === regime);
  const fossilRecord = insightDatabase.fossilRecord;

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
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="weather-surface p-4">
            <p className="type-label text-slate-400">Market climate evidence</p>
            <p className="mt-3 text-sm text-slate-200">
              {evidence?.summary ?? "No evidence summary available for this climate."}
            </p>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              {(evidence?.citations ?? []).map((citation) => (
                <li key={citation.url} className="flex flex-col gap-1">
                  <span className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                    {citation.source}
                  </span>
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noreferrer"
                    className="touch-target text-slate-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100"
                  >
                    {citation.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="weather-surface p-4">
            <p className="type-label text-slate-400">{fossilRecord.title}</p>
            <p className="mt-2 text-xs text-slate-500">{fossilRecord.subtitle}</p>
            <p className="mt-3 text-sm text-slate-300">{fossilRecord.description}</p>
          </div>
        </div>
        <div className="mt-6 overflow-x-auto overscroll-contain">
          <table className="min-w-full text-left text-sm text-slate-300">
            <thead className="text-xs font-semibold tracking-[0.12em] text-slate-400">
              <tr>
                <th className="px-3 py-2">{fossilRecord.columns.domain}</th>
                <th className="px-3 py-2">{fossilRecord.columns.lowRateArtifact}</th>
                <th className="px-3 py-2">{fossilRecord.columns.highRateArtifact}</th>
                <th className="px-3 py-2">{fossilRecord.columns.insight}</th>
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
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
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
        </div>
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
        <div className="mt-6 grid gap-4 md:grid-cols-3">
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
        </div>
      </div>
    </section>
  );
};
