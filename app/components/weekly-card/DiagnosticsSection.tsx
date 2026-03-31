import { Accordion } from "@base-ui/react/accordion";
import { formatDateUTC } from "../../../lib/formatters";
import { formatProbabilityPercent } from "../../../lib/report/reportFormatting";
import { compactActionCue, compactRoleCue, compactSectionSpacing, disclosurePanelClass, disclosureSummaryClass, neutralLabel, sectionSpacing, tierTwoHeading, tierTwoPanel, tierThreePanel } from "./shared";
import type { DiagnosticsSectionProps } from "./types";

const DiagnosticsAccordionTrigger = ({ label }: { label: string }) => (
  <Accordion.Header>
    <Accordion.Trigger className={`${disclosureSummaryClass} group cursor-pointer list-none touch-manipulation`}>
      <span>{label}</span>
      <span aria-hidden="true" className="weather-disclosure-trigger-indicator text-sm group-data-[panel-open]:rotate-180">▾</span>
    </Accordion.Trigger>
  </Accordion.Header>
);

const regimeProbabilityTone = {
  Scarcity: "bg-rose-400/80 text-rose-50",
  Defensive: "bg-amber-400/80 text-amber-950",
  Mixed: "bg-sky-400/80 text-sky-950",
  Expansion: "bg-emerald-400/80 text-emerald-950",
} as const;

function RegimeProbabilityStrip({
  transitionProbabilities,
}: Pick<DiagnosticsSectionProps, "transitionProbabilities">) {
  const orderedStates = (["Scarcity", "Defensive", "Mixed", "Expansion"] as const).map((label) => ({
    label,
    value: Math.max(0, transitionProbabilities[label] ?? 0),
  }));
  const total = orderedStates.reduce((sum, state) => sum + state.value, 0) || 1;
  const leadingState = orderedStates.reduce((highest, state) => (state.value > highest.value ? state : highest), orderedStates[0]);

  return (
    <article className="mt-2 border-t border-slate-800/50 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-xs ${neutralLabel}`}>Risk distribution</p>
        <p className="text-[11px] text-slate-400">Most likely: {leadingState.label} {formatProbabilityPercent(leadingState.value)}</p>
      </div>
      <div className="mt-2 flex h-3 overflow-hidden rounded-full border border-slate-800/70 bg-slate-950/60" aria-hidden="true">
        {orderedStates.map((state) => (
          <div
            key={state.label}
            className={`${regimeProbabilityTone[state.label]} h-full`}
            style={{ width: `${(state.value / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="mt-2 grid gap-1 text-xs text-slate-300 sm:grid-cols-2">
        {orderedStates.map((state) => (
          <li key={state.label} className="flex items-center justify-between gap-2 rounded-lg border border-slate-800/70 bg-slate-950/40 px-2.5 py-2">
            <span>{state.label}</span>
            <span className="font-semibold text-slate-100">{formatProbabilityPercent(state.value)}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function DiagnosticsSection({
  weeklyMemoLines,
  immediateDecision,
  revisitDecisions,
  guardrail,
  regimeDistance,
  roleAwareTemplates,
  evidenceItems,
  reportDynamics,
  weeklyMovement,
  transitionProbabilities,
  failureModes,
  sinceLastReview,
}: DiagnosticsSectionProps) {
  const changedItems = sinceLastReview?.items ?? [];
  const firstDelta = changedItems[0]?.detail ?? weeklyMemoLines.find((line) => line.trim().length > 0) ?? immediateDecision;
  const flipDirection = regimeDistance.thresholdDirection === "riseAbove" ? "rises above" : "falls to or below";
  const flipDistance = Math.max(0, Math.round(regimeDistance.pointsToFlip));
  const topContributors = (reportDynamics.signalContributions ?? []).slice(0, 2).map((item) => `${item.label} (${item.normalizedPercentLabel})`).join(" · ") || "No active contributors this week.";

  return (
    <>
      <article className={`${tierTwoPanel} ${sectionSpacing}`} aria-label="Decision detail">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Need deeper analysis?</p>
        <h2 className={tierTwoHeading}>Decision detail</h2>
        <p className="text-xs leading-5 text-slate-300">Want the backing detail? Expand the sections below to see what changed, what to watch, and why.</p>
        <Accordion.Root defaultValue={["since-last-review"]} className="space-y-2">
          <Accordion.Item value="since-last-review" className="group">
            <DiagnosticsAccordionTrigger label="Delta" />
            <Accordion.Panel className={disclosurePanelClass}>
              <ul className="grid gap-2 sm:grid-cols-3">
                <li className="border-l border-slate-700/60 pl-3 py-1"><p className={`text-xs ${neutralLabel}`}>Delta</p><p className="mt-1 text-xs text-slate-200">{firstDelta}</p></li>
                <li className="border-l border-slate-700/60 pl-3 py-1"><p className={`text-xs ${neutralLabel}`}>Revisit</p><p className="mt-1 text-xs text-slate-200">{revisitDecisions ? `Yes — ${guardrail}` : "No — hold last week’s posture."}</p></li>
                <li className="border-l border-slate-700/60 pl-3 py-1"><p className={`text-xs ${neutralLabel}`}>Flip line</p><p className="mt-1 text-xs text-slate-200">{regimeDistance.dimensionLabel} {flipDirection} {regimeDistance.thresholdValue.toFixed(1)} ({flipDistance} pts away).</p></li>
              </ul>
              {changedItems.length > 1 ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {changedItems.slice(1, 3).map((item) => (
                    <article key={item.id} className="border-l border-slate-700/60 pl-3 py-1">
                      <p className={`text-xs ${neutralLabel}`}>{item.label}</p>
                      <p className="mt-1 text-xs text-slate-200">{item.detail}</p>
                    </article>
                  ))}
                </div>
              ) : null}
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="evidence-drivers-model-inputs" className={`${tierThreePanel} ${compactSectionSpacing} group`}>
            <DiagnosticsAccordionTrigger label="Evidence pack" />
            <Accordion.Panel className={disclosurePanelClass}>
              <article className="py-1"><p className={`text-xs ${neutralLabel}`}>Evidence</p><ul className="mt-1 space-y-1 text-xs text-slate-200">{evidenceItems.map((item) => <li key={item.key}>• {item.title} (Updated {item.lastUpdated ? formatDateUTC(item.lastUpdated) : "—"}): {item.immediateImplication}</li>)}</ul></article>
              <article className="mt-2 border-t border-slate-800/50 pt-2"><p className={`text-xs ${neutralLabel}`}>Drivers</p><p className="mt-1 text-xs text-slate-300">Top contributors: {topContributors}</p><p className="mt-1 text-xs text-slate-300">Weekly movement: {weeklyMovement.summary.replace(/\.$/, "")}</p></article>
              <RegimeProbabilityStrip transitionProbabilities={transitionProbabilities} />
              {failureModes.length > 0 ? <article className="mt-2 border-t border-slate-800/50 pt-2"><p className={`text-xs ${neutralLabel}`}>False-signal warnings</p><ul className="mt-1 space-y-1 text-xs text-slate-300">{failureModes.slice(0, 2).map((mode) => <li key={mode.id}>• {mode.warning}</li>)}</ul></article> : null}
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion.Root>
      </article>
    </>
  );
}
