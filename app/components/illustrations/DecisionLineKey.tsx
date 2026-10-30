import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { LineStateIcon } from "../ui/conceptIcons";

/**
 * A key to the score ladder's three lines, without another scale or reading.
 * The line names and their effects stay in HTML so they wrap at phone widths
 * and text zoom. The pause/play marks come from the same mapping as the
 * ladder; the change line keeps its neutral tick rather than a state glyph.
 */
export function DecisionLineKey({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-3 ${className}`.trim()} data-line-key>
      <dl
        aria-label="What each score line does"
        className="grid gap-x-6 gap-y-3 text-fluid-xs leading-relaxed sm:grid-cols-3"
      >
        <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-2 sm:block">
          <dt className="flex items-center gap-1.5 font-semibold text-line-crossed-fg">
            <LineStateIcon state="crossed" />
            <span>Pause line</span>
          </dt>
          <dd className="text-slate-400 sm:mt-1 sm:pl-[1.375rem]">If a score crosses it, hold off on the areas it covers.</dd>
        </div>
        <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-2 sm:block">
          <dt className="flex items-center gap-1.5 font-semibold text-line-clear-fg">
            <LineStateIcon state="clear" />
            <span>Restart line</span>
          </dt>
          <dd className="text-slate-400 sm:mt-1 sm:pl-[1.375rem]">Once a score is back past it, restart those areas.</dd>
        </div>
        <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-2 sm:block">
          <dt className="flex items-center gap-1.5 font-semibold text-slate-200">
            <span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center">
              <span className="h-3 w-0.5 bg-current" />
            </span>
            <span>{DECISION_CONTRACT_LABELS.watch.changeLine}</span>
          </dt>
          <dd className="text-slate-400 sm:mt-1 sm:pl-[1.375rem]">If a score crosses it, the week&rsquo;s conditions change.</dd>
        </div>
      </dl>
      <p className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-nested)] p-2.5 text-fluid-nano text-slate-300">
        <span className="font-semibold text-slate-200">Why pause and restart lines differ:</span> Think of the gap like a thermostat. A buffer between pausing and resuming stops your team from thrashing between sudden freezes and restarts week to week.
      </p>
    </div>
  );
}
