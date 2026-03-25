import { Fragment, type ReactNode } from "react";
import type { ConfidenceTrendFraming, WeeklyConfidencePoint } from "../../lib/report/reportData";
import type { BoundedDecisionRule } from "../../lib/report/boundedDecisionRules";
import { decisionAreaLabel } from "../../lib/report/boundedDecisionRules";
import type { RoleAwareOperatingTemplate } from "../../lib/report/operatingCalls";
import { WeeklyCallModePanel } from "./weeklyCallModePanel";
import { DecisionHeroSection } from "./weekly-card/DecisionHeroSection";
import { DiagnosticsSection } from "./weekly-card/DiagnosticsSection";
import { ActionStripSection } from "./weekly-card/ActionStripSection";
import { PostureHistoryTimeline } from "./weekly-card/HistorySection";
import type { DiagnosticsSectionProps } from "./weekly-card/types";
import { compactActionCue, compactInset, disclosureSummaryClass, sectionSpacing, tierOneHeading, tierOnePanel, tierThreeHeading, tierThreePanel } from "./weekly-card/shared";
import { RegimeBanner } from "./weekly-card/regime-banner/RegimeBanner";
import { WeeklyDecisionContent } from "./weekly-card/decision-content/WeeklyDecisionContent";
import type { RegimeKey } from "../../lib/regimeEngine";
import type {
  DecisionMatrixPayload,
  FlipRiskMeterState,
  InputInfluenceItem,
  StartupVariantPolicy,
  WeeklyDecisionCardViewModel,
} from "../../lib/report/homeBriefModel";
import { boundedDecisionPhraseFallbacks, buildCompactFreshnessMeta, formatDecisionTriplet } from "../../lib/report/reportFormatting";
import { buildThresholdMarkerState } from "../../lib/report/homeBriefPresentation";
import { formatDateUTC } from "../../lib/formatters";
import {
  buildWeeklyCitationMetaLine,
  buildCompactTrustSummary,
  buildTrustMarker,
} from "../../lib/report/trustStatus";

/**
 * Loop stage owner: presentation/artifact.
 *
 * This component renders decision-ready artifacts from view models and should
 * avoid deriving posture/threshold policy logic directly.
 */

type WeeklyDecisionCardModel =
  & WeeklyDecisionCardViewModel["status"]
  & WeeklyDecisionCardViewModel["decision"]
  & NonNullable<WeeklyDecisionCardViewModel["presentation"]>
  & WeeklyDecisionCardViewModel["diagnostics"]
  & WeeklyDecisionCardViewModel["history"]
  & WeeklyDecisionCardViewModel["artifact"];

export type WeeklyDecisionCardProps = {
  model: WeeklyDecisionCardViewModel;
  actions?: ReactNode;
  diagnosticsLane?: ReactNode;
  searchParams?: Record<string, string | undefined>;
};

export type WeeklyDecisionDiagnosticsLaneProps = DiagnosticsSectionProps;
export const WeeklyDecisionDiagnosticsLane = DiagnosticsSection;
// Legacy hero export retained for isolated section tests only.
export const DecisionCallHeader = DecisionHeroSection;

const confidenceTrendTone: Record<ConfidenceTrendFraming, string> = {
  strengthening: "text-emerald-200",
  weakening: "text-rose-200",
  unstable: "text-amber-200",
};

const ConfidenceMiniChart = ({
  confidenceHistory,
  confidenceTrend,
}: {
  confidenceHistory: WeeklyConfidencePoint[];
  confidenceTrend: ConfidenceTrendFraming;
}) => {
  const knownValues = confidenceHistory
    .filter((point): point is WeeklyConfidencePoint & { confidencePercent: number } => typeof point.confidencePercent === "number")
    .map((point) => point.confidencePercent);
  const min = knownValues.length > 0 ? Math.min(...knownValues) : 0;
  const max = knownValues.length > 0 ? Math.max(...knownValues) : 100;
  const range = Math.max(max - min, 1);

  return (
    <article className={`${tierOnePanel} ${sectionSpacing}`}>
      <h2 className={tierOneHeading}>Confidence trend (8w)</h2>
      <p className={`text-xs font-semibold uppercase tracking-[0.1em] ${confidenceTrendTone[confidenceTrend]}`}>{confidenceTrend}</p>
      <div className="mt-1 flex h-14 items-end gap-1.5" role="img" aria-label="Last 8 weekly confidence values">
        {confidenceHistory.length === 0 ? <p className="text-xs text-slate-400">No confidence history available.</p> : null}
        {confidenceHistory.map((point) => {
          const missing = point.isMissing || typeof point.confidencePercent !== "number";
          const confidencePercent = typeof point.confidencePercent === "number" ? point.confidencePercent : null;
          const height = missing || confidencePercent === null ? 14 : Math.max(14, Math.round(((confidencePercent - min) / range) * 44) + 14);
          return (
            <div key={point.recordDate} className="group relative flex-1">
              <span
                className={missing ? "block rounded-sm border border-amber-400/80 border-dashed bg-amber-500/5" : "block rounded-sm bg-sky-300/80"}
                style={{ height }}
                aria-label={missing || confidencePercent === null ? `${point.recordDate} missing confidence data` : `${point.recordDate} confidence ${Math.round(confidencePercent)}%`}
              />
              <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-100 group-hover:block">
                {missing || confidencePercent === null ? `${point.recordDate}: missing` : `${point.recordDate}: ${Math.round(confidencePercent)}%`}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400">Missing weeks are dashed markers.</p>
    </article>
  );
};

type BoundedRulesMatrixProps = {
  decisionMatrix?: DecisionMatrixPayload;
  startupVariantPolicy?: StartupVariantPolicy;
  decisionRules?: BoundedDecisionRule[];
};

const decisionLaneTone: Record<"approve" | "delay" | "flip", {
  label: string;
  badgeClassName: string;
}> = {
  approve: {
    label: "↑ Now",
    badgeClassName: "border-emerald-400/35 bg-emerald-500/10 text-emerald-100",
  },
  delay: {
    label: "∥ Hold",
    badgeClassName: "border-rose-400/35 bg-rose-500/10 text-rose-100",
  },
  flip: {
    label: "↺ Flip",
    badgeClassName: "border-sky-400/35 bg-sky-500/10 text-sky-100",
  },
};

const matrixLineTone: Record<"action" | "threshold" | "reverse", string> = {
  action: "text-emerald-100",
  threshold: "text-amber-100",
  reverse: "text-sky-100",
};

const MatrixRuleSummary = ({
  action,
  threshold,
  reversal,
}: {
  action: string;
  threshold: string;
  reversal: string;
}) => (
  <div className="space-y-1.5 text-[11px] leading-5">
    {[
      { label: "Act", value: action, tone: matrixLineTone.action },
      { label: "Trip", value: threshold, tone: matrixLineTone.threshold },
      { label: "Flip", value: reversal, tone: matrixLineTone.reverse },
    ].map((item) => (
      <p key={item.label} className="text-slate-200">
        <span className={`mr-1 font-semibold uppercase tracking-[0.08em] ${item.tone}`}>{item.label}</span>
        <span>{item.value}</span>
      </p>
    ))}
  </div>
);

export function BoundedRulesMatrix({ decisionMatrix, decisionRules = [] }: BoundedRulesMatrixProps) {
  const matrixAreaByKey: Record<"hiring" | "product" | "capital" | "burn", BoundedDecisionRule["area"]> = {
    hiring: "hiring",
    product: "product-tempo",
    capital: "capital-raising",
    burn: "burn-discipline",
  };
  const rowOrder: Array<"hiring" | "product" | "capital" | "burn"> = ["hiring", "product", "capital", "burn"];
  const rulesByArea = new Map(decisionRules.map((rule) => [rule.area, rule]));
  const fallbackDecisionTriplet = boundedDecisionPhraseFallbacks;
  const getTriplet = (rule?: BoundedDecisionRule) => (rule
    ? formatDecisionTriplet({
      action: rule.doNow[0] ?? rule.recommendation,
      threshold: rule.pauseTrigger,
      reversal: rule.resumeTrigger,
      fallbacks: fallbackDecisionTriplet,
    })
    : fallbackDecisionTriplet);
  const fallbackMatrix = {
    columns: [
      { key: "approve" as const, label: "Approve" },
      { key: "delay" as const, label: "Delay" },
      { key: "flip" as const, label: "Flip" },
    ],
    rows: rowOrder.map((key) => {
      const rule = rulesByArea.get(matrixAreaByKey[key]);
      return {
        key,
        label: rule ? decisionAreaLabel(rule.area) : key.charAt(0).toUpperCase() + key.slice(1),
        cells: {
          approve: {
            text: rule?.doNow[0] ?? fallbackDecisionTriplet.action,
            detail: rule?.rationale ?? "Keep approvals tied to near-term proof.",
            action: getTriplet(rule).action,
            threshold: getTriplet(rule).threshold,
            reversal: getTriplet(rule).reversal,
          },
          delay: {
            text: rule?.avoidNow[0] ?? "Delay irreversible commitments",
            detail: rule?.pauseTrigger ?? "Pause when thresholds weaken.",
            action: rule?.avoidNow[0] ?? "Delay irreversible commitments",
            threshold: getTriplet(rule).threshold,
            reversal: getTriplet(rule).reversal,
          },
          flip: {
            text: rule?.resumeTrigger ?? "Flip after threshold recovery",
            detail: rule?.resumeTrigger ?? "Resume only after threshold recovery holds.",
            action: getTriplet(rule).action,
            threshold: getTriplet(rule).threshold,
            reversal: getTriplet(rule).reversal,
          },
        },
        context: rule?.scope ?? "Apply this rule to related weekly operating decisions.",
      };
    }),
  };

  const matrix = decisionMatrix
    ? {
      ...decisionMatrix,
      rows: rowOrder.map((rowKey) => {
        const matrixRow = decisionMatrix.rows.find((row) => row.key === rowKey);
        const rule = rulesByArea.get(matrixAreaByKey[rowKey]);
        return {
          key: rowKey,
          label: matrixRow?.label ?? (rule ? decisionAreaLabel(rule.area) : rowKey.charAt(0).toUpperCase() + rowKey.slice(1)),
          cells: {
            approve: {
              text: matrixRow?.cells.approve.text ?? rule?.doNow[0] ?? fallbackDecisionTriplet.action,
              detail: matrixRow?.cells.approve.detail ?? rule?.rationale ?? "Keep approvals tied to near-term proof.",
              action: matrixRow?.cells.approve.action ?? getTriplet(rule).action,
              threshold: matrixRow?.cells.approve.threshold ?? getTriplet(rule).threshold,
              reversal: matrixRow?.cells.approve.reversal ?? getTriplet(rule).reversal,
            },
            delay: {
              text: matrixRow?.cells.delay.text ?? rule?.avoidNow[0] ?? "Delay irreversible commitments",
              detail: matrixRow?.cells.delay.detail ?? rule?.pauseTrigger ?? "Pause when thresholds weaken.",
              action: matrixRow?.cells.delay.action ?? rule?.avoidNow[0] ?? "Delay irreversible commitments",
              threshold: matrixRow?.cells.delay.threshold ?? getTriplet(rule).threshold,
              reversal: matrixRow?.cells.delay.reversal ?? getTriplet(rule).reversal,
            },
            flip: {
              text: matrixRow?.cells.flip.text ?? rule?.resumeTrigger ?? "Flip after threshold recovery",
              detail: matrixRow?.cells.flip.detail ?? rule?.resumeTrigger ?? "Resume only after threshold recovery holds.",
              action: matrixRow?.cells.flip.action ?? getTriplet(rule).action,
              threshold: matrixRow?.cells.flip.threshold ?? getTriplet(rule).threshold,
              reversal: matrixRow?.cells.flip.reversal ?? getTriplet(rule).reversal,
            },
          },
          context: rule?.scope ?? "Apply this rule to related weekly operating decisions.",
        };
      }),
    }
    : fallbackMatrix;

  if (!matrix || matrix.rows.length === 0) {
    return (
      <article className={`${tierOnePanel} ${sectionSpacing}`}>
        <h2 className={tierOneHeading}>Decision snapshot for leadership this week</h2>
        <p className="text-xs leading-5 text-slate-300">Decision matrix unavailable; keep current guardrails and recheck after next refresh.</p>
      </article>
    );
  }

  return (
    <article className={`${tierOnePanel} ${sectionSpacing}`}>
      <h2 className={tierOneHeading}>Decision snapshot for leadership this week</h2>
      <p className="text-xs leading-5 text-slate-300">Each lane shows the bounded rule: act now, trip line, and flip condition.</p>
      <div className="mt-2 hidden md:block">
        <div className="grid grid-cols-[minmax(0,11rem)_repeat(3,minmax(0,1fr))] gap-2" aria-label="Bounded decision matrix">
          <div className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
            Decision area
          </div>
          {matrix.columns.map((column) => (
            <div key={`desktop-column-${column.key}`} className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-left text-slate-200">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${decisionLaneTone[column.key].badgeClassName}`}>
                {decisionLaneTone[column.key].label}
              </span>
            </div>
          ))}
          {matrix.rows.map((row) => (
            <Fragment key={`desktop-row-${row.key}`}>
              <div className="rounded-md border border-slate-700/70 bg-slate-950/75 px-3 py-2.5">
                <p className="text-sm font-semibold text-slate-100">{row.label}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-300">{row.context}</p>
              </div>
              {matrix.columns.map((column) => {
                const cell = row.cells[column.key];
                return (
                  <div key={`${row.key}-${column.key}`} className="rounded-md border border-slate-700/55 bg-slate-950/60 px-3 py-2.5 align-top">
                    <p className="text-[11px] font-semibold leading-5 text-slate-100">{compactActionCue(cell.text)}</p>
                    <div className="mt-2 border-t border-slate-800/70 pt-2">
                      <MatrixRuleSummary action={cell.action} threshold={cell.threshold} reversal={cell.reversal} />
                    </div>
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
      <div className="mt-2 space-y-2 md:hidden">
        {matrix.rows.map((row) => (
          <article key={`mobile-${row.key}`} className="rounded-md border border-slate-700/55 bg-slate-950/60 p-2.5">
            <p className="text-xs font-semibold text-slate-100">{row.label}</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-300">{row.context}</p>
            <div className="mt-2 space-y-1.5">
              {matrix.columns.map((column) => {
                const cell = row.cells[column.key];
                return (
                  <div key={`mobile-${row.key}-${column.key}`} className="rounded border border-slate-700/60 bg-slate-950/70 px-2 py-2">
                    <p className="text-[11px] leading-5 text-slate-100">
                      <span className={`mr-1 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${decisionLaneTone[column.key].badgeClassName}`}>
                        {decisionLaneTone[column.key].label}
                      </span>
                      {compactActionCue(cell.text)}
                    </p>
                    <div className="mt-2 border-t border-slate-800/70 pt-2">
                      <MatrixRuleSummary action={cell.action} threshold={cell.threshold} reversal={cell.reversal} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </article>
  );
}

const inputInfluenceToneClasses: Record<InputInfluenceItem["tone"], { badge: string; fill: string }> = {
  warning: {
    badge: "border-rose-400/35 bg-rose-500/10 text-rose-100",
    fill: "bg-rose-300",
  },
  positive: {
    badge: "border-emerald-400/35 bg-emerald-500/10 text-emerald-100",
    fill: "bg-emerald-300",
  },
  neutral: {
    badge: "border-slate-600/75 bg-slate-950/60 text-slate-200",
    fill: "bg-slate-300",
  },
};

function InputInfluenceSection({ items }: { items: InputInfluenceItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <article className={`${tierOnePanel} ${sectionSpacing}`} aria-label="How inputs move this call">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className={tierOneHeading}>How inputs move this call</h2>
          <p className="mt-1 text-xs leading-5 text-slate-300">Bars show contribution share. Marker strips keep the current read anchored to its flip line.</p>
        </div>
        <p className="text-[11px] text-slate-400">Longer bars = bigger share of the weekly call.</p>
      </div>
      <ul className="mt-3 grid gap-2">
        {items.map((item, index) => {
          const tone = inputInfluenceToneClasses[item.tone];
          const thresholdMarker = buildThresholdMarkerState(item.valueLabel, item.watchLabel);

          return (
            <li key={item.key} className="border-b border-slate-800/60 px-1 py-3 last:border-b-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-100">{item.label}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${tone.badge}`}>
                      {item.pressureLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-300">{item.effectDetail}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {item.trendArrow} {item.trendLabel}
                    <span className="px-1" aria-hidden="true">·</span>
                    {item.watchLabel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-100">{item.valueLabel}</p>
                  {index === 0 ? <p className="text-[11px] text-slate-400">{item.influencePercentLabel} share</p> : null}
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800/90" aria-hidden="true">
                <div
                  className={`h-full origin-left rounded-full ${tone.fill}`}
                  style={{ transform: `scaleX(${Math.max(0.06, item.influencePercent / 100)})` }}
                />
              </div>
              <div className="mt-2">
                <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  <span>Current vs trigger</span>
                  <span>{item.watchLabel}</span>
                </div>
                {thresholdMarker ? (
                  <div className="relative mt-1.5 h-5 rounded-full border border-slate-800/70 bg-slate-950/60" aria-hidden="true">
                    <span
                      className="absolute inset-y-0 w-px bg-slate-500/90"
                      style={{ left: `${thresholdMarker.thresholdPercent}%` }}
                    />
                    <span
                      className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-950/90 ${tone.fill}`}
                      style={{ left: `${thresholdMarker.currentPercent}%` }}
                    />
                  </div>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-400">{item.watchLabel}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

type MoreContextDisclosureProps = {
  startupClimateIndex: WeeklyDecisionCardModel["startupClimateIndex"];
  evidenceItems: WeeklyDecisionCardModel["evidenceItems"];
  whyThisCall: WeeklyDecisionCardModel["whyThisCall"];
  memoryRail: WeeklyDecisionCardModel["memoryRail"];
  historicalTimeline: WeeklyDecisionCardModel["historicalTimeline"];
  historicalAnalogs: WeeklyDecisionCardModel["historicalAnalogs"];
  macroOverlay: WeeklyDecisionCardModel["macroOverlay"];
};

export function MoreContextDisclosureBody({
  startupClimateIndex,
  evidenceItems,
  whyThisCall,
  memoryRail,
  historicalTimeline,
  historicalAnalogs: _historicalAnalogs,
  macroOverlay,
}: MoreContextDisclosureProps) {
  return (
    <div className="space-y-2.5">
      <details className="group rounded-lg border border-slate-800/45 bg-slate-950/38 px-2.5 py-2">
        <summary className={`${disclosureSummaryClass} cursor-pointer list-none`}>
          <span>Startup Climate Index (context)</span>
          <span aria-hidden="true" className="weather-disclosure-trigger-indicator text-sm group-open:rotate-180">▾</span>
        </summary>
        <div className="weather-disclosure-panel animate-collapsible-in mt-2 space-y-2">
          <p className="text-xs text-slate-300">Context metric for continuity: {startupClimateIndex.score} / 100 · {startupClimateIndex.status}</p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {startupClimateIndex.breakdown.map((item) => (
              <li key={item.label} className="space-y-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span>{item.label}</span>
                  <span className="font-semibold text-slate-100">{item.score}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800">
                  <div
                    className="h-1.5 w-full origin-left rounded-full bg-sky-300/70"
                    style={{ transform: `scaleX(${Math.max(0.05, Math.min(1, item.score / 100))})` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <details className="group rounded-lg border border-slate-800/45 bg-slate-950/38 px-2.5 py-2">
        <summary className={`${disclosureSummaryClass} cursor-pointer list-none`}>
          <span>Evidence snapshot</span>
          <span aria-hidden="true" className="weather-disclosure-trigger-indicator text-sm group-open:rotate-180">▾</span>
        </summary>
        <ul className="weather-disclosure-panel animate-collapsible-in mt-2 grid gap-2 lg:grid-cols-3">
          {evidenceItems.map((item) => (
            <li key={item.key} className={`${compactInset} space-y-1.5 text-xs text-slate-200`}>
              <p className="font-semibold text-slate-100">{item.title}</p>
              <p className="text-[11px] text-slate-400">Updated {item.lastUpdated ? formatDateUTC(item.lastUpdated) : "—"}</p>
              <ul className="space-y-1 text-[11px] text-slate-300">
                {item.supportingBullets.slice(0, 3).map((bullet) => (
                  <li key={`${item.key}-${bullet}`}>• {bullet}</li>
                ))}
              </ul>
              <p className="text-[11px] text-slate-300"><span className="font-semibold text-slate-200">Confidence:</span> {item.confidenceLabel}</p>
              <p className="text-[11px] text-slate-300"><span className="font-semibold text-slate-200">Direction:</span> {item.directionLabel}</p>
              <p className="text-[11px] text-slate-300"><span className="font-semibold text-slate-200">Immediate implication:</span> {item.immediateImplication}</p>
            </li>
          ))}
        </ul>
      </details>

      <details className="group rounded-lg border border-slate-800/45 bg-slate-950/38 px-2.5 py-2">
        <summary className={`${disclosureSummaryClass} cursor-pointer list-none`}>
          <span>Why this posture call</span>
          <span aria-hidden="true" className="weather-disclosure-trigger-indicator text-sm group-open:rotate-180">▾</span>
        </summary>
        <ul className="weather-disclosure-panel animate-collapsible-in mt-2 grid gap-1.5 sm:grid-cols-3">
          {whyThisCall.map((reason) => (
            <li key={reason.label} className={`${compactInset} text-xs text-slate-200`}>
              <p className="font-semibold text-slate-300">{reason.label}</p>
              <p className="mt-1 leading-5 text-slate-300">{reason.detail}</p>
            </li>
          ))}
        </ul>
      </details>

      <details className="group rounded-lg border border-slate-800/45 bg-slate-950/38 px-2.5 py-2">
        <summary className={`${disclosureSummaryClass} cursor-pointer list-none`}>
          <span>Posture history and overlays</span>
          <span aria-hidden="true" className="weather-disclosure-trigger-indicator text-sm group-open:rotate-180">▾</span>
        </summary>
        <div className="weather-disclosure-panel animate-collapsible-in mt-2 space-y-2">
          <PostureHistoryTimeline historicalTimeline={historicalTimeline} />
          <div>
            <p className={tierThreeHeading}>Historical memory rail</p>
            <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
              {memoryRail.map((item) => (
                <li key={`${item.label}-${item.posture}`} className={`${compactInset} text-xs text-slate-200`}>
                  <p className="text-slate-400">{item.label}</p>
                  <p className="mt-1 font-semibold text-slate-100">{item.posture}</p>
                </li>
              ))}
            </ul>
          </div>
          <ul className="grid gap-1.5 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
            {macroOverlay.map((item) => (
              <li key={item.label} className={compactInset}>
                <p className="font-semibold text-slate-200">{item.label}</p>
                <p className="mt-1 leading-5 text-slate-300">{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  );
}

type CitationActionFooterProps = {
  citationMetaLine: string;
  citation: string;
};

type DecisionTransmissionRailProps = {
  actionNow: string;
  guardrail: string;
  flipWhen: string;
  citationMetaLine: string;
  actions?: ReactNode;
};

function DecisionTransmissionRail({
  actionNow,
  guardrail,
  flipWhen,
  citationMetaLine,
  actions,
}: DecisionTransmissionRailProps) {
  return (
    <article className={`${tierOnePanel} ${sectionSpacing}`} aria-label="Decision transmission rail">
      <div className="flex items-center justify-between gap-3">
        <h2 className={tierOneHeading}>Transmit this call</h2>
        <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
          Share-ready
        </span>
      </div>
      <p className="text-xs leading-5 text-slate-300">
        Default handoff: copy the weekly operator brief once the call is aligned. Use the snapshot for short chat context; keep board variants and exceptions secondary.
      </p>
      <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 px-3 py-3 text-xs text-slate-300">
        <p><span className="font-semibold text-slate-100">Action:</span> {actionNow}</p>
        <p className="mt-1"><span className="font-semibold text-slate-100">Guardrail:</span> {guardrail}</p>
        <p className="mt-1"><span className="font-semibold text-slate-100">Flip:</span> {flipWhen}</p>
      </div>
      <div className="rounded-xl border border-slate-700/60 bg-slate-950/70 px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">Artifact handoff</p>
        <p className="mt-1 text-xs leading-5 text-slate-300">{citationMetaLine}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {actions}
        </div>
      </div>
    </article>
  );
}

export function CitationActionFooter({ citationMetaLine, citation }: CitationActionFooterProps) {
  return (
    <article id="citation-actions" className={`${tierThreePanel} ${sectionSpacing}`}>
      <h2 className={tierThreeHeading}>Cite this call</h2>
      <p className="mt-2 text-xs text-slate-300">{citationMetaLine}</p>
      <pre className="mt-2 overflow-x-auto rounded-md border border-slate-700/70 bg-slate-950/75 px-3 py-2 font-mono whitespace-pre-wrap text-xs text-slate-300">{citation}</pre>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-3 text-xs text-slate-300">
        <span>Use this citation in meeting notes, board updates, or operating memos.</span>
        <span className="font-semibold uppercase tracking-[0.12em] text-slate-200">Share actions stay in the transmission rail above.</span>
      </div>
    </article>
  );
}

const ownerLabelByArea: Record<BoundedDecisionRule["area"], string> = {
  hiring: "CEO",
  "product-tempo": "CPO",
  "capital-raising": "CEO / Finance",
  "burn-discipline": "CFO",
  "expansion-bets": "CEO",
};

const extractThresholdChips = (text: string): string[] => {
  const match = text.match(/(tightness|risk appetite)\s*(>=|<=|>|<)\s*(-?\d+(?:\.\d+)?)/i);

  if (!match) {
    return [];
  }

  const metricLabel = match[1].toLowerCase() === "risk appetite" ? "Risk appetite" : "Tightness";
  return [`Metric ${metricLabel}`, `Trigger ${match[2]} ${match[3]}`];
};

const buildPolicyDetails = ({
  rule,
  summary,
  fallbackOwner,
}: {
  rule?: BoundedDecisionRule;
  summary: string;
  fallbackOwner: string;
}) => {
  if (!rule) {
    return {
      summary,
      chips: [`Owner ${fallbackOwner}`],
    };
  }

  const pauseChips = extractThresholdChips(rule.pauseTrigger);
  const firstFlip = rule.flipConditions[0];

  return {
    summary,
    chips: [
      ...(pauseChips.length > 0
        ? pauseChips
        : firstFlip
          ? [
            `Metric ${firstFlip.metric === "riskAppetite" ? "Risk appetite" : "Tightness"}`,
            `Trigger ${firstFlip.operator} ${firstFlip.value.toFixed(1)}`,
          ]
          : []),
      `Owner ${ownerLabelByArea[rule.area]}`,
    ],
  };
};

const buildRoleTranslationCards = ({
  decisionRules,
}: {
  decisionRules: BoundedDecisionRule[];
}) => {
  const financeRule = decisionRules.find((rule) => rule.area === "burn-discipline");
  const productRule = decisionRules.find((rule) => rule.area === "product-tempo");

  return [
    {
      id: "finance" as const,
      label: "Finance",
      implication: financeRule?.recommendation ?? "Translate posture into approval limits and commitment discipline.",
      doLine: financeRule?.doNow[0] ?? "Keep new fixed-cost commitments reversible and staged.",
      holdLine: financeRule?.avoidNow[0] ?? "Do not approve multi-quarter spend without clear payback proof.",
    },
    {
      id: "product" as const,
      label: "Product",
      implication: productRule?.recommendation ?? "Translate posture into roadmap pacing and scope discipline.",
      doLine: productRule?.doNow[0] ?? "Prioritize near-term customer value and reversible roadmap bets.",
      holdLine: productRule?.avoidNow[0] ?? "Do not expand long-payback roadmap scope without stronger proof.",
    },
  ];
};

const resolveRoleView = (
  role: string | undefined,
): "finance" | "product" => (role === "product" ? "product" : "finance");

const buildRoleHref = (
  role: "finance" | "product",
  searchParams?: Record<string, string | undefined>,
) => {
  const params = new URLSearchParams();

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (typeof value === "string" && value.length > 0 && key !== "role") {
      params.set(key, value);
    }
  });

  if (role !== "finance") {
    params.set("role", role);
  }

  const query = params.toString();
  return query.length > 0 ? `/?${query}#weekly-call-core` : "/#weekly-call-core";
};

export function WeeklyDecisionCard(props: WeeklyDecisionCardProps) {
  const { model, actions, diagnosticsLane, searchParams } = props;
  const { status, decision, presentation, diagnostics, history, artifact } = model;
  const {
    statusLabel,
    regimeKey,
    postureLabel,
    stageLabel,
    postureWithStageLabel,
    confidenceLabel,
    confidencePercent,
    trendLabel,
    confidenceHistory = [],
    confidenceTrend = "unstable",
    isFallbackSnapshot = false,
  } = status;
  const {
    operatingStanceLine,
    weeklyMemoLines,
    guardrail,
    reversalTrigger,
    actionNowShort,
    immediateDecision,
    guardrailThreshold,
    flipThreshold,
    compactFlipConditionLabels = [],
    canonicalDecisionCopy,
    canonicalFlipConditions = [],
    reportDynamics,
    decisionShiftSummary,
    transitionProbabilities,
    decisionRules,
    decisionMatrix,
    actionStripItems = [],
    startupVariantPolicy,
    roleAwareTemplates,
    executiveOperationalStance,
    revisitDecisions,
    weeklyMovement,
  } = decision;
  const {
    whyItMattersLine,
  } = presentation ?? {};
  const {
    regimeDistance,
    flipRiskMeter,
    evidenceItems,
    failureModes = [],
    inputInfluence = [],
  } = diagnostics;
  const { historicalTimeline } = history;
  const sinceLastReview = model.sinceLastReview;
  const { citation, recordDateLabel, fetchedAtLabel } = artifact;
  const freshnessMeta = buildCompactFreshnessMeta({
    updatedAtLabel: fetchedAtLabel,
    confidenceLabel,
    isFallbackSnapshot,
  });
  const freshnessLabel = freshnessMeta.updatedAtLabel;
  const trustCueLine = buildCompactTrustSummary({
    confidenceLabel,
    freshnessLabel,
    isFallbackSnapshot,
  });
  const citationMetaLine = buildWeeklyCitationMetaLine({
    statusLabel,
    confidenceLabel,
    recordDateLabel,
    freshnessLabel,
  });
  const inlineTrustMarker = buildTrustMarker({
    confidenceLabel,
    freshnessMeta,
    isFallbackSnapshot,
  });
  const snapshotDoNow = immediateDecision;
  const snapshotGuardrail = guardrailThreshold?.trim()
    || executiveOperationalStance.avoid[0]?.trim()
    || guardrail;
  const snapshotWatch = canonicalDecisionCopy?.flipTrigger ?? flipThreshold ?? reversalTrigger;
  const structuredFlipLabels = canonicalFlipConditions
    .map((condition) => condition.label.trim())
    .filter((label) => label.length > 0)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .slice(0, 4);
  const canonicalFlipLabels = (canonicalDecisionCopy?.flipConditions ?? [])
    .map((label) => label.trim())
    .filter((label) => label.length > 0)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .slice(0, 4);
  const effectiveFlipLabels = canonicalFlipLabels.length > 0
    ? canonicalFlipLabels
    : structuredFlipLabels.length > 0
    ? structuredFlipLabels
    : compactFlipConditionLabels.filter((label, index, labels) => labels.indexOf(label) === index).slice(0, 4);
  const stabilityRule = "Stability rule: act on posture shifts only after 2 consecutive weekly reads, unless the flip trigger fires at HIGH confidence.";
  const trustStateLabel = isFallbackSnapshot ? "FALLBACK SNAPSHOT" : "LIVE";
  const trustStateDetail = isFallbackSnapshot
    ? "Cached weekly read. Use for pacing and defer irreversible approvals until live data returns."
    : confidenceLabel === "HIGH"
      ? "Live weekly read. Safe for near-term operating decisions."
      : "Live weekly read, but confidence is not HIGH yet. Keep approvals staged.";
  const decisionBullets = [
    { label: "What changed", detail: decisionShiftSummary.replace(/^Changed:\s*/i, "").trim() },
    { label: "What that changes", detail: immediateDecision.trim() },
    { label: "What to revisit", detail: guardrail.trim() },
    { label: "What would flip", detail: snapshotWatch.trim() },
  ];
  const guardrailPolicyDetails = buildPolicyDetails({
    rule: decisionRules.find((rule) => rule.area === "burn-discipline") ?? decisionRules[0],
    summary: "Use this as the enforceable weekly boundary before approving new fixed-cost commitments.",
    fallbackOwner: "CFO",
  });
  const flipPolicyDetails = canonicalFlipConditions[0]
    ? {
      summary: "This is the pre-committed trigger that reopens the weekly posture call.",
      chips: [
        `Metric ${canonicalFlipConditions[0].metric === "riskAppetite" ? "Risk appetite" : "Tightness"}`,
        `Trigger ${canonicalFlipConditions[0].operator} ${canonicalFlipConditions[0].value.toFixed(1)}`,
        `Owner ${ownerLabelByArea[canonicalFlipConditions[0].area]}`,
      ],
    }
    : buildPolicyDetails({
      rule: decisionRules.find((rule) => rule.area === "product-tempo") ?? decisionRules[0],
      summary: "Use the primary flip trigger to decide when this week’s posture should be revisited.",
      fallbackOwner: "CEO",
    });
  const roleTranslations = buildRoleTranslationCards({ decisionRules });
  const activeRole = resolveRoleView(searchParams?.role);
  const roleHrefs = {
    finance: buildRoleHref("finance", searchParams),
    product: buildRoleHref("product", searchParams),
  };

  const needsTrustWarning = isFallbackSnapshot || confidenceLabel !== "HIGH" || freshnessLabel === "Unavailable";
  const resolvedStartupVariantPolicy = startupVariantPolicy ?? {
    selectedMode: "series-a",
    options: [
      { mode: "seed", label: "Seed" },
      { mode: "series-a", label: "Series A" },
      { mode: "series-b", label: "Series B" },
      { mode: "growth", label: "Growth" },
      { mode: "public", label: "Public" },
      { mode: "bootstrapped", label: "Bootstrapped" },
    ],
    adjustmentsByMode: {
      seed: {
        mode: "seed",
        label: "Seed",
        description: "Protect runway while preserving rapid proof loops.",
        doNowAdjustments: ["Prioritize experiments that can prove customer pull inside one sprint."],
        avoidAdjustments: ["Avoid bundling multiple irreversible hires before one milestone clears."],
        watchAdjustments: ["Runway trigger: tighten immediately when boundary distance compresses."],
        thresholdEmphasis: "Emphasize runway and evidence cadence over growth breadth.",
        reversalTriggerDiscipline: "Reverse to faster hiring only after improving reads and shipped traction proof.",
      },
      "series-a": {
        mode: "series-a",
        label: "Series A",
        description: "Balance growth tempo with repeatability proof.",
        doNowAdjustments: ["Scale only where activation and retention targets are tracking."],
        avoidAdjustments: ["Avoid parallel expansion programs that obscure payback accountability."],
        watchAdjustments: ["Payback trigger: revisit if boundary distance narrows."],
        thresholdEmphasis: "Emphasize payback windows and repeatable pipeline conversion.",
        reversalTriggerDiscipline: "Reverse to aggressive expansion only after trigger clears and conversion quality holds.",
      },
      "series-b": {
        mode: "series-b",
        label: "Series B",
        description: "Protect operating leverage while preserving selective scale lanes.",
        doNowAdjustments: ["Concentrate approvals on lanes with measurable efficiency lift."],
        avoidAdjustments: ["Avoid fixed-cost expansions that assume forward multiple recovery."],
        watchAdjustments: ["Leverage trigger: hold expansion when boundary distance compresses."],
        thresholdEmphasis: "Emphasize efficiency lift and margin durability before headcount scale.",
        reversalTriggerDiscipline: "Reverse to broader scaling only when both boundaries clear resume bands.",
      },
      growth: {
        mode: "growth",
        label: "Growth",
        description: "Scale durable GTM and platform leverage without losing unit discipline.",
        doNowAdjustments: ["Concentrate scale on channels with proven CAC payback inside the planning window."],
        avoidAdjustments: ["Avoid top-line-first expansions that outrun support and margin readiness."],
        watchAdjustments: ["Growth trigger: rephase expansion when either boundary distance compresses."],
        thresholdEmphasis: "Emphasize CAC payback, retention durability, and support capacity before adding fixed cost.",
        reversalTriggerDiscipline: "Reverse to faster scaling only after conversion efficiency and macro reads improve together.",
      },
      public: {
        mode: "public",
        label: "Public",
        description: "Prioritize earnings resilience and guided execution consistency.",
        doNowAdjustments: ["Bias capital allocation toward initiatives with near-term margin and cash-flow reliability."],
        avoidAdjustments: ["Avoid guidance-risk programs that depend on optimistic macro re-rating."],
        watchAdjustments: ["Guidance trigger: tighten discretionary spend when boundary distance narrows."],
        thresholdEmphasis: "Emphasize earnings durability, cash conversion, and guidance credibility.",
        reversalTriggerDiscipline: "Reverse to broader spend only after boundary pressure eases and guidance confidence improves.",
      },
      bootstrapped: {
        mode: "bootstrapped",
        label: "Bootstrapped",
        description: "Maximize cash durability and compounding customer value.",
        doNowAdjustments: ["Prioritize self-funded growth loops with near-term cash payback."],
        avoidAdjustments: ["Avoid commitments that require external financing to finish."],
        watchAdjustments: ["Cash trigger: tighten spend when either boundary narrows."],
        thresholdEmphasis: "Emphasize cash conversion and reversible commitments over growth optics.",
        reversalTriggerDiscipline: "Reverse to higher spend only after cash payback proof holds across weekly reads.",
      },
    },
  } satisfies StartupVariantPolicy;
  const resolvedRegimeKey = regimeKey ?? "DEFENSIVE";

  return (
    <section className="weather-panel space-y-4 px-4 py-4 sm:space-y-5 sm:px-5 sm:py-5 lg:px-6 lg:py-6" aria-labelledby="weekly-posture-brief-title">
      <RegimeBanner
        statusLabel={statusLabel}
        regimeKey={resolvedRegimeKey}
        postureLabel={postureLabel}
        stageLabel={stageLabel}
        postureWithStageLabel={postureWithStageLabel}
        recordDateLabel={recordDateLabel}
        confidencePercent={confidencePercent}
        confidenceLabel={confidenceLabel}
        trendLabel={trendLabel}
        regimeDistance={regimeDistance}
        flipRiskMeter={flipRiskMeter}
      />

      <WeeklyDecisionContent
        modePanel={(
          <WeeklyCallModePanel
            startupVariantPolicy={resolvedStartupVariantPolicy}
            postureLabel={postureWithStageLabel ?? statusLabel}
            operatingCall={canonicalDecisionCopy?.operatingCall ?? operatingStanceLine}
            trendLabel={trendLabel}
            confidencePercent={confidencePercent}
            confidenceLabel={confidenceLabel}
            snapshotGuardrail={snapshotGuardrail}
            snapshotWatch={snapshotWatch}
            revisitDecisions={revisitDecisions}
            effectiveFlipLabels={effectiveFlipLabels}
            compactInsetClassName={compactInset}
            tierOnePanelClassName={tierOnePanel}
            sectionSpacingClassName={sectionSpacing}
            tierOneHeadingClassName={tierOneHeading}
            whyItMattersLine={whyItMattersLine}
            needsTrustWarning={needsTrustWarning}
            trustStateLabel={trustStateLabel}
            trustStateDetail={trustStateDetail}
            trustTimestamp={freshnessLabel}
            trustReason={isFallbackSnapshot ? artifact.freshnessLine ?? trustCueLine : undefined}
            inlineTrustLabel={inlineTrustMarker.label}
            inlineTrustTone={inlineTrustMarker.tone}
            stabilityRule={stabilityRule}
            decisionBullets={decisionBullets}
            guardrailPolicyDetails={guardrailPolicyDetails}
            flipPolicyDetails={flipPolicyDetails}
            roleTranslations={roleTranslations}
            activeRole={activeRole}
            roleHrefs={roleHrefs}
          />
        )}
        influenceSection={<InputInfluenceSection items={inputInfluence} />}
        diagnosticsSection={diagnosticsLane ?? (
          <DiagnosticsSection
            weeklyMemoLines={weeklyMemoLines}
            immediateDecision={immediateDecision}
            revisitDecisions={revisitDecisions}
            guardrail={guardrail}
            regimeDistance={regimeDistance}
            postureWithStageLabel={postureWithStageLabel}
            statusLabel={statusLabel}
            trendLabel={trendLabel}
            confidencePercent={confidencePercent}
            decisionMatrix={decisionMatrix}
            decisionRules={decisionRules}
            roleAwareTemplates={roleAwareTemplates}
            evidenceItems={evidenceItems}
            reportDynamics={reportDynamics}
            weeklyMovement={weeklyMovement}
            transitionProbabilities={transitionProbabilities}
            failureModes={failureModes}
            sinceLastReview={sinceLastReview}
          />
        )}
        matrixSection={(
          <BoundedRulesMatrix
            decisionMatrix={decisionMatrix}
            decisionRules={decisionRules}
            startupVariantPolicy={resolvedStartupVariantPolicy}
          />
        )}
        actionStripSection={actionStripItems.length > 0 ? <ActionStripSection items={actionStripItems} /> : null}
        asideContent={(
          <>
            <ConfidenceMiniChart confidenceHistory={confidenceHistory} confidenceTrend={confidenceTrend} />
            <DecisionTransmissionRail
              actionNow={snapshotDoNow}
              guardrail={snapshotGuardrail}
              flipWhen={snapshotWatch}
              citationMetaLine={citationMetaLine}
              actions={actions}
            />
          </>
        )}
      />

      <CitationActionFooter citationMetaLine={citationMetaLine} citation={citation} />
    </section>
  );
}
