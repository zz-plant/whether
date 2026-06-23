import { insightDatabase } from "../../../data/recommendations";
import { CollapsibleDeepDive } from "../collapsibleDeepDive";
import { DataProvenanceStrip, type DataProvenance } from "../dataProvenanceStrip";

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
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
            Executive summary
          </p>
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
                    <span className="text-xs font-semibold tracking-[0.12em] text-slate-400">
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
