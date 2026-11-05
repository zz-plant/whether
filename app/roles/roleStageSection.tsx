import type { ScopedVariantDecisionAdjustment } from "../../lib/report/boundedDecisionRules";

/** The stage's own rule, beside what it means for someone asking for a budget. */
export function RoleStageSection({
  atCompanies,
  askFor,
  adjustment,
}: {
  atCompanies: string;
  askFor: string;
  adjustment: ScopedVariantDecisionAdjustment;
}) {
  return (
    <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6" data-testid="role-stage">
      <h2 className="text-lg font-semibold text-slate-100">What changes at {atCompanies}</h2>
      <p className="text-sm text-slate-200">{askFor}</p>
      <div className="space-y-1 border-t border-[color:var(--border-faint)] pt-3 text-sm text-slate-200">
        <h3 className="font-semibold text-slate-100">The general rule at this stage</h3>
        <p className="text-slate-300">{adjustment.description}</p>
        <ul className="list-disc space-y-1 pl-5">
          {adjustment.doNowAdjustments.map((line) => <li key={line}>{line}</li>)}
          {adjustment.avoidAdjustments.map((line) => <li key={line}>{line}</li>)}
        </ul>
        {/* These lines name their own trigger and reversal, so a slot label beside them would say it twice. */}
        {adjustment.watchAdjustments[0] ? <p>{adjustment.watchAdjustments[0]}</p> : null}
        <p>{adjustment.reversalTriggerDiscipline}</p>
      </div>
    </section>
  );
}
