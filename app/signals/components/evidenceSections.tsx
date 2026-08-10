"use client";

import type { ComponentType } from "react";
import { useRouter } from "next/navigation";
import { Collapsible } from "@base-ui/react/collapsible";
import type { TreasuryData } from "../../../lib/types";
import { indicatorTypeLabel } from "../../../lib/indicatorClassification";
import type { ThresholdPressureDirection } from "../../../lib/report/homeBriefModel";
import {
  buildDiagnosticsExpansionHref,
  buildSignalsAdvancedHref,
  buildSignalsFocusHref,
  buildSignalsViewHref,
  focusTabs,
  type FocusTab,
  type SignalsView,
} from "../evidenceQueryState";

const SIGNAL_LABEL_COPY: Record<string, string> = {
  Tightness: "Funding pressure",
  "Risk appetite": "Investor appetite",
  "Curve slope": "Rate trend",
  "Base rate": "Base rate",
  "Regime timeline": "Past changes",
  "Macro source series": "Raw source data",
  "Threshold logic": "Watch lines",
  "Time machine": "Past snapshots",
};

const displaySignalLabel = (label: string) => SIGNAL_LABEL_COPY[label] ?? label;
const clampPercent = (value: number) => Math.min(96, Math.max(4, value));

const normalizeBulletPosition = (value: number, domain: { min: number; max: number }) =>
  clampPercent(((value - domain.min) / (domain.max - domain.min || 1)) * 100);

const buildThresholdMeterState = ({
  currentValue,
  thresholdValue,
  chartDomain,
  watchBuffer,
  pressureDirection,
  leftLabel,
  rightLabel,
}: {
  currentValue: number | null;
  thresholdValue: number | null;
  chartDomain: { min: number; max: number } | null;
  watchBuffer: number;
  pressureDirection: ThresholdPressureDirection;
  leftLabel: string;
  rightLabel: string;
}) => {
  if (currentValue === null || thresholdValue === null || chartDomain === null) {
    return null;
  }

  const buildSegment = (startValue: number, endValue: number) => {
    const start = normalizeBulletPosition(startValue, chartDomain);
    const end = normalizeBulletPosition(endValue, chartDomain);
    return {
      left: `${Math.min(start, end)}%`,
      width: `${Math.max(end - start, 2)}%`,
    };
  };

  if (pressureDirection === "higher-is-worse") {
    return {
      currentPercent: normalizeBulletPosition(currentValue, chartDomain),
      thresholdPercent: normalizeBulletPosition(thresholdValue, chartDomain),
      leftLabel,
      rightLabel,
      safe: buildSegment(chartDomain.min, Math.min(thresholdValue - watchBuffer, chartDomain.max)),
      caution: buildSegment(
        Math.max(chartDomain.min, thresholdValue - watchBuffer),
        Math.min(thresholdValue, chartDomain.max),
      ),
      risk: buildSegment(thresholdValue, chartDomain.max),
    };
  }

  return {
    currentPercent: normalizeBulletPosition(currentValue, chartDomain),
    thresholdPercent: normalizeBulletPosition(thresholdValue, chartDomain),
    leftLabel,
    rightLabel,
    risk: buildSegment(chartDomain.min, thresholdValue),
    caution: buildSegment(
      Math.max(chartDomain.min, thresholdValue),
      Math.min(thresholdValue + watchBuffer, chartDomain.max),
    ),
    safe: buildSegment(Math.min(thresholdValue + watchBuffer, chartDomain.max), chartDomain.max),
  };
};

export const SignalsModeSwitcherSection = ({
  activeSignalsView,
  searchParams,
}: {
  activeSignalsView: SignalsView;
  searchParams?: Record<string, string | undefined>;
}) => {
  const router = useRouter();

  return (
    <section className="weather-panel space-y-3 px-5 py-4" aria-label="Evidence view">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Depth
        </p>
        <h2 className="text-base font-semibold text-slate-100">
          Read the short version first. Open deeper evidence only when you need to defend it.
        </h2>
        <p className="text-sm text-slate-300">
          The short read tells you what changed, what it means this week, and what would make the
          assessment wrong. The deeper view adds diagnostics, replay, and supporting checks only when
          someone needs to see the evidence behind the recommendation.
        </p>
      </div>
      <div
        role="radiogroup"
        aria-label="Evidence view mode"
        className="grid gap-2 sm:grid-cols-2"
      >
        {([
          {
            id: "implication",
            label: "Short read",
            detail:
              "What changed, what it means this week, and the main lines to watch.",
          },
          {
            id: "detail",
            label: "Deeper evidence",
            detail:
              "Diagnostics, replay, and the checks that would overturn the assessment.",
          },
        ] as const).map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={activeSignalsView === item.id}
            onClick={() => {
              router.push(buildSignalsViewHref(searchParams, item.id));
            }}
            aria-label={item.label}
            className={
              `flex min-h-[44px] cursor-pointer items-start gap-3 rounded-md border px-3 py-3 text-left outline-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${
                activeSignalsView === item.id
                  ? "border-sky-300/80 bg-sky-500/12 text-slate-100"
                  : "border-slate-700/80 bg-slate-950/55 text-slate-200 hover:border-sky-400/70 hover:text-slate-100"
              }`
            }
          >
            <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-500/80">
              {activeSignalsView === item.id ? (
                <span className="h-2 w-2 rounded-full bg-sky-200" aria-hidden="true" />
              ) : null}
            </span>
            <span className="min-w-0">
              <span className="text-fluid-xs font-semibold uppercase tracking-[0.14em]">{item.label}</span>
              <span className="mt-2 block text-xs leading-5 text-slate-300">{item.detail}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export const SignalsDecisionSummarySection = ({
  decisionDeltaLabel,
  triggerCondition,
  reversalCondition,
  showMicroDecisionRows,
  regimeLabel,
  trustStatusLabel,
  recordDateLabel,
  fetchedAtLabel,
  nextRefreshLabel,
  freshnessSummaryLabel,
  actionNowShort,
  startItems,
  stopItems,
  topDiagnosticCallouts,
}: {
  decisionDeltaLabel: string;
  triggerCondition: string;
  reversalCondition: string;
  showMicroDecisionRows: boolean;
  regimeLabel: string;
  trustStatusLabel: string;
  recordDateLabel: string;
  fetchedAtLabel: string;
  nextRefreshLabel: string;
  freshnessSummaryLabel: string;
  actionNowShort?: string;
  startItems: string[];
  stopItems: string[];
  topDiagnosticCallouts: Array<{ label: string; why: string }>;
}) => (
  <section
    id="decision-summary"
    className="weather-panel scroll-mt-28 space-y-6 px-6 py-5"
    aria-label="Decision summary"
  >
    <p className="weather-surface flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100">
      {decisionDeltaLabel}
    </p>
    <article className="weather-surface space-y-3 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">
        What this means now
      </p>
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-md border border-slate-800/80 bg-slate-950/45 px-3 py-3">
          <p className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Current outlook
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {actionNowShort ?? "Hold the current operating posture while thresholds hold."}
          </p>
        </div>
        <div className="rounded-md border border-slate-800/80 bg-slate-950/45 px-3 py-3">
          <p className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Main pressure
          </p>
          <p className="mt-2 text-sm text-slate-200">
            {topDiagnosticCallouts[0]?.why ??
              "Review the scorecard below to confirm the main driver before you change posture."}
          </p>
        </div>
        <div className="rounded-md border border-slate-800/80 bg-slate-950/45 px-3 py-3">
          <p className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            What would change this
          </p>
          {showMicroDecisionRows ? (
            <div className="mt-2 space-y-2 text-sm text-slate-200">
              <div className="rounded-md border border-amber-400/20 bg-amber-500/8 px-2 py-1.5">
                <p className="text-fluid-micro font-semibold uppercase tracking-[0.08em] text-amber-200">
                  Wrong if
                </p>
                <p className="mt-1">{triggerCondition}</p>
              </div>
              <div className="rounded-md border border-sky-400/20 bg-sky-500/8 px-2 py-1.5">
                <p className="text-fluid-micro font-semibold uppercase tracking-[0.08em] text-sky-200">
                  Safe again when
                </p>
                <p className="mt-1">{reversalCondition}</p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-200">
              <span className="mr-1 font-semibold uppercase tracking-[0.08em] text-amber-200">
                Wrong if:
              </span>
              {" "}
              <span>{triggerCondition}</span>
              {" "}
              <span aria-hidden="true" className="text-slate-400">·</span>
              {" "}
              <span className="mr-1 font-semibold uppercase tracking-[0.08em] text-sky-200">
                Safe again when:
              </span>
              {" "}
              <span>{reversalCondition}</span>
            </p>
          )}
        </div>
      </div>
    </article>
    <div className="weather-surface grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <p className="text-fluid-xs font-semibold uppercase tracking-[0.14em] text-slate-200">
          Current environment
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-100">{regimeLabel}</p>
      </div>
      <div>
        <p className="text-fluid-xs font-semibold uppercase tracking-[0.14em] text-slate-200">
          Confidence
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-100">{trustStatusLabel}</p>
      </div>
      <div>
        <p className="text-fluid-xs font-semibold uppercase tracking-[0.14em] text-slate-200">
          Decision as-of
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-100">{recordDateLabel}</p>
      </div>
      <div>
        <p className="text-fluid-xs font-semibold uppercase tracking-[0.14em] text-slate-200">
          Freshness
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-100">{freshnessSummaryLabel}</p>
        <p className="mt-1 text-xs text-slate-300">
          Updated {fetchedAtLabel} · Next {nextRefreshLabel}
        </p>
      </div>
    </div>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
      <article className="weather-surface space-y-3 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
          Big picture
        </p>
        <h2 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          {regimeLabel} is the current funding environment.
        </h2>
        <p className="text-sm leading-relaxed text-slate-200 sm:text-base">
          Use this section to confirm that the weekly brief still fits the evidence. The sections
           below show what changed, why it matters, and what would overturn the outlook.
        </p>
        <dl className="grid gap-3 rounded-md border border-slate-800/80 bg-slate-950/40 p-3 sm:grid-cols-3">
          <div>
            <dt className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
              What to do
            </dt>
            <dd className="mt-1 text-xs text-slate-100">
              Run this week&apos;s plan with the start, stop, and watch rules shown here.
            </dd>
          </div>
          <div>
            <dt className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
              If this is wrong
            </dt>
            <dd className="mt-1 text-xs text-slate-100">
              You risk over-hiring or over-committing if funding conditions weaken faster than expected.
            </dd>
          </div>
          <div>
            <dt className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
              Check again
            </dt>
            <dd className="mt-1 text-xs text-slate-100">
              At the next refresh, or sooner if a watch line breaks.
            </dd>
          </div>
        </dl>
        <p className="text-xs text-slate-300">
          The main drivers and watch lines are below.
        </p>
      </article>
      <article className="weather-surface space-y-3 p-5" aria-label="Founder decision playbook">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
          This week
        </p>
        <h3 className="text-lg font-semibold text-slate-100">
          What founders should do this week
        </h3>
        <div className="rounded-md border border-emerald-800/60 bg-emerald-950/20 p-3">
          <p className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-emerald-200">
            Lean in here
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-100" aria-label="Start rules">
            {startItems.slice(0, 3).map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-rose-800/60 bg-rose-950/20 p-3">
          <p className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-rose-200">
            Hold or gate
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-100" aria-label="Stop rules">
            {stopItems.slice(0, 3).map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-300">
          This outlook comes down to three things: how hard it is to fund new bets, how open
          markets are to risk, and whether interest rates are rising or falling.
        </p>
      </article>
      <article className="weather-surface space-y-3 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
          What moved most
        </p>
        <ul className="space-y-3" aria-label="Top mover callouts">
          {topDiagnosticCallouts.map((item, index) => (
            <li
              key={item.label}
              className="rounded-md border border-slate-800/80 bg-slate-950/40 p-3"
            >
              <p className="text-xs font-semibold tracking-[0.18em] text-slate-300">
                Top mover {index + 1}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">{displaySignalLabel(item.label)}</p>
              <p className="mt-1 text-sm text-slate-200">{item.why}</p>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-300">
          The scorecards below show the watch line behind each mover.
        </p>
      </article>
    </div>
  </section>
);

export const SignalsCurrentScoresSection = ({
  scoreCardsByType,
}: {
  scoreCardsByType: Record<
    "leading" | "lagging",
    Array<{
      label: string;
      valueLabel: string;
      currentValue: number | null;
      thresholdLabel: string;
      thresholdValue: number | null;
      description: string;
      pressureDirection: ThresholdPressureDirection;
      watchBuffer: number;
      chartDomain: { min: number; max: number } | null;
      leftLabel: string;
      rightLabel: string;
      watchDistanceLabel: string;
    }>
  >;
}) => (
  <section id="current-scores" className="weather-panel scroll-mt-28 space-y-4 px-6 py-5">
    <header className="space-y-2">
      <p className="text-sm font-semibold tracking-[0.18em] text-slate-300">Key numbers</p>
      <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
        The three numbers most responsible for this week&apos;s outlook.
      </h2>
    </header>
    <div className="space-y-4">
      {(["leading", "lagging"] as const).map((type) => (
        <section key={type} className="space-y-2">
          <h3 className="text-sm font-semibold tracking-[0.14em] text-slate-300">
            {indicatorTypeLabel[type]}
          </h3>
          <div className="grid gap-3 lg:grid-cols-3">
            {scoreCardsByType[type].map((card) => {
              const meterState = buildThresholdMeterState({
                currentValue: card.currentValue,
                thresholdValue: card.thresholdValue,
                chartDomain: card.chartDomain,
                watchBuffer: card.watchBuffer,
                pressureDirection: card.pressureDirection,
                leftLabel: card.leftLabel,
                rightLabel: card.rightLabel,
              });

              return (
                <article key={card.label} className="weather-surface space-y-3 p-4">
                  <dl>
                    <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      {displaySignalLabel(card.label)}
                    </dt>
                    <dd className="mono mt-2 text-3xl leading-none text-slate-100">{card.valueLabel}</dd>
                  </dl>
                  <div className="rounded-md border border-slate-800/80 bg-slate-950/55 px-3 py-3">
                    <div className="flex items-center justify-between gap-3 text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      <span>Current vs watch line</span>
                      <span>{card.watchDistanceLabel}</span>
                    </div>
                    {meterState ? (
                      <>
                        <div className="relative mt-3 h-7 overflow-hidden rounded-sm border border-slate-800/70 bg-slate-950/75" aria-hidden="true">
                          <span
                            className="absolute inset-y-0 bg-emerald-400/12"
                            style={{ left: meterState.safe.left, width: meterState.safe.width }}
                          />
                          <span
                            className="absolute inset-y-0 bg-amber-400/14"
                            style={{ left: meterState.caution.left, width: meterState.caution.width }}
                          />
                          <span
                            className="absolute inset-y-0 bg-rose-400/12"
                            style={{ left: meterState.risk.left, width: meterState.risk.width }}
                          />
                          <span
                            className="absolute inset-y-1 w-px bg-slate-200/90"
                            style={{ left: `${meterState.thresholdPercent}%` }}
                          />
                          <span
                            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-950/90 bg-sky-300 shadow-[0_0_0_2px_rgba(15,23,42,0.7)]"
                            style={{ left: `${meterState.currentPercent}%` }}
                          />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-fluid-micro uppercase tracking-[0.08em] text-slate-400">
                          <span>{meterState.leftLabel}</span>
                          <span>Watch line</span>
                          <span>{meterState.rightLabel}</span>
                        </div>
                        <p className="mt-2 text-fluid-xs text-slate-400">
                          Watch line: <span className="text-slate-200">{card.thresholdLabel}</span>
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-xs text-slate-400">Watch line: {card.thresholdLabel}</p>
                    )}
                  </div>
                  <p className="text-sm text-slate-300">{card.description}</p>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  </section>
);

export const SignalsNeedMoreProofSection = ({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) => (
  <section className="weather-panel space-y-3 px-6 py-5">
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        Need more detail?
      </p>
      <h2 className="text-lg font-semibold text-slate-100">
        Open the deeper evidence only if the outlook still needs proof.
      </h2>
      <p className="text-sm text-slate-300">
        The deeper view adds diagnostics, historical replay, threshold tuning, and advanced filters.
         Use it when someone asks why this moved, whether a past regime looked similar, or what
         would make the outlook wrong.
      </p>
    </div>
      <a
        href={buildSignalsViewHref(searchParams, "detail") + "#evidence-priorities"}
        className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]"
      >
        Open deeper evidence
    </a>
  </section>
);

export const SignalsEvidencePrioritiesSection = ({
  activeFocus,
  focusLabelByTab,
  searchParams,
  essentialPriorityQueue,
  additionalPriorityQueue,
}: {
  activeFocus: FocusTab;
  focusLabelByTab: Record<FocusTab, string>;
  searchParams?: Record<string, string | undefined>;
  essentialPriorityQueue: Array<{ label: string; why: string }>;
  additionalPriorityQueue: Array<{ label: string; why: string }>;
}) => (
  <section
    id="evidence-priorities"
    className="weather-panel scroll-mt-28 space-y-4 px-6 py-5"
    aria-label="Signal diagnostics queue"
  >
    <header className="space-y-2">
      <p className="text-sm font-semibold tracking-[0.18em] text-slate-300">
        Start with these checks
      </p>
      <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
        The most useful places to pressure-test the read.
      </h2>
    </header>
    <div className="grid gap-2 sm:grid-cols-5">
      {focusTabs.map((focus) => {
        const isActive = focus === activeFocus;
        return (
          <a
            key={focus}
            href={buildSignalsFocusHref(searchParams, focus)}
            aria-current={isActive ? "page" : undefined}
            className={`weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.12em] ${
              isActive
                ? "border-sky-300/80 text-slate-100"
                : "text-slate-300 hover:border-sky-400/70 hover:text-slate-100"
            }`}
          >
            {focusLabelByTab[focus]}
          </a>
        );
      })}
    </div>
    <ol className="grid gap-3 md:grid-cols-2" aria-label="Prioritized signal queue">
      {essentialPriorityQueue.map((item, index) => (
        <li key={item.label} className="weather-surface space-y-2 p-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-300">
            First check {index + 1}
          </p>
          <p className="text-sm font-semibold text-slate-100">{displaySignalLabel(item.label)}</p>
          <p className="text-sm text-slate-200">{item.why}</p>
          <p className="text-xs text-slate-300">
            Use the sections below to check this next.
          </p>
        </li>
      ))}
    </ol>
    {additionalPriorityQueue.length ? (
      <Collapsible.Root className="weather-surface group p-4">
        <Collapsible.Trigger className="flex min-h-[44px] w-full cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold tracking-[0.14em] text-slate-200">
          <span>Show the rest</span>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-slate-700/70 text-slate-400 transition-transform data-[panel-open]:rotate-180">
            ⌄
          </span>
        </Collapsible.Trigger>
        <Collapsible.Panel>
        <ol className="mt-3 grid gap-3" aria-label="Additional prioritized signal queue">
          {additionalPriorityQueue.map((item, index) => (
            <li key={item.label} className="rounded-md border border-slate-800/80 bg-slate-950/50 p-4">
              <p className="text-xs font-semibold tracking-[0.18em] text-slate-300">
                Next check {index + essentialPriorityQueue.length + 1}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-100">{displaySignalLabel(item.label)}</p>
              <p className="mt-1 text-sm text-slate-200">{item.why}</p>
              <p className="mt-2 text-xs text-slate-300">
                Check this in the matching section below.
              </p>
            </li>
          ))}
        </ol>
        </Collapsible.Panel>
      </Collapsible.Root>
    ) : null}
  </section>
);

type YieldCurvePoint = {
  year: number;
  month: number;
  recordDate: string;
  oneMonth: number | null;
  threeMonth: number | null;
  twoYear: number | null;
  tenYear: number | null;
  spread10Y2Y: number | null;
  spread2Y3M: number | null;
  curveSignal: number | null;
};

export const SignalsDiagnosticsSection = ({
  showFullDiagnostics,
  searchParams,
  topDiagnosticCallouts,
  SignalVisualizationSuite,
  treasury,
  yieldCurveSeries,
}: {
  showFullDiagnostics: boolean;
  searchParams?: Record<string, string | undefined>;
  topDiagnosticCallouts: Array<{ label: string; why: string }>;
  SignalVisualizationSuite: ComponentType<{ treasury: TreasuryData; yieldCurveSeries: YieldCurvePoint[] }> | null;
  treasury: TreasuryData;
  yieldCurveSeries: YieldCurvePoint[];
}) => (
  <section id="signal-diagnostics" className="weather-panel space-y-4 px-6 py-5" aria-label="Signal diagnostics">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
          Diagnostics
        </p>
        <h2 className="text-xl font-semibold text-slate-100">
          {showFullDiagnostics ? "Full diagnostics" : "Top drivers"}
        </h2>
        <p className="text-sm text-slate-300">
          {showFullDiagnostics
            ? "Showing the full evidence set for a deeper validation pass."
            : "Start with the top 3 reasons. Expand only when you need the full evidence set."}
        </p>
      </div>
      <a
        href={buildDiagnosticsExpansionHref(searchParams, !showFullDiagnostics)}
        className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] hover:border-sky-400/70 hover:text-slate-100"
      >
        {showFullDiagnostics ? "Show top 3 only" : "Show full evidence"}
      </a>
    </div>

    {!showFullDiagnostics ? (
      <ol className="grid gap-3 md:grid-cols-3" aria-label="Top 3 signal drivers">
        {topDiagnosticCallouts.map((item, index) => (
          <li key={item.label} className="weather-surface space-y-2 p-4">
            <p className="text-xs font-semibold tracking-[0.18em] text-slate-300">
              Top driver {index + 1}
            </p>
            <p className="text-sm font-semibold text-slate-100">{displaySignalLabel(item.label)}</p>
            <p className="text-sm text-slate-200">{item.why}</p>
            <p className="text-xs text-slate-300">
              More detail is below.
            </p>
          </li>
        ))}
      </ol>
    ) : SignalVisualizationSuite ? (
      <SignalVisualizationSuite treasury={treasury} yieldCurveSeries={yieldCurveSeries} />
    ) : null}
  </section>
);

export const SignalsAdvancedControlsSection = ({
  showAdvanced,
  searchParams,
}: {
  showAdvanced: boolean;
  searchParams?: Record<string, string | undefined>;
}) => (
  <section className="weather-panel space-y-4 px-6 py-5" id="advanced-controls">
    <div className="grid gap-4 rounded-lg border border-slate-800/80 bg-slate-950/50 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="space-y-3">
        <div className="flex min-h-[44px] items-center gap-3 text-sm font-semibold text-slate-100">
          <span>Replay and threshold tools</span>
          <span className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs tracking-[0.14em] text-slate-200">
            {showAdvanced ? "Open" : "Closed"}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-slate-300">
          Use these only when the evidence still needs a replay, historical comparison, or threshold check.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {!showAdvanced ? (
          <a
            href={buildSignalsAdvancedHref(searchParams, true) + "#time-machine"}
            className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] hover:border-sky-400/70 hover:text-slate-100"
          >
            Open Time Machine
          </a>
        ) : null}
        <a
          href={buildSignalsAdvancedHref(searchParams, !showAdvanced)}
          className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] hover:border-sky-400/70 hover:text-slate-100"
        >
          {showAdvanced ? "Hide advanced filters" : "Show advanced filters"}
        </a>
      </div>
    </div>
  </section>
);
