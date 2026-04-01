import type { ComponentType } from "react";
import { indicatorTypeLabel } from "../../../lib/indicatorClassification";
import {
  buildDiagnosticsExpansionHref,
  buildSignalsAdvancedHref,
  buildSignalsFocusHref,
  buildSignalsViewHref,
  focusTabs,
  type FocusTab,
  type SignalsView,
} from "../signalsQueryState";

export const SignalsModeSwitcherSection = ({
  activeSignalsView,
  searchParams,
}: {
  activeSignalsView: SignalsView;
  searchParams?: Record<string, string | undefined>;
}) => (
  <section className="weather-panel space-y-3 px-5 py-4" aria-label="Evidence tab submode">
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        Evidence tab submode
      </p>
      <h2 className="text-base font-semibold text-slate-100">
        Stay in Evidence, then choose implication or full detail depth.
      </h2>
      <p className="text-sm text-slate-300">
        This toggle changes how much evidence detail you see inside the Evidence tab. Start with
        the operating implication. Open detail mode only when you need the full diagnostic
        appendix, replay, or threshold audit.
      </p>
    </div>
    <div className="grid gap-2 sm:grid-cols-2">
      {([
        {
          id: "implication",
          label: "What this means now",
          detail:
            "Default action-first read with just enough scorecard context to confirm the weekly call.",
        },
        {
          id: "detail",
          label: "Evidence detail",
          detail:
            "Full diagnostics, historical replay, and advanced controls for deeper validation.",
        },
      ] as const).map((item) => {
        const active = item.id === activeSignalsView;
        return (
          <a
            key={item.id}
            href={buildSignalsViewHref(searchParams, item.id)}
            aria-current={active ? "page" : undefined}
            className={`rounded-xl border px-3 py-3 text-left transition-colors ${
              active
                ? "border-sky-300/80 bg-sky-500/12 text-slate-100"
                : "border-slate-700/80 bg-slate-950/55 text-slate-200 hover:border-sky-400/70 hover:text-slate-100"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">{item.label}</p>
            <p className="mt-2 text-xs leading-5 text-slate-300">{item.detail}</p>
          </a>
        );
      })}
    </div>
  </section>
);

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
    <p className="weather-surface inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100">
      {decisionDeltaLabel}
    </p>
    <article className="weather-surface space-y-3 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">
        What this means now
      </p>
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/45 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Current call
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {actionNowShort ?? "Hold the current operating posture while thresholds hold."}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/45 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Main pressure
          </p>
          <p className="mt-2 text-sm text-slate-200">
            {topDiagnosticCallouts[0]?.why ??
              "Review the scorecard below to validate the main driver before you change posture."}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/45 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Reopen the call when
          </p>
          {showMicroDecisionRows ? (
            <div className="mt-2 space-y-2 text-sm text-slate-200">
              <div className="rounded-md border border-amber-400/20 bg-amber-500/8 px-2 py-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-200">
                  Trigger
                </p>
                <p className="mt-1">{triggerCondition}</p>
              </div>
              <div className="rounded-md border border-sky-400/20 bg-sky-500/8 px-2 py-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-200">
                  Reversal
                </p>
                <p className="mt-1">{reversalCondition}</p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-200">
              <span className="mr-1 font-semibold uppercase tracking-[0.08em] text-amber-200">
                Trigger:
              </span>
              {" "}
              <span>{triggerCondition}</span>
              {" "}
              <span aria-hidden="true" className="text-slate-500">·</span>
              {" "}
              <span className="mr-1 font-semibold uppercase tracking-[0.08em] text-sky-200">
                Reversal:
              </span>
              {" "}
              <span>{reversalCondition}</span>
            </p>
          )}
        </div>
      </div>
    </article>
    <div className="weather-surface grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">
          Posture
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-100">{regimeLabel}</p>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">
          Confidence
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-100">{trustStatusLabel}</p>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">
          Decision as-of
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-100">{recordDateLabel}</p>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">
          Data refreshed
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-100">{fetchedAtLabel}</p>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">
          Next refresh
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-100">{nextRefreshLabel}</p>
      </div>
    </div>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
      <article className="weather-surface space-y-3 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
          Current posture
        </p>
        <h2 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          {regimeLabel} regime is the active operating posture.
        </h2>
        <p className="text-sm leading-relaxed text-slate-200 sm:text-base">
          Start with the decision delta below, then use diagnostics and thresholds to validate the
          call before changing operating posture.
        </p>
        <dl className="grid gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 sm:grid-cols-3">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              Recommended action
            </dt>
            <dd className="mt-1 text-xs text-slate-100">
              Keep posture aligned with the highest-priority start and stop rules listed in the
              founder playbook.
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              Impact if wrong
            </dt>
            <dd className="mt-1 text-xs text-slate-100">
              Execution pacing can drift if liquidity conditions shift before the next review.
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              Next checkpoint
            </dt>
            <dd className="mt-1 text-xs text-slate-100">
              Re-check after the next data refresh and threshold confirmation.
            </dd>
          </div>
        </dl>
        <p className="text-xs text-slate-300">
          The evidence scorecard and threshold logic appear below in the standard review order.
        </p>
      </article>
      <article className="weather-surface space-y-3 p-5" aria-label="Founder decision playbook">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
          Founder operating moves
        </p>
        <h3 className="text-lg font-semibold text-slate-100">
          Convert {regimeLabel} into execution rules this week
        </h3>
        <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
            Start now
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-100" aria-label="Start rules">
            {startItems.slice(0, 3).map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-rose-800/60 bg-rose-950/20 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-200">
            Avoid now
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-100" aria-label="Stop rules">
            {stopItems.slice(0, 3).map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-300">
          Model shorthand: Posture = f(risk appetite, funding tightness, yield-curve slope).
        </p>
      </article>
      <article className="weather-surface space-y-3 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
          Top 3 movers
        </p>
        <ul className="space-y-3" aria-label="Top mover callouts">
          {topDiagnosticCallouts.map((item, index) => (
            <li
              key={item.label}
              className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3"
            >
              <p className="text-xs font-semibold tracking-[0.18em] text-slate-300">
                Mover {index + 1}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">{item.label}</p>
              <p className="mt-1 text-sm text-slate-200">{item.why}</p>
              <p className="mt-2 text-xs text-slate-300">
                Review in the current scores section below.
              </p>
            </li>
          ))}
        </ul>
      </article>
    </div>
  </section>
);

export const SignalsCurrentScoresSection = ({
  scoreCardsByType,
}: {
  scoreCardsByType: Record<
    "leading" | "lagging",
    Array<{ label: string; value: string; threshold: string; description: string }>
  >;
}) => (
  <section id="current-scores" className="weather-panel scroll-mt-28 space-y-4 px-6 py-5">
    <header className="space-y-2">
      <p className="text-sm font-semibold tracking-[0.18em] text-slate-300">Current scores</p>
      <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
        Real-time scorecard for the three regime drivers.
      </h2>
    </header>
    <div className="space-y-4">
      {(["leading", "lagging"] as const).map((type) => (
        <section key={type} className="space-y-2">
          <h3 className="text-sm font-semibold tracking-[0.14em] text-slate-300">
            {indicatorTypeLabel[type]}
          </h3>
          <div className="grid gap-3 lg:grid-cols-3">
            {scoreCardsByType[type].map((card) => (
              <article key={card.label} className="weather-surface space-y-3 p-4">
                <dl>
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                    {card.label}
                  </dt>
                  <dd className="mono mt-2 text-3xl leading-none text-slate-100">{card.value}</dd>
                </dl>
                <p className="text-sm font-semibold text-slate-200">Threshold: {card.threshold}</p>
                <p className="text-sm text-slate-300">{card.description}</p>
                <p className="text-xs text-slate-300">
                  Source signal details are listed in this scorecard.
                </p>
              </article>
            ))}
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
        Need more proof?
      </p>
      <h2 className="text-lg font-semibold text-slate-100">
        Open the full evidence appendix only when this call still needs defending.
      </h2>
      <p className="text-sm text-slate-300">
        Detail mode adds prioritized diagnostics, historical replay, threshold tuning, and advanced
        filters. Use it when the room asks “why?” or “what would change this?”
      </p>
    </div>
    <a
      href={buildSignalsViewHref(searchParams, "detail") + "#evidence-priorities"}
      className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]"
    >
      Open evidence detail
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
        Evidence priorities
      </p>
      <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
        Prioritized diagnostics by focus area.
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
            className={`weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.12em] touch-manipulation ${
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
            Priority {index + 1}
          </p>
          <p className="text-sm font-semibold text-slate-100">{item.label}</p>
          <p className="text-sm text-slate-200">{item.why}</p>
          <p className="text-xs text-slate-300">
            Use the sections below to validate this driver in sequence.
          </p>
        </li>
      ))}
    </ol>
    {additionalPriorityQueue.length ? (
      <details className="weather-surface group p-4">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold tracking-[0.14em] text-slate-200">
          <span>Show full priority queue</span>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700/70 text-slate-400 transition-transform group-open:rotate-180">
            ⌄
          </span>
        </summary>
        <ol className="mt-3 grid gap-3" aria-label="Additional prioritized signal queue">
          {additionalPriorityQueue.map((item, index) => (
            <li key={item.label} className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4">
              <p className="text-xs font-semibold tracking-[0.18em] text-slate-300">
                Priority {index + essentialPriorityQueue.length + 1}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-100">{item.label}</p>
              <p className="mt-1 text-sm text-slate-200">{item.why}</p>
              <p className="mt-2 text-xs text-slate-300">
                Validate this item in the matching section below.
              </p>
            </li>
          ))}
        </ol>
      </details>
    ) : null}
  </section>
);

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
  SignalVisualizationSuite: ComponentType<any> | null;
  treasury: any;
  yieldCurveSeries: any;
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
            ? "Showing the full diagnostic set for deep validation and audits."
            : "Start with the top 3 drivers. Expand only when you need full diagnostic depth."}
        </p>
      </div>
      <a
        href={buildDiagnosticsExpansionHref(searchParams, !showFullDiagnostics)}
        className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] hover:border-sky-400/70 hover:text-slate-100"
      >
        {showFullDiagnostics ? "Show top 3 only" : "Show full diagnostics"}
      </a>
    </div>

    {!showFullDiagnostics ? (
      <ol className="grid gap-3 md:grid-cols-3" aria-label="Top 3 signal drivers">
        {topDiagnosticCallouts.map((item, index) => (
          <li key={item.label} className="weather-surface space-y-2 p-4">
            <p className="text-xs font-semibold tracking-[0.18em] text-slate-300">
              Driver {index + 1}
            </p>
            <p className="text-sm font-semibold text-slate-100">{item.label}</p>
            <p className="text-sm text-slate-200">{item.why}</p>
            <p className="text-xs text-slate-300">
              Review this driver in the evidence stack below.
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
    <div className="grid gap-4 rounded-2xl border border-slate-800/80 bg-slate-950/50 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="space-y-3">
        <div className="flex min-h-[44px] items-center gap-3 text-sm font-semibold text-slate-100">
          <span>Advanced filters and historical tools</span>
          <span className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs tracking-[0.14em] text-slate-200">
            {showAdvanced ? "Open" : "Closed"}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-slate-300">
          Keep historical replay visible for the default audit loop. Use advanced controls only for
          threshold tuning and deeper timeline diagnostics.
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
