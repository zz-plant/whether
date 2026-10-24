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
    <dl
      aria-label="What each score line does"
      className={`grid gap-x-6 gap-y-3 text-fluid-xs leading-relaxed sm:grid-cols-3 ${className}`.trim()}
      data-line-key
    >
      <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-2 sm:block">
        <dt className="flex items-center gap-1.5 font-semibold text-line-crossed-fg">
          <LineStateIcon state="crossed" />
          <span>Pause line</span>
        </dt>
        <dd className="text-slate-400 sm:mt-1 sm:pl-[1.375rem]">Past it, hold back the areas it governs.</dd>
      </div>
      <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-2 sm:block">
        <dt className="flex items-center gap-1.5 font-semibold text-line-clear-fg">
          <LineStateIcon state="clear" />
          <span>Resume line</span>
        </dt>
        <dd className="text-slate-400 sm:mt-1 sm:pl-[1.375rem]">Back past it, start those areas again.</dd>
      </div>
      <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-2 sm:block">
        <dt className="flex items-center gap-1.5 font-semibold text-slate-200">
          <span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center">
            <span className="h-3 w-0.5 bg-current" />
          </span>
          <span>{DECISION_CONTRACT_LABELS.watch.changeLine}</span>
        </dt>
        <dd className="text-slate-400 sm:mt-1 sm:pl-[1.375rem]">Across it, the week&rsquo;s conditions change.</dd>
      </div>
    </dl>
  );
}
