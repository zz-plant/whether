import type { ReactNode } from "react";

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
      <main className="space-y-4" aria-label="Weekly decision transmission order">
        {modePanel}
        {influenceSection}
        {diagnosticsSection}
        {matrixSection}
        {actionStripSection}
      </main>

      <aside className="space-y-4 xl:sticky xl:top-28">
        {asideContent}
      </aside>
    </div>
  );
}
