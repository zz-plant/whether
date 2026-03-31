/**
 * Appendix section components for supporting evidence and operations diagnostics.
 * Keeps layout blocks focused and reusable outside the weekly governance brief core.
 */
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
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
import type { ActionStripItem } from "../../lib/report/operatingCalls";
import type {
  MacroSeriesReading,
  SensorReading,
  SensorTimeWindow,
} from "../../lib/types";
import {
  getSensorWindowAggregation,
  sensorTimeWindows,
} from "../../lib/sensors";
import { cxoFunctionOutputs } from "../../lib/cxoFunctionOutputs";
import { operatorRequests } from "../../lib/operatorRequests";
import {
  buildMonthlySummary,
  getMonthlyActionGuidance,
} from "../../lib/summary/monthlySummary";
import { buildWeeklySummary } from "../../lib/summary/weeklySummary";
import { buildCadenceAlignment } from "../../lib/cadenceAlignment";
import { formatDateUTC, formatTimestampUTC } from "../../lib/formatters";
import { buildMacroPriorityScore, rankMacroSignalsByPriority } from "../../lib/macroPrioritization";
import {
  BEGINNER_GLOSSARY_ENTRIES,
  FIRST_TIME_GUIDE_HIGHLIGHTS,
  FIRST_TIME_GUIDE_NEXT_LINKS,
  FIRST_TIME_GUIDE_STEPS,
  GLOSSARY_USAGE_NOTES,
} from "../../lib/report/reportCopy";
import { DataProvenanceStrip, type DataProvenance } from "./dataProvenanceStrip";
import { MonthlySummaryCard } from "./monthlySummaryCard";
import { SummaryDeltaPanel } from "./summaryDeltaPanel";
import { RegimeBadgeIcon } from "./regimeIcons";
import { CollapsibleDeepDive } from "./collapsibleDeepDive";
import { insightDatabase } from "../../data/recommendations";
import {
  buildSparkline,
  clampToRange,
  formatDelta,
  formatNumber,
  getRegimeAccent,
  getRegimeBadge,
  getRegimeLabel,
  regimeBadges,
  SPARKLINE_HEIGHT,
  SPARKLINE_WIDTH,
  sortClimateKeys,
} from "./reportSectionUtils";
import { useClipboardCopy } from "./useClipboardCopy";
import { SeriesFreshnessBadge } from "./appendix/SeriesFreshnessBadge";
export { RegimeAssessmentCard } from "./appendix/RegimeAssessmentCard";
export { SignalMatrixPanel } from "./appendix/SignalMatrixPanel";
export { InsightDatabasePanel } from "./appendix/InsightDatabasePanel";
export {
  ExecutiveSnapshotPanel,
  WeeklyActionSummaryPanel,
} from "./boardBriefSections";
export { HistoricalBanner } from "./historicalBanner";

/* RegimeBadgeIcon moved to components/regimeIcons.tsx */


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
        {blocks.map((block, index) => (
          <div key={block.heading} className={`weather-surface p-4 ${index % 2 === 0 ? "weather-surface-sky" : "weather-surface-indigo"}`}>
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


export const MonthlyActionSummaryPanel = ({
  assessment,
  provenance,
  recordDateLabel,
  weeklyRecordDateLabel,
}: {
  assessment: RegimeAssessment;
  provenance: DataProvenance;
  recordDateLabel: string;
  weeklyRecordDateLabel: string;
}) => {
  const regimeLabel = getRegimeLabel(assessment.regime);
  const actionGuidance = getMonthlyActionGuidance(assessment.regime);
  const weeklySummary = buildWeeklySummary({
    assessment,
    provenance,
    recordDateLabel: weeklyRecordDateLabel,
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
        "“These three bets can still pay back within the operating guardrails.”",
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
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Scan order</p>
          <ul className="space-y-3">
            {FIRST_TIME_GUIDE_STEPS.map((step, index) => (
              <li key={step.label} className="weather-surface p-4 text-sm text-slate-300">
                <Collapsible.Root className="space-y-2">
                  <Collapsible.Trigger
                    type="button"
                    className="group flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-slate-800/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700/70 bg-slate-950 text-xs font-semibold text-slate-300">
                        {index + 1}
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
        </div>
        <aside className="weather-surface p-4" aria-label="Onboarding highlights">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
            Quick scan highlights
          </p>
          <ul className="mt-3 space-y-3 text-sm text-slate-300">
            {FIRST_TIME_GUIDE_HIGHLIGHTS.map((highlight) => (
              <li key={highlight.text} className="flex gap-2">
                <span className="text-slate-500">•</span>
                <span>{highlight.text}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg border border-sky-900/60 bg-slate-950/60 p-3 text-xs text-slate-400">
            Tip: share the selected time-machine URL to keep assumptions aligned.
          </div>
        </aside>
      </div>

      <div className="mt-6 space-y-3 text-sm text-slate-300">
        <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Where to go next</p>
        <ul className="grid gap-2 md:grid-cols-3">
          {FIRST_TIME_GUIDE_NEXT_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="weather-surface touch-target inline-flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100"
              >
                {link.label}
                <span aria-hidden="true">→</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 text-xs text-slate-300">
        Share the URL when you lock thresholds or time machine selections so every stakeholder sees
        the same posture assumptions.
      </p>
    </div>
  </section>
);

export const BeginnerGlossaryPanel = () => {
  return (
    <section id="beginner-glossary" aria-labelledby="beginner-glossary-title" className="mt-10 scroll-mt-28">
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
          <aside className="weather-surface p-4" aria-label="Glossary sidebar">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Glossary terms</p>
            <Accordion.Root
              multiple
              className="mt-3 space-y-3 text-sm text-slate-300"
            >
              {BEGINNER_GLOSSARY_ENTRIES.map((entry) => (
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
          <div className="space-y-4">
            {GLOSSARY_USAGE_NOTES.map((note) => (
              <div key={note.title} className="weather-surface p-4 text-sm text-slate-300">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-200">{note.title}</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-400">
                  {note.bullets.map((bullet) => (
                    <li key={bullet.emphasis}>
                      <span className="text-slate-200">{bullet.emphasis}</span>{" "}
                      {bullet.detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export const OperatorRequestsPanel = ({
  provenance,
  showProvenance = true,
}: {
  provenance: DataProvenance;
  showProvenance?: boolean;
}) => {
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
        {showProvenance ? <DataProvenanceStrip provenance={provenance} /> : null}
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

export const CxoFunctionPanel = ({
  provenance,
  showProvenance = true,
}: {
  provenance: DataProvenance;
  showProvenance?: boolean;
}) => (
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
      {showProvenance ? <DataProvenanceStrip provenance={provenance} /> : null}
    </div>
    <p className="mt-3 max-w-3xl type-data text-slate-300">
      Each module below translates capital posture signals into CXO-ready artifacts. Use them to align
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
          <p className="type-label text-slate-400">Capital posture summary</p>
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
                  className={`inline-flex min-h-[44px] items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.12em] ${regimeBadge?.classes ?? "border-slate-600/60 bg-slate-500/10 text-slate-100"
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
            <p className="type-label text-slate-400">Capital posture change alerts</p>
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
                <Link
                  href="/signals?advanced=1#time-machine"
                  className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-sky-500/40 bg-slate-950/70 px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
                >
                  Open Time Machine
                </Link>
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
                  <span>Regime flips between Scarcity, Safety, Stability, and Growth.</span>
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
                    <line x1={0} x2={SPARKLINE_WIDTH} y1={sparkline.medianY} y2={sparkline.medianY} stroke="#334155" strokeDasharray="2 2" strokeWidth="1" />
                    <path
                      d={sparkline.path}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      vectorEffect="non-scaling-stroke"
                      pathLength={100}
                    />
                    <circle cx={sparkline.latest.x} cy={sparkline.latest.y} r="1.8" fill="#e2e8f0" />
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
                  {sparkline ? (
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {sparkline.direction === "up" ? "Direction up" : sparkline.direction === "down" ? "Direction down" : "Direction flat"} · Δ {formatDelta(sparkline.delta, sensor.unit)}
                    </p>
                  ) : null}
                  <p className="break-words">{sensor.explanation}</p>
                </figcaption>
              </figure>
              <div className="mt-4 text-xs text-slate-300">
                <p>
                  Formula:{" "}
                  <a
                    href={sensor.formulaUrl}
                    className="touch-target text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-slate-100"
                  >
                    Formula notes
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
        <CollapsibleDeepDive label="Deep dive: signal cards and freshness checks" panelClassName="mt-4 grid gap-4 md:grid-cols-3">
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
                        <line x1={0} x2={SPARKLINE_WIDTH} y1={sparkline.medianY} y2={sparkline.medianY} stroke="#334155" strokeDasharray="2 2" strokeWidth="1" />
                        <path
                          d={sparkline.path}
                          fill="none"
                          stroke="#fbbf24"
                          strokeWidth="1.5"
                          vectorEffect="non-scaling-stroke"
                          pathLength={100}
                        />
                        <circle cx={sparkline.latest.x} cy={sparkline.latest.y} r="1.8" fill="#fde68a" />
                      </svg>
                    ) : (
                      <div
                        className="h-8 rounded-md border border-sky-900/40 bg-slate-950/80"
                        aria-hidden="true"
                      />
                    )}
                    <figcaption className="mt-2 space-y-1 text-xs text-slate-500">
                      {sparkline ? (
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {sparkline.direction === "up" ? "Direction up" : sparkline.direction === "down" ? "Direction down" : "Direction flat"} · Δ {formatDelta(sparkline.delta, signal.unit)}
                        </p>
                      ) : null}
                      <p>{signal.explanation}</p>
                    </figcaption>
                  </figure>
                  <div className="mt-3 text-xs text-slate-500">
                    <p>
                      Formula:{" "}
                      <a
                        href={signal.formulaUrl}
                        className="touch-target text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-slate-100"
                      >
                        Formula notes
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
        </CollapsibleDeepDive>
      </div>
    </section>
  );
};

export const getVisibleActionLaneItems = <T,>(items: T[], showAll: boolean) =>
  (showAll ? items : items.slice(0, 3));

export const PlaybookPanel = ({
  playbook,
  stopItems,
  startItems,
  fenceItems,
  provenance,
  showProvenance = true,
  actionStripItems = [],
  showAllActionLanes = false,
}: {
  playbook: PlaybookEntry | null;
  stopItems: string[];
  startItems: string[];
  fenceItems: string[];
  provenance: DataProvenance;
  showProvenance?: boolean;
  actionStripItems?: ActionStripItem[];
  showAllActionLanes?: boolean;
}) => {
  const visibleStopItems = getVisibleActionLaneItems(stopItems, showAllActionLanes);
  const visibleStartItems = getVisibleActionLaneItems(startItems, showAllActionLanes);
  const visibleFenceItems = getVisibleActionLaneItems(fenceItems, showAllActionLanes);
  const visibleActionStripItems = getVisibleActionLaneItems(actionStripItems, showAllActionLanes);
  const playbookQuickLinks = [
    { href: "/operations#ops-decision-shield", label: "Decision shield" },
    { href: "/operations#ops-strategy-brief", label: "Strategy brief" },
    { href: "/operations#ops-export-briefs", label: "Export briefs" },
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
              : "Playbook data unavailable. Use operating guardrails until data recovers."}
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Align the team on what to stop, start, and fence before approvals move forward.
          </p>
        </div>
        <CollapsibleDeepDive label="Deep dive: playbook snapshot and action lanes" panelClassName="mt-4 space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.25fr,0.75fr]">
              <div className="grid gap-4 lg:grid-cols-3 lg:col-span-2">
                <div className="weather-surface border-l-4 border-rose-500/50 bg-rose-500/10 p-4">
                  <p className="text-xs font-semibold tracking-[0.12em] text-rose-100">Don&apos;t (stop)</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {visibleStopItems.map((item) => (
                      <li key={item} className="break-words">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="weather-surface border-l-4 border-emerald-400/50 bg-emerald-500/10 p-4">
                  <p className="text-xs font-semibold tracking-[0.12em] text-emerald-100">Do (start)</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {visibleStartItems.map((item) => (
                      <li key={item} className="break-words">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="weather-surface border-l-4 border-sky-400/50 p-4">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Fence</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {visibleFenceItems.map((item) => (
                      <li key={item} className="break-words">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="grid gap-3">
                <div className="weather-surface p-4">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Action strip contract</p>
                  <ul className="mt-3 space-y-2 text-xs text-slate-300">
                    {visibleActionStripItems.map((item) => (
                      <li key={item.lever} className="rounded-md border border-slate-700/70 bg-slate-900/70 p-2">
                        <p className="font-semibold text-slate-100">{item.label}</p>
                        <p className="mt-1 text-emerald-100">Action now: {item.actionNow}</p>
                        <p className="mt-1 text-amber-100">Pause if: {item.triggerThreshold}</p>
                        <p className="mt-1 text-sky-100">Change course if: {item.reversalCondition}</p>
                      </li>
                    ))}
                  </ul>
                </div>
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
                {showProvenance ? <DataProvenanceStrip provenance={provenance} /> : null}
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
        </CollapsibleDeepDive>
      </div>
    </section>
  );
};

export const FinanceStrategyPanel = ({
  regime,
  provenance,
  showProvenance = true,
}: {
  regime: RegimeAssessment["regime"];
  provenance: DataProvenance;
  showProvenance?: boolean;
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
          {showProvenance ? <DataProvenanceStrip provenance={provenance} /> : null}
        </div>
        <div className="mt-4 weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Executive summary</p>
          <p className="mt-2 text-sm text-slate-200">
            {entry?.runwayPosture ?? "Runway posture will update when data refreshes."}
          </p>
        </div>
        <CollapsibleDeepDive
          label="Deep dive: runway guidance and watchlist"
          panelClassName="mt-4 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]"
        >
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
              <p className="mt-4 text-xs text-slate-300">
                Public data only. No internal finance inputs required.
              </p>
            </div>
        </CollapsibleDeepDive>
      </div>
    </section>
  );
};

export const DecisionShieldTemplatesPanel = ({
  provenance,
  showProvenance = true,
}: {
  provenance: DataProvenance;
  showProvenance?: boolean;
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
          {showProvenance ? <DataProvenanceStrip provenance={provenance} /> : null}
        </div>
        <div className="mt-4 weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Executive summary</p>
          <p className="mt-2 text-sm text-slate-200">
            Use these templates as default decision language when you brief leadership or document
            approvals.
          </p>
        </div>
        <CollapsibleDeepDive
          label="Deep dive: decision shield templates by regime"
          panelClassName="mt-4 grid gap-4 md:grid-cols-3"
        >
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
        </CollapsibleDeepDive>
      </div>
    </section>
  );
};
