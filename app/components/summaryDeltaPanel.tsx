/**
 * Summary delta panel comparing weekly and monthly action guidance.
 * Uses SummaryCard styling to keep the delta lane consistent with copy-ready cards.
 */
import { ActionLink } from "./ui/actionLink";
import type { MonthlySummary } from "../../lib/summary/monthlySummary";
import type { WeeklySummary } from "../../lib/summary/weeklySummary";
import { buildSummaryDelta } from "../../lib/summary/summaryDelta";

export const SummaryDeltaPanel = ({
  weeklySummary,
  monthlySummary,
}: {
  weeklySummary: WeeklySummary;
  monthlySummary: MonthlySummary;
}) => {
  const delta = buildSummaryDelta(weeklySummary, monthlySummary);

  return (
    <div className="weather-surface mt-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Delta</p>
          <p className="mt-2 text-sm text-slate-300">
            Weekly-to-monthly shifts in regime posture, constraints, and data freshness.
          </p>
        </div>
        <ActionLink href="/api/summary-delta" variant="ghost">
          View delta API
        </ActionLink>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-slate-300">
        {delta.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <span className="text-slate-400">•</span>
            <span className="break-words">{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
