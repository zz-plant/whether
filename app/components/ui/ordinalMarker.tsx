/* Where an item sits in a list the reader can rely on.
 *
 * Five surfaces numbered their rows by hand — the area table, the signals
 * table, the share formats, the presets and the scenario rules — each with its
 * own size, border and type step, so one "3 of 4" mark read four ways. The
 * number is neither a status nor a control: it says the position in a fixed
 * order (the decision areas' order, the four presets, the four scored signals).
 * It is `aria-hidden` because the row's own label is the accessible name; the
 * numeral would only be read as noise.
 *
 * Shape register (`docs/agents/ui-ux-standards.md` §XIV): the Data tier
 * (`rounded-md`, 4px), not the 2px stamp — a numeral is a figure, not a verdict.
 */
export function OrdinalMarker({ children, className = "" }: { children: number; className?: string }) {
  /* 11px from `sm`, and the 12px step on a phone, where nothing draws smaller
     (ui-ux-standards §XXVIII; the 2026-11-12 phone audit found the numerals at 11px). */
  return (
    <span
      aria-hidden="true"
      data-ordinal=""
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-700/60 bg-slate-800/80 text-[11px] font-semibold tabular-nums text-slate-400 max-sm:text-xs ${className}`.trim()}
    >
      {children}
    </span>
  );
}
