import { Accordion } from "@base-ui/react/accordion";
import { formatDateUTC } from "../../../lib/formatters";
import { formatProbabilityPercent } from "../../../lib/report/reportFormatting";
import { HistorySection } from "./HistorySection";
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
  historicalTimeline,
  sinceLastReview,
  decisionMatrix,
  decisionRules,
  renderBoundedRulesMatrix,
}: DiagnosticsSectionProps) {
  const changedItems = sinceLastReview?.items ?? [];
  const firstDelta = changedItems[0]?.detail ?? weeklyMemoLines.find((line) => line.trim().length > 0) ?? immediateDecision;
  const flipDirection = regimeDistance.thresholdDirection === "riseAbove" ? "rises above" : "falls to or below";
  const flipDistance = Math.max(0, Math.round(regimeDistance.pointsToFlip));
  const topContributors = (reportDynamics.signalContributions ?? []).slice(0, 2).map((item) => `${item.label} (${item.normalizedPercentLabel})`).join(" · ") || "No active contributors this week.";

  return (
    <>
      <article className={`${tierTwoPanel} ${sectionSpacing}`} aria-label="Audit trail">
        <h2 className={tierTwoHeading}>Audit trail</h2>
        <p className="text-xs leading-5 text-slate-300">Need deeper analysis? Open the supporting lanes below without leaving the weekly call.</p>
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
          <Accordion.Item value="decision-matrix" className="group">
            <DiagnosticsAccordionTrigger label="Decision lanes" />
            <Accordion.Panel className={disclosurePanelClass}>{renderBoundedRulesMatrix({ decisionMatrix, decisionRules })}</Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="role-plan" className="group">
            <DiagnosticsAccordionTrigger label="Role translation" />
            <Accordion.Panel className={`${disclosurePanelClass} grid gap-3 sm:grid-cols-2`}>
              {roleAwareTemplates.map((template) => (
                <article key={template.role} className="border-l border-slate-700/60 pl-3 py-1 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">{template.roleLabel}</p>
                  <p className="text-xs text-emerald-100"><span className="mr-1 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-100">↑ Now</span>{compactRoleCue(template.doNow)}</p>
                  <p className="text-xs text-rose-100"><span className="mr-1 rounded-full border border-rose-400/35 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-rose-100">∥ Hold</span>{compactRoleCue(template.avoidNow)}</p>
                  <p className="text-xs text-sky-100"><span className="mr-1 rounded-full border border-sky-400/35 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-100">↺ Flip</span>{compactActionCue(template.flipTrigger)}</p>
                </article>
              ))}
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="evidence-drivers-model-inputs" className={`${tierThreePanel} ${compactSectionSpacing} group`}>
            <DiagnosticsAccordionTrigger label="Evidence pack" />
            <Accordion.Panel className={disclosurePanelClass}>
              <article className="py-1"><p className={`text-xs ${neutralLabel}`}>Evidence</p><ul className="mt-1 space-y-1 text-xs text-slate-200">{evidenceItems.map((item) => <li key={item.key}>• {item.title} (Updated {item.lastUpdated ? formatDateUTC(item.lastUpdated) : "—"}): {item.immediateImplication}</li>)}</ul></article>
              <article className="mt-2 border-t border-slate-800/50 pt-2"><p className={`text-xs ${neutralLabel}`}>Drivers</p><p className="mt-1 text-xs text-slate-300">Top contributors: {topContributors}</p><p className="mt-1 text-xs text-slate-300">Weekly movement: {weeklyMovement.summary.replace(/\.$/, "")}</p></article>
              <article className="mt-2 border-t border-slate-800/50 pt-2"><p className={`text-xs ${neutralLabel}`}>Model inputs</p><p className="mt-1 text-xs text-slate-300">Defensive probability: {formatProbabilityPercent(transitionProbabilities.Defensive)}</p></article>
              {failureModes.length > 0 ? <article className="mt-2 border-t border-slate-800/50 pt-2"><p className={`text-xs ${neutralLabel}`}>False-signal warnings</p><ul className="mt-1 space-y-1 text-xs text-slate-300">{failureModes.slice(0, 2).map((mode) => <li key={mode.id}>• {mode.warning}</li>)}</ul></article> : null}
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion.Root>
      </article>
      <HistorySection historicalTimeline={historicalTimeline.slice(-2)} />
    </>
  );
}
