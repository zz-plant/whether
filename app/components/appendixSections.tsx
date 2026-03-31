import type { ReactNode } from "react";
import Link from "next/link";
import { Collapsible } from "@base-ui/react/collapsible";
import type { RegimeAssessment } from "../../lib/regimeEngine";
import type { PlaybookEntry } from "../../lib/playbook";
import type { ActionStripItem } from "../../lib/report/operatingCalls";
import {
  buildMonthlySummary,
  getMonthlyActionGuidance,
} from "../../lib/summary/monthlySummary";
import { buildWeeklySummary } from "../../lib/summary/weeklySummary";
import { buildCadenceAlignment } from "../../lib/cadenceAlignment";
import { formatDateUTC } from "../../lib/formatters";
import { DataProvenanceStrip, type DataProvenance } from "./dataProvenanceStrip";
import { MonthlySummaryCard } from "./monthlySummaryCard";
import { SummaryDeltaPanel } from "./summaryDeltaPanel";
import { CollapsibleDeepDive } from "./collapsibleDeepDive";
import { insightDatabase } from "../../data/recommendations";
import {
  getRegimeBadge,
  getRegimeLabel,
} from "./reportSectionUtils";
export { RegimeAssessmentCard } from "./appendix/RegimeAssessmentCard";
export { SignalMatrixPanel } from "./appendix/SignalMatrixPanel";
export { InsightDatabasePanel } from "./appendix/InsightDatabasePanel";
export {
  FirstTimeGuidePanel,
  BeginnerGlossaryPanel,
} from "./appendix/OnboardingPanels";
export {
  OperatorRequestsPanel,
  CxoFunctionPanel,
} from "./appendix/ReferencePanels";
export { SensorArray } from "./appendix/SensorArray";
export { MacroSignalsPanel } from "./appendix/MacroSignalsPanel";
export {
  ExecutiveSnapshotPanel,
  WeeklyActionSummaryPanel,
} from "./boardBriefSections";
export { HistoricalBanner } from "./historicalBanner";


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
