"use client";

import type { ComponentType } from "react";
import { useRouter } from "next/navigation";
import { Collapsible } from "@base-ui/react/collapsible";
import type { TreasuryData } from "../../../lib/types";
import { ReportSection } from "../../components/reportSection";
import { BoundedValue } from "../../components/ui/boundedValue";
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
  "Curve slope": "Recession warning gauge",
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
        <p className="type-eyebrow text-sky-200">
          Depth
        </p>
        {/* The paragraph that sat here restated both radio options, which carry
            their own descriptions a few lines below. */}
        <h2 className="text-base font-semibold text-slate-100">
          Open the deeper view when you need to defend the call.
        </h2>
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
              <span className="type-eyebrow">{item.label}</span>
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
  actionNowShort?: string;
  startItems: string[];
  stopItems: string[];
  topDiagnosticCallouts: Array<{ label: string; why: string }>;
}) => {
  // "Wrong if" (the guardrail threshold) and the "Hold or gate" list come from
  // separate report fields that regularly carry the same sentence — this week
  // both read "Over-engineering before demand proves out", printed twice within
  // one screen. Drop the repeat from the list, which is the secondary of the
  // two, unless that would empty it.
  const normalize = (value: string) => value.trim().toLowerCase().replace(/\.$/, "");
  const stopItemsWithoutTrigger = stopItems.filter(
    (item) => normalize(item) !== normalize(triggerCondition),
  );
  const displayStopItems = stopItemsWithoutTrigger.length > 0 ? stopItemsWithoutTrigger : stopItems;

  return (
  <section
    id="decision-summary"
    className="weather-panel scroll-mt-28 space-y-6 px-6 py-5"
    aria-label="Decision summary"
  >
    <p className="weather-surface flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100">
      {decisionDeltaLabel}
    </p>
    <article className="weather-surface space-y-3 p-4">
      <p className="type-eyebrow text-sky-200">
        What this means now
      </p>
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-md border border-slate-800/80 bg-slate-950/45 px-3 py-3">
          <p className="text-xs font-semibold text-slate-400">
            Current outlook
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {actionNowShort ?? "Hold the current operating posture while thresholds hold."}
          </p>
        </div>
        <div className="rounded-md border border-slate-800/80 bg-slate-950/45 px-3 py-3">
          <p className="text-xs font-semibold text-slate-400">
            Main pressure
          </p>
          {topDiagnosticCallouts[0] ? (
            <>
              {/* Names the driver as well as describing it — this cell is now the
                  only place the top mover appears. */}
              <p className="mt-2 text-sm font-semibold text-slate-100">
                {displaySignalLabel(topDiagnosticCallouts[0].label)}
              </p>
              <p className="mt-1 text-sm text-slate-200">{topDiagnosticCallouts[0].why}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-200">
              Review the scorecard below to confirm the main driver before you change posture.
            </p>
          )}
        </div>
        <div className="rounded-md border border-slate-800/80 bg-slate-950/45 px-3 py-3">
          <p className="text-xs font-semibold text-slate-400">
            What would change this
          </p>
          {showMicroDecisionRows ? (
            /* Was two tinted cards nested inside this card, inside the section
               card — three containment levels for two sentences. Labelled rows
               carry the same distinction with one level, and the hue now sits on
               the label rather than on a box around it. */
            <dl className="mt-2 space-y-1.5 text-sm text-slate-200">
              <div className="flex flex-wrap gap-x-2">
                <dt className="shrink-0 font-semibold text-semantic-caution-fg">Wrong if:</dt>
                <dd className="min-w-0"><BoundedValue>{triggerCondition}</BoundedValue></dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="shrink-0 font-semibold text-semantic-easing-fg">Safe again when:</dt>
                <dd className="min-w-0"><BoundedValue>{reversalCondition}</BoundedValue></dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-slate-200">
              <span className="mr-1 type-eyebrow text-amber-200">
                Wrong if:
              </span>
              {" "}
              <span>{triggerCondition}</span>
              {" "}
              <span aria-hidden="true" className="text-slate-400">·</span>
              {" "}
              <span className="mr-1 type-eyebrow text-amber-200">
                Safe again when:
              </span>
              {" "}
              <span>{reversalCondition}</span>
            </p>
          )}
        </div>
      </div>
    </article>
    {/* The four-cell state grid that stood here — Current environment,
        Confidence, Decision as-of, Freshness — restated, word for word, what the
        report shell's own intro block already says one screen above ("Sunny ·
        Trust constrained · As of Jun 17, 2026 · Cached snapshot", then "Updated
        … · 15m cadence"). §XI of docs/agents/ui-ux-standards.md says never to
        stack repeated state summaries ahead of the first task block; this page
        stated its posture and freshness four times before any evidence
        appeared. State belongs on the earliest layer that carries it, so the
        shell keeps it and this section starts with the evidence. */}
    {/* The "Big picture" card that stood here held one data-driven line (the
        regime headline, now promoted to this section heading) wrapped in four
        blocks of copy that never changed with the data: a "the sections below
        show..." preamble, a hardcoded What to do / If this is wrong / Check
        again list, and a "the main drivers are below" sign-off. The list
        restated the playbook card beside it and the Freshness cell above it,
        and it printed identical text every week on a page whose entire job is
        reporting what changed this week. */}
    <h2 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
      {regimeLabel} is the current funding environment.
    </h2>
    <div className="grid gap-4 lg:grid-cols-2">
      <article className="weather-surface space-y-3 p-5" aria-label="Founder decision playbook">
        <p className="type-eyebrow text-sky-200">
          This week
        </p>
        <h3 className="text-lg font-semibold text-slate-100">
          What founders should do this week
        </h3>
        <div className="rounded-md border border-emerald-800/60 bg-emerald-950/20 p-3">
          <p className="type-eyebrow text-sky-200">
            Lean in here
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-100" aria-label="Start rules">
            {startItems.slice(0, 3).map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-rose-800/60 bg-rose-950/20 p-3">
          <p className="type-eyebrow text-sky-200">
            Hold or gate
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-100" aria-label="Stop rules">
            {displayStopItems.slice(0, 3).map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-300">
          This outlook comes down to three things: how hard it is to fund new bets, how open
          markets are to risk, and whether interest rates are rising or falling.
        </p>
      </article>
      {/* Starts at the second callout. The first one's `why` is already the
          Main pressure cell in the summary above, word for word, so listing it
          again here was the same sentence twice on one screen. Numbering keeps
          its true rank so "Top mover 2" still means second. */}
      {topDiagnosticCallouts.length > 1 ? (
        <article className="weather-surface space-y-3 p-5">
          <p className="type-eyebrow text-sky-200">
            Also moved
          </p>
          <ul className="space-y-3" aria-label="Top mover callouts">
            {topDiagnosticCallouts.slice(1).map((item, index) => (
              <li
                key={item.label}
                className="rounded-md border border-slate-800/80 bg-slate-950/40 p-3"
              >
                <p className="text-xs font-semibold tracking-[0.18em] text-slate-300">
                  Top mover {index + 2}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">{displaySignalLabel(item.label)}</p>
                <p className="mt-1 text-sm text-slate-200">{item.why}</p>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </div>
  </section>
  );
};

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
  <ReportSection
    id="current-scores"
    label="Key numbers"
    title="The three numbers most responsible for this week's outlook."
  >
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
                    <dt className="type-eyebrow text-slate-300">
                      {displaySignalLabel(card.label)}
                    </dt>
                    <dd className="mono mt-2 text-3xl leading-none text-slate-100">{card.valueLabel}</dd>
                  </dl>
                  <div className="rounded-md border border-slate-800/80 bg-slate-950/55 px-3 py-3">
                    <div className="flex items-center justify-between gap-3 type-eyebrow">
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
                        <div className="mt-1 flex items-center justify-between type-eyebrow">
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
  </ReportSection>
);

export const SignalsNeedMoreProofSection = ({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) => (
  <section className="weather-panel space-y-3 px-6 py-5">
    {/* The Depth switcher near the top already explains the short-vs-deep choice — this is
        the same switch repeated at the end of the page, so it carries the action only. */}
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-slate-100">Need more detail?</h2>
      <p className="text-sm text-slate-300">
        Use the deeper view when someone asks why this moved, whether a past regime looked similar,
        or what would make the outlook wrong.
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
  <ReportSection
    id="signal-diagnostics"
    label="Diagnostics"
    title={showFullDiagnostics ? "Full diagnostics" : "Top drivers"}
    description={
      showFullDiagnostics
        ? "Showing the full evidence set for a deeper validation pass."
        : "Start with the top 3 reasons. Expand only when you need the full evidence set."
    }
    action={
      <a
        href={buildDiagnosticsExpansionHref(searchParams, !showFullDiagnostics)}
        className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] hover:border-sky-400/70 hover:text-slate-100"
      >
        {showFullDiagnostics ? "Show top 3 only" : "Show full evidence"}
      </a>
    }
  >
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
  </ReportSection>
);

export const SignalsAdvancedControlsSection = ({
  showAdvanced,
  searchParams,
}: {
  showAdvanced: boolean;
  searchParams?: Record<string, string | undefined>;
}) => (
  // The hand-rolled version wrapped a bordered box inside the section panel,
  // so the header sat in a box inside a box with nothing else in the outer one.
  // ReportSection is that outer box, so the inner one goes away.
  <ReportSection
    id="advanced-controls"
    title="Replay and threshold tools"
    description="Use these only when the evidence still needs a replay, historical comparison, or threshold check."
    action={
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs tracking-[0.14em] text-slate-200">
          {showAdvanced ? "Open" : "Closed"}
        </span>
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
    }
  >
    {null}
  </ReportSection>
);
