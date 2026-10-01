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
  /** Where the full explanation lives. Omit on /trust itself. */
  href?: "/trust";
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
  href,
  className = "",
}: TrustStripProps) {
  const cells: { label: string; value: string; tone?: "caution" | "easing" }[] = [
    { label: "As of", value: recordDateLabel },
    { label: "Sources", value: sourcesLabel, tone: sourcesLive ? "easing" : "caution" },
    { label: "Confidence", value: CONFIDENCE_WORD[confidenceLabel], tone: confidenceLabel === "LOW" ? "caution" : undefined },
    /* "Not expected", not "No". The boolean says nothing is near its line
     * *this* reading; printed as "No" beside a Medium confidence it read as
     * a promise about the future the confidence cell had just declined to
     * make. "Not expected" states the expectation the score distance gives,
     * and lets the adjacent confidence qualify it. */
    { label: "Could change next week", value: couldChangeNextWeek ? "Yes" : "Not expected", tone: couldChangeNextWeek ? "caution" : undefined },
  ];
  /* A phone wraps the four pairs, and a label told from a value only by its
     shade then reads into the next pair: "Confidence High Could change next
     week Not expected". Below `sm` each pair is a cell of a two-column grid,
     label over value; from `sm` they run on one line, a pair kept tighter than
     the gap between pairs. */
  return (
    <div
      className={`grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-1 ${className}`.trim()}
      data-trust-strip
    >
      <dl className="contents">
        {cells.map((cell) => (
          <div key={cell.label} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-1.5">
            <dt className="text-slate-500">{cell.label}</dt>
            <dd
              className={
                cell.tone === "caution"
                  ? "font-medium text-semantic-caution-fg"
                  : cell.tone === "easing"
                    ? "font-medium text-semantic-easing-fg"
                    : "font-medium text-slate-200"
              }
            >
              {cell.value}
            </dd>
          </div>
        ))}
      </dl>
      {href ? (
        <Link href={href} className="weather-hit col-span-2 justify-self-start text-slate-400 underline decoration-slate-600 underline-offset-4 hover:text-slate-200">
          How this is judged
        </Link>
      ) : null}
    </div>
  );
}
