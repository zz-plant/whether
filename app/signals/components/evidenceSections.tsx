"use client";

import type { ComponentType } from "react";
import { useRouter } from "next/navigation";
import { Collapsible } from "@base-ui/react/collapsible";
import type { TreasuryData } from "../../../lib/types";
import { ReportSection } from "../../components/reportSection";
import { indicatorTypeLabel } from "../../../lib/indicatorClassification";
import type { ThresholdPressureDirection } from "../../../lib/report/homeBriefModel";
import { buildThresholdMeterState, displaySignalLabel } from "./evidenceSectionShared";
import {
  buildDiagnosticsExpansionHref,
  buildSignalsAdvancedHref,
  buildSignalsFocusHref,
  buildSignalsViewHref,
  focusTabs,
  type FocusTab,
  type SignalsView,
} from "../evidenceQueryState";

export const SignalsModeSwitcherSection = ({
  activeSignalsView,
  searchParams,
}: {
  activeSignalsView: SignalsView;
  searchParams?: Record<string, string | undefined>;
}) => {
  const router = useRouter();

  return (
    <section
      className="weather-panel space-y-3 px-5 py-4"
      aria-label="Evidence view"
    >
      <div className="space-y-1">
        <p className="type-eyebrow type-eyebrow-section">Reading depth</p>
        {/* The paragraph that sat here restated both radio options, which carry
            their own descriptions a few lines below. */}
        <h2 className="text-base font-semibold text-slate-100">
          Open the deeper view when you need to check the call.
        </h2>
      </div>
      <div
        role="radiogroup"
        aria-label="Evidence view mode"
        className="grid gap-2 sm:grid-cols-2"
      >
        {(
          [
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
                "Charts, past months, and the checks that would overturn the call.",
            },
          ] as const
        ).map((item) => (
          <label
            key={item.id}
            className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-md border px-3 py-3 text-left outline-none transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sky-300 ${
              activeSignalsView === item.id
                ? "border-sky-300/80 bg-sky-500/12 text-slate-100"
                : "border-slate-700/80 bg-slate-950/55 text-slate-200 hover:border-sky-400/70 hover:text-slate-100"
            }`}
          >
            {/* A real radio, so one tab stop and arrow-key movement between the
                two depths come from the platform. It is visually hidden because
                the ring below is the visible control. */}
            <input
              type="radio"
              name="signals-view"
              value={item.id}
              checked={activeSignalsView === item.id}
              onChange={() => {
                // replace, not push: with native radios the arrow keys move the
                // selection, and pushing would add a history entry per keypress.
                // Reading depth is a view toggle, not a destination.
                router.replace(buildSignalsViewHref(searchParams, item.id));
              }}
              aria-label={item.label}
              className="sr-only"
            />
            <span
              className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-500/80"
              aria-hidden="true"
            >
              {activeSignalsView === item.id ? (
                <span
                  className="h-2 w-2 rounded-full bg-sky-200"
                  aria-hidden="true"
                />
              ) : null}
            </span>
            <span className="min-w-0">
              <span className="type-eyebrow">{item.label}</span>
              <span className="mt-2 block text-xs leading-5 text-slate-300">
                {item.detail}
              </span>
            </span>
          </label>
        ))}
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
      /** Row heading for this card's line — not shared: two cards measure the
       *  posture flip and one measures curve inversion. */
      thresholdName: string;
      thresholdLineNoun: string;
    }>
  >;
}) => (
  <ReportSection
    id="current-scores"
    label="Key numbers"
    title="The three numbers most responsible for this week's outlook."
  >
    {/* One row, not two groups. The three cards are small multiples — same
        encoding, same scale, same orientation — and splitting them into a
        2-card row and a 1-card row put them at the same width but never side
        by side, while leaving two thirds of the second row empty. The
        leading/lagging distinction is a property of each signal, so it rides
        on the card's own label row instead of a section heading. */}
    <div className="grid gap-3 lg:grid-cols-3">
      {(["leading", "lagging"] as const).flatMap((type) =>
        scoreCardsByType[type].map((card) => {
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
                <dt className="flex min-h-[2.9em] items-baseline justify-between gap-3 type-eyebrow text-slate-300">
                  <span>{displaySignalLabel(card.label)}</span>
                  <span className="shrink-0 text-fluid-nano font-normal text-slate-500">
                    {indicatorTypeLabel[type]}
                  </span>
                </dt>
                <dd className="mono mt-2 text-3xl leading-none text-slate-100">
                  {card.valueLabel}
                </dd>
              </dl>
              <div className="rounded-md border border-slate-800/80 bg-slate-950/55 px-3 py-3">
                <div className="flex items-center justify-between gap-3 type-eyebrow">
                  <span>Current vs {card.thresholdLineNoun}</span>
                  <span>{card.watchDistanceLabel}</span>
                </div>
                {meterState ? (
                  <>
                    <div
                      className="relative mt-3 h-7 overflow-hidden rounded-sm border border-slate-800/70 bg-slate-950/75"
                      aria-hidden="true"
                    >
                      <span
                        className="absolute inset-y-0 bg-emerald-400/12"
                        style={{
                          left: meterState.safe.left,
                          width: meterState.safe.width,
                        }}
                      />
                      <span
                        className="absolute inset-y-0 bg-amber-400/14"
                        style={{
                          left: meterState.caution.left,
                          width: meterState.caution.width,
                        }}
                      />
                      <span
                        className="absolute inset-y-0 bg-rose-400/12"
                        style={{
                          left: meterState.risk.left,
                          width: meterState.risk.width,
                        }}
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
                    {/* Endpoint labels only. A centred "Watch line" sat between
                            these two, which put three uppercase letterspaced phrases
                            in one narrow row with no separators — they read as a
                            single sentence that does not parse ("MORE PRESSURE WATCH
                            LINE MORE ROOM"). It also did not mark the threshold's
                            position, and the line below already names the watch line
                            with its actual value. */}
                    <div className="mt-1 flex items-start justify-between gap-4 type-eyebrow">
                      <span className="text-left">{meterState.leftLabel}</span>
                      <span className="text-right">
                        {meterState.rightLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-fluid-xs text-slate-400">
                      {card.thresholdName}:{" "}
                      <span className="text-slate-200">
                        {card.thresholdLabel}
                      </span>
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">
                    {card.thresholdName}: {card.thresholdLabel}
                  </p>
                )}
              </div>
              <p className="text-sm text-slate-300">{card.description}</p>
            </article>
          );
        }),
      )}
    </div>
  </ReportSection>
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
    className="weather-panel space-y-4 px-6 py-5"
    aria-label="Signal diagnostics queue"
  >
    <header className="space-y-2">
      <p className="text-sm font-semibold tracking-[0.18em] text-slate-300">
        Start with these checks
      </p>
      <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
        The most useful places to check the read.
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
    <ol
      className="grid gap-3 md:grid-cols-2"
      aria-label="Prioritized signal queue"
    >
      {essentialPriorityQueue.map((item, index) => (
        <li key={item.label} className="weather-surface space-y-2 p-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-300">
            First check {index + 1}
          </p>
          <p className="text-sm font-semibold text-slate-100">
            {displaySignalLabel(item.label)}
          </p>
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
          <ol
            className="mt-3 grid gap-3"
            aria-label="Additional prioritized signal queue"
          >
            {additionalPriorityQueue.map((item, index) => (
              <li
                key={item.label}
                className="rounded-md border border-slate-800/80 bg-slate-950/50 p-4"
              >
                <p className="text-xs font-semibold tracking-[0.18em] text-slate-300">
                  Next check {index + essentialPriorityQueue.length + 1}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {displaySignalLabel(item.label)}
                </p>
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
  SignalVisualizationSuite: ComponentType<{
    treasury: TreasuryData;
    yieldCurveSeries: YieldCurvePoint[];
  }> | null;
  treasury: TreasuryData;
  yieldCurveSeries: YieldCurvePoint[];
}) => (
  <ReportSection
    id="signal-diagnostics"
    label="Diagnostics"
    title={showFullDiagnostics ? "Full diagnostics" : "Top drivers"}
    description={
      showFullDiagnostics
        ? "Every chart behind the call."
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
      <ol
        className="grid gap-3 md:grid-cols-3"
        aria-label="Top 3 signal drivers"
      >
        {topDiagnosticCallouts.map((item, index) => (
          <li key={item.label} className="weather-surface space-y-2 p-4">
            <p className="text-xs font-semibold tracking-[0.18em] text-slate-300">
              Top driver {index + 1}
            </p>
            <p className="text-sm font-semibold text-slate-100">
              {displaySignalLabel(item.label)}
            </p>
            <p className="text-sm text-slate-200">{item.why}</p>
            <p className="text-xs text-slate-300">More detail is below.</p>
          </li>
        ))}
      </ol>
    ) : SignalVisualizationSuite ? (
      <SignalVisualizationSuite
        treasury={treasury}
        yieldCurveSeries={yieldCurveSeries}
      />
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
    title="Past months and line settings"
    action={
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs tracking-[0.14em] text-slate-200">
          {showAdvanced ? "Open" : "Closed"}
        </span>
        {!showAdvanced ? (
          <a
            href={
              buildSignalsAdvancedHref(searchParams, true) + "#time-machine"
            }
            className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] hover:border-sky-400/70 hover:text-slate-100"
          >
            Open the month picker
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
