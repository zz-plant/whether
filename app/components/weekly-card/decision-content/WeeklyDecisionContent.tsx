import Link from "next/link";
import type { ReactNode } from "react";
import { CompactDisclosure } from "../../compactDisclosure";
import { disclosureSummaryClass } from "../shared";

type WeeklyDecisionContentProps = {
  modePanel: ReactNode;
  influenceSection: ReactNode;
  diagnosticsSection: ReactNode;
  matrixSection: ReactNode;
  contextSection: ReactNode;
  actionStripSection: ReactNode;
  asideContent: ReactNode;
};

export function WeeklyDecisionContent({
  modePanel,
  influenceSection,
  diagnosticsSection,
  matrixSection,
  contextSection,
  actionStripSection,
  asideContent,
}: WeeklyDecisionContentProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(19.5rem,0.78fr)] xl:items-start">
      <main className="space-y-5 xl:col-start-1" aria-label="Weekly decision transmission order">
        {modePanel}
        {actionStripSection}
      </main>

      <aside className="space-y-5 xl:sticky xl:top-28 xl:col-start-2 xl:row-start-1">
        {asideContent}
      </aside>

      <section className="xl:col-span-2">
        <CompactDisclosure
          id="deep-evidence"
          queryKey="deepEvidence"
          summary="Deep evidence"
          className="group overflow-hidden rounded-[1.25rem] border border-slate-800/70 bg-[linear-gradient(180deg,rgba(10,16,28,0.72),rgba(4,10,20,0.9))] px-3 py-2.5 shadow-[0_18px_36px_-28px_rgba(2,6,23,0.8)]"
          summaryClassName={disclosureSummaryClass}
        >
          <div className="weather-disclosure-panel animate-collapsible-in mt-3 space-y-4">
            <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 px-3 py-3 text-xs leading-5 text-slate-300">
              Evidence owns the full proof path. Use this section for compact support only, or open{" "}
              <Link href="/signals" className="font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
                Evidence
              </Link>{" "}
              for drivers, thresholds, and replay.
            </div>
            {influenceSection}
            {diagnosticsSection}
            {matrixSection}
            {contextSection}
          </div>
        </CompactDisclosure>
      </section>
    </div>
  );
}
