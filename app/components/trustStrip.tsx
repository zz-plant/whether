import Link from "next/link";

/**
 * Freshness and confidence, once, in the same place on every reading route.
 *
 * They were a chip in the homepage toolbar with a popover, a five-cell strip
 * on /trust, a provenance strip on several /operate and /signals panels, and a
 * stamp line at the bottom of every export. Trust information is a
 * precondition to acting, so it sits directly under the h1 on every route
 * that renders a reading, read once, and /trust keeps the full explanation
 * below its own copy of it.
 */
export type TrustStripProps = {
  recordDateLabel: string;
  /** True when every source answered live for this reading. */
  sourcesLive: boolean;
  /** One phrase for the sources cell, e.g. "All sources live" or "Cached snapshot from Sep 12". */
  sourcesLabel: string;
  confidenceLabel: "HIGH" | "MED" | "LOW";
  /** Whether the call could change at the next reading. */
  couldChangeNextWeek: boolean;
  /** Why it could: "risk appetite is 3 pts from its line". Printed after "Yes". */
  changeReason?: string;
  /** Where the full explanation lives. Omit on /trust itself. */
  href?: "/trust";
  /** How the strip sits below `sm`. "grid" (the default) is the two-column
   *  grid, label over value. "line" runs the pairs as one wrapped line and,
   *  when the strip links to /trust, leaves out the two facts that are in
   *  their routine state (every source live, confidence not Low): the report
   *  intro's job on a phone is to orient, and /trust is one tap away. */
  phoneLayout?: "grid" | "line";
  className?: string;
};

/** The reader's word for the engine's confidence key. Exported so the sticky
 * call strip states it the same way the strip under the call does. */
export const CONFIDENCE_WORD: Record<TrustStripProps["confidenceLabel"], string> = {
  HIGH: "High",
  MED: "Medium",
  LOW: "Low",
};

export function TrustStrip({
  recordDateLabel,
  sourcesLive,
  sourcesLabel,
  confidenceLabel,
  couldChangeNextWeek,
  changeReason,
  href,
  phoneLayout = "grid",
  className = "",
}: TrustStripProps) {
  /* `routine`: the fact is in the state a reader does not need to act on.
     Only the phone line leaves those out, and only when the strip links to
     the page that states them; an exception (cached sources, Low confidence)
     always prints. */
  const cells: { label: string; value: string; tone?: "caution" | "easing"; routine?: boolean }[] = [
    { label: "As of", value: recordDateLabel },
    { label: "Sources", value: sourcesLabel, tone: sourcesLive ? "easing" : "caution", routine: sourcesLive },
    {
      label: "Confidence",
      value: CONFIDENCE_WORD[confidenceLabel],
      tone: confidenceLabel === "LOW" ? "caution" : undefined,
      routine: confidenceLabel !== "LOW",
    },
    /* "Not expected", not "No". The boolean says nothing is near its line
     * *this* reading; printed as "No" beside a Medium confidence it read as
     * a promise about the future the confidence cell had just declined to
     * make. "Not expected" states the expectation the score distance gives,
     * and lets the adjacent confidence qualify it. */
    {
      label: "Could change next week",
      value: couldChangeNextWeek ? (changeReason ? `Yes, ${changeReason}` : "Yes") : "Not expected",
      tone: couldChangeNextWeek ? "caution" : undefined,
    },
  ];
  /* A phone wraps the four pairs, and a label told from a value only by its
     shade then reads into the next pair: "Confidence High Could change next
     week Not expected". Below `sm` each pair is a cell of a two-column grid,
     label over value; from `sm` they run on one line, a pair kept tighter than
     the gap between pairs.

     The "line" layout keeps the pairs apart with a dot instead, which each
     cell after the first draws before itself. No space sits on either side of
     the dot, so a wrap can only fall inside a label or a value and never
     strands a dot at the start of a line (the defect the footer's separators
     had). A space between label and value keeps the copied text readable. */
  const line = phoneLayout === "line";
  const foldRoutine = line && Boolean(href);
  const layout = line
    ? "text-xs max-sm:leading-5 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-1"
    : "grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-1";
  const cellLayout = (folded: boolean) =>
    line
      ? `${folded ? "max-sm:hidden" : "max-sm:inline"} max-sm:not-first:before:mx-1.5 max-sm:not-first:before:text-slate-600 max-sm:not-first:before:content-['·'] sm:flex sm:flex-row sm:items-baseline sm:gap-1.5`
      : "flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-1.5";
  const termLayout = line ? "max-sm:inline " : "";
  return (
    <div className={`${layout} ${className}`.trim()} data-trust-strip>
      <dl className="contents">
        {cells.map((cell) => (
          <div key={cell.label} className={cellLayout(foldRoutine && Boolean(cell.routine))}>
            <dt className={`${termLayout}text-slate-500`}>{cell.label}</dt>
            {line ? " " : null}
            <dd
              className={`${termLayout}${
                cell.tone === "caution"
                  ? "font-medium text-semantic-caution-fg"
                  : cell.tone === "easing"
                    ? "font-medium text-semantic-easing-fg"
                    : "font-medium text-slate-200"
              }`}
            >
              {cell.value}
            </dd>
          </div>
        ))}
      </dl>
      {href ? (
        <>
          {line ? (
            <span aria-hidden="true" className="mx-1.5 text-slate-600 sm:hidden">
              ·
            </span>
          ) : null}
          <Link
            href={href}
            className={`weather-hit ${line ? "" : "col-span-2 justify-self-start "}text-slate-400 underline decoration-slate-600 underline-offset-4 hover:text-slate-200`}
          >
            How this is judged
          </Link>
        </>
      ) : null}
    </div>
  );
}
