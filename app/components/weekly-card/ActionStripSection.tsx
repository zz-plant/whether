import { sectionSpacing, tierThreeInset, tierTwoHeading, tierTwoPanel } from "./shared";
import type { ActionStripSectionProps } from "./types";

export function ActionStripSection({ items }: ActionStripSectionProps) {
  return (
    <section className={`${tierTwoPanel} ${sectionSpacing}`} aria-label="Action strip">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className={tierTwoHeading}>Operating levers this week</h3>
      </div>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.lever} className={`${tierThreeInset} flex h-full flex-col gap-2`}>
            <p className="text-[11px] font-semibold text-slate-300">{item.label}</p>
            <div className="space-y-1.5 text-[11px] leading-5">
              <p className="text-slate-100"><span className="font-semibold uppercase tracking-[0.08em] text-emerald-200">Act</span> {item.actionNow}</p>
              <p className="text-amber-100"><span className="font-semibold uppercase tracking-[0.08em]">Trip</span> {item.triggerThreshold}</p>
              <p className="text-sky-100"><span className="font-semibold uppercase tracking-[0.08em]">Flip</span> {item.reversalCondition}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
