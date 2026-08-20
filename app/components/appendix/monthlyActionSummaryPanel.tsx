import type { ReactNode } from "react";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import {
  buildMonthlySummary,
  getMonthlyActionGuidance,
  getMonthlyOperatingRules,
} from "../../../lib/summary/monthlySummary";
import { buildWeeklySummary } from "../../../lib/summary/weeklySummary";
import { buildCadenceAlignment } from "../../../lib/cadenceAlignment";
import type { DataProvenance } from "../dataProvenanceStrip";
import { MonthlySummaryCard } from "../monthlySummaryCard";
import { SummaryDeltaPanel } from "../summaryDeltaPanel";
import { getRegimeLabel } from "../reportSectionUtils";

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
          <div
            key={block.heading}
            className={`weather-surface p-4 ${index % 2 === 0 ? "weather-surface-sky" : "weather-surface-indigo"}`}
          >
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
              {block.heading}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {block.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="text-slate-400">•</span>
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
  const operatingRules = getMonthlyOperatingRules(assessment);
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
      heading: "Monthly operating rules",
      bullets: operatingRules.flatMap((rule) => [
        `Action: ${rule.action}`,
        `Threshold: ${rule.threshold}`,
        `Reversal: ${rule.reversal}`,
      ]),
    },
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
        "“Only one major growth bet at a time until funding pressure eases.”",
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
                  <span className="text-slate-400">•</span>
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
