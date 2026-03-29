import type { ReactNode } from "react";
import { disclosureSummaryClass } from "../shared";

type WeeklyDecisionContentProps = {
  modePanel: ReactNode;
  influenceSection: ReactNode;
  diagnosticsSection: ReactNode;
  matrixSection: ReactNode;
  actionStripSection: ReactNode;
  asideContent: ReactNode;
};

export function WeeklyDecisionContent({
  modePanel,
  influenceSection,
  diagnosticsSection,
  matrixSection,
  actionStripSection,
  asideContent,
}: WeeklyDecisionContentProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.28fr)_minmax(19rem,0.82fr)] xl:items-start">
      <main className="space-y-4 xl:col-start-1" aria-label="Weekly decision transmission order">
        {modePanel}
        {actionStripSection}
      </main>

      <aside className="space-y-4 xl:sticky xl:top-28 xl:col-start-2 xl:row-start-1">
        {asideContent}
      </aside>

      <section className="xl:col-span-2">
        <details id="deep-evidence" className="group rounded-xl border border-slate-800/70 bg-slate-950/45 px-3 py-2">
          <summary className={`${disclosureSummaryClass} cursor-pointer list-none`}>
            <span>Deep evidence</span>
            <span aria-hidden="true" className="weather-disclosure-trigger-indicator text-sm group-open:rotate-180">▾</span>
          </summary>
          <div className="weather-disclosure-panel animate-collapsible-in mt-2 space-y-4">
            {influenceSection}
            {diagnosticsSection}
            {matrixSection}
          </div>
        </details>
      </section>
    </div>
  );
}
