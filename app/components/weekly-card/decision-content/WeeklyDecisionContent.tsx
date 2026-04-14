import type { ReactNode } from "react";

type WeeklyDecisionContentProps = {
  modePanel: ReactNode;
  actionStripSection: ReactNode;
};

export function WeeklyDecisionContent({
  modePanel,
  actionStripSection,
}: WeeklyDecisionContentProps) {
  return (
    <div className="space-y-4">
      <main className="space-y-5 xl:col-start-1" aria-label="Weekly decision transmission order">
        {modePanel}
      </main>

      {actionStripSection ? (
        <section>
          {actionStripSection}
        </section>
      ) : null}
    </div>
  );
}
