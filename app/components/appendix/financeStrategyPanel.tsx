import { insightDatabase } from "../../../data/recommendations";
import type { RegimeAssessment } from "../../../lib/regimeEngine";

type FinanceStrategyEntry = (typeof insightDatabase.financeStrategyMode.regimes)[number];

/**
 * This week's finance stance. `/operate` prints its runway target as the
 * closed step's line, so the step says what is behind it without a click
 * (§XII), and the panel below draws the rest.
 */
export const financeStrategyFor = (regime: RegimeAssessment["regime"]): FinanceStrategyEntry | undefined =>
  insightDatabase.financeStrategyMode.regimes.find((item) => item.key === regime);

const BulletList = ({ items }: { items: readonly string[] }) => (
  <ul className="space-y-1">
    {items.map((item) => (
      <li key={item} className="flex gap-2">
        <span className="text-slate-400" aria-hidden="true">•</span>
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

/*
 * Flat, inside the plan page's step (2026-10-07). It was a second header
 * ("Finance strategy" over "Finance Strategy Mode", a subtitle and a method
 * sentence), an "Executive summary" surface repeating the runway target, and a
 * "Deep dive" disclosure holding three short lists and the runway target a
 * third time — four frames deep inside the step. The runway target is the
 * step's own line now; what is left is the three lists, as one definition list.
 */
export const FinanceStrategyPanel = ({ regime }: { regime: RegimeAssessment["regime"] }) => {
  const entry = financeStrategyFor(regime);
  if (!entry) {
    return (
      <p id="finance-strategy" className="text-sm text-slate-300">
        The runway plan updates when data refreshes.
      </p>
    );
  }

  return (
    <dl id="finance-strategy" className="grid gap-4 text-sm text-slate-300 md:grid-cols-3">
      <div>
        <dt className="type-eyebrow">Hiring throttle</dt>
        <dd className="mt-2 text-slate-200">{entry.hiringThrottle}</dd>
      </div>
      <div>
        <dt className="type-eyebrow">Budget focus</dt>
        <dd className="mt-2">
          <BulletList items={entry.budgetFocus} />
        </dd>
      </div>
      <div>
        <dt className="type-eyebrow">Watch these signals</dt>
        <dd className="mt-2">
          <BulletList items={entry.watchSignals} />
        </dd>
      </div>
    </dl>
  );
};
