import { compactActionCue, sectionSpacing, tierThreeInset, tierTwoHeading, tierTwoPanel } from "./shared";
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
            <p className="text-sm leading-6 font-semibold text-slate-100"><span className="font-semibold text-emerald-200">Action now:</span> {item.actionNow}</p>
            <div className="mt-auto space-y-1.5 text-[11px]">
              <p className="rounded-full border border-amber-500/45 bg-amber-500/10 px-2.5 py-1 text-amber-100"><span className="font-semibold">Trigger/threshold to tighten or loosen:</span> {compactActionCue(item.triggerThreshold)}</p>
              <p className="rounded-full border border-sky-500/45 bg-sky-500/10 px-2.5 py-1 text-sky-100"><span className="font-semibold">Reversal condition:</span> {compactActionCue(item.reversalCondition)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
