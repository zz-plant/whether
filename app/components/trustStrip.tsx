import Link from "next/link";
import { MARGIN_LABEL, formatMarginBand, formatMarginReading } from "../../lib/report/reportFormatting";
import { NOT_COUNTED_REASON, SCORING_BASIS_LABEL, type ScoringBasisKey } from "../../lib/report/scoringBasis";

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
  /** The published band (the API's `confidence`); it sets the margin cell's tone. */
  confidenceLabel: "HIGH" | "MED" | "LOW";
  /**
   * The margin in the nearer score's own points (`resolveNearestLineMargin`);
   * null when an input was imputed, which the cell says instead of a distance.
   * Absent where the caller holds no scores, and the cell prints the band.
   */
  margin?: { signal: "tightness" | "riskAppetite"; points: number } | null;
  /** Whether the call could change at the next reading; said in the margin cell, after the distance. */
  couldChangeNextWeek: boolean;
  /** Why it could, when the distance does not already say: "a change is waiting on a second reading". */
  changeReason?: string;
  /**
   * Which inputs set the scores (`resolveScoringBasis`): the cell's value, and
   * after it what the inputs left out would do to a line, where they would
   * move one ("Startup-market inputs would put risk appetite at 49, below its
   * change line"). `note` is the one place a page says why its conditions
   * differ from the published week's, where the basis is the reason.
   */
  basis: { key: ScoringBasisKey; value: string; warning: string | null; note?: string | null; omitReason?: boolean };
  /** Where the full explanation lives. Omit on /trust itself. */
  href?: "/trust";
  /** How the strip sits below `sm`. "grid" (the default) is the two-column
   *  grid, label over value. "line" runs the pairs as one wrapped line and,
   *  when the strip links to /trust, leaves out the sources cell while every
   *  source is live: the report intro's job on a phone is to orient, and
   *  /trust is one tap away. The margin cell always prints, because it says
   *  whether the call could change next week. */
  phoneLayout?: "grid" | "line";
  /** The reading's regime. With it, the margin names the conditions across the nearer line. */
  regime?: string;
  className?: string;
};

/** What the margin cell prints: the nearer score and its points, or why there is no distance to print. */
const describeMarginCell = (
  margin: TrustStripProps["margin"],
  confidenceLabel: TrustStripProps["confidenceLabel"],
  regime: string | undefined,
) => {
  if (margin === null) return "Not measured: an input is missing";
  return margin ? formatMarginReading(margin, regime) : formatMarginBand(confidenceLabel);
};

/* "Not expected", not "No": the boolean says nothing is near its line *this*
   reading, which is an expectation, not a promise. */
const describeNextWeek = (couldChangeNextWeek: boolean, changeReason: string | undefined) =>
  couldChangeNextWeek
    ? (changeReason ? `Could change next week: ${changeReason}` : "Could change next week")
    : "Not expected to change next week";

export function TrustStrip({
  recordDateLabel,
  sourcesLive,
  sourcesLabel,
  confidenceLabel,
  margin,
  couldChangeNextWeek,
  changeReason,
  basis,
  href,
  phoneLayout = "grid",
  regime,
  className = "",
}: TrustStripProps) {
  /* The warning carries its reason: which inputs were left out is not useful
     without why (2026-10-14). When omitReason is true (e.g. hero when publishedNotice already explains it),
     we keep warning but avoid duplicate repetition. */
  const basisDetail = [basis.warning, basis.warning && !basis.omitReason ? NOT_COUNTED_REASON : null, basis.note]
    .filter((part): part is string => Boolean(part))
    .join(" ");
  /* `routine`: the fact is in the state a reader does not need to act on.
     Only the phone line leaves those out, and only when the strip links to
     the page that states them; an exception (cached sources, Low confidence)
     always prints. */
  const cells: {
    label: string;
    value: string;
    detail?: string;
    /** Which fact the detail is, for a reader of the markup: the next-week forecast, or the basis's warning. */
    detailKind?: "next-week" | "basis";
    /** `caveat`: read this reading with care (the caveat diamond); `easing`: in the state it should be (a filled dot, lit). Never the crossed red, which is for lines. */
    tone?: "caveat" | "easing";
    routine?: boolean;
  }[] = [
    /* "Data as of": the date the guidance rests on. The report intro's other date
       is when the sources were last checked, and it says so (2026-10-09). */
    { label: "Data as of", value: recordDateLabel },
    { label: "Sources", value: sourcesLabel, tone: sourcesLive ? "easing" : "caveat", routine: sourcesLive },
    /* The margin, in points, where "Confidence: Low" stood: the number was always a
       distance from the change line, never a probability (/calibration). Whether
       the call could change next week is the same distance read as a forecast, so
       it is said in this cell, after the points, rather than as a fourth cell
       answering "Yes" beside "1 pt from its change line" (2026-10-09). It always
       prints, because whether the call holds is the fact a phone reader needs. */
    {
      label: MARGIN_LABEL,
      value: describeMarginCell(margin, confidenceLabel, regime),
      detail: describeNextWeek(couldChangeNextWeek, changeReason),
      detailKind: "next-week",
      tone: confidenceLabel === "LOW" || couldChangeNextWeek ? "caveat" : undefined,
    },
    /* Which inputs set the scores, on every call (2026-10-09). Routine on the
       record's own inputs with nothing left out that would move a line: the
       phone line folds it like live sources, and /trust is one tap away. A
       warning, a stored reading scored on more inputs than the record, or the
       note on why the published week differs always prints. */
    {
      label: SCORING_BASIS_LABEL,
      value: basis.value,
      ...(basisDetail ? { detail: basisDetail, detailKind: "basis" as const } : {}),
      tone: basisDetail || basis.key === "extended" ? "caveat" : undefined,
      routine: !basisDetail && basis.key === "record",
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
          /* The margin cell carries two facts, so on the phone grid it takes the
             row the could-change cell used to share with it. */
          <div
            key={cell.label}
            className={`${cellLayout(foldRoutine && Boolean(cell.routine))}${!line && cell.detail ? " max-sm:col-span-2" : ""}`}
          >
            {/* On the one-line phone layout the label and value are told apart by shade
                alone, so "Could change next week Risk appetite is 2 pts" ran together. */}
            {/* A label never wraps: beside a long value ("Scored on" before a warning) it
                broke onto two lines and read as two labels. */}
            <dt className={`${termLayout}${line ? "max-sm:after:content-[':'] " : ""}text-slate-500 sm:shrink-0 sm:whitespace-nowrap`}>{cell.label}</dt>
            {line ? " " : null}
            {/* A state carries a mark as well as its ink (a lit dot when live, the
                caveat diamond when not), so "Partly cached" and
                "2 pts from its line" read as flags at a glance and survive a
                greyscale screenshot. Each shape has one meaning across the site
                (§XIV's mark vocabulary); a pseudo-element, so the cell's text is
                still only its value. */}
            <dd
              className={`${termLayout}${
                cell.tone === "caveat"
                  /* The diamond is a 7px square turned 45°, so it overhangs its box by
                     about 1.5px each side; inline on the phone line that ate the space
                     after the label and printed "Sources:◇". */
                  ? `weather-caveat-mark font-medium text-caveat-fg ${line ? "max-sm:before:ml-0.5" : ""}`
                  : cell.tone === "easing"
                    ? "font-medium text-semantic-easing-fg before:mr-1.5 before:inline-block before:h-1.5 before:w-1.5 before:rounded-full before:bg-current before:align-middle before:content-['']"
                    : "font-medium text-slate-200"
              }`}
            >
              {cell.value}
              {cell.detail ? (
                <span
                  className="font-normal text-slate-400"
                  data-next-week={cell.detailKind === "next-week" ? "" : undefined}
                  data-basis-warning={cell.detailKind === "basis" ? "" : undefined}
                >
                  {" · "}
                  {cell.detail}
                </span>
              ) : null}
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
