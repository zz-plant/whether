import { regimeSignalLabel } from "../../../lib/report/signalTranslations";

/**
 * Defines the units and the one instrument the curve charts are labelled in.
 *
 * The legends said "10Y−2Y", "2Y−3M", "1M, 3M, 2Y, 10Y", "pp" and "bp", and this key
 * expanded each, so a reader met desk shorthand first and its meaning a line later.
 * Since 2026-11-03 the legends print the names ("Recession warning gauge", "2-year
 * minus 3-month", "2-year", "10-year"), and the key keeps what a name cannot carry:
 * the units, and the instrument behind the gauge, named once here rather than as its
 * label. Shared so the curve surfaces cannot drift apart on what a term means.
 *
 * It is the whole definition, not a pointer to one: /signals is the method layer, where
 * instrument names are allowed only when they are defined on the same screen. It used to
 * end in a "Full glossary" link, and that page is gone.
 */

type CurveTerm = "spread10Y2Y" | "pp" | "bp";

/**
 * The two spreads as the legends name them. The ten-year minus two-year spread is
 * the recession warning gauge everywhere else on the site; the shorter one has no
 * name of its own, so its legend says what it is.
 */
export const CURVE_SPREAD_LABELS: Record<"spread10Y2Y" | "spread2Y3M", string> = {
  spread10Y2Y: regimeSignalLabel.curveSlope,
  spread2Y3M: "2-year minus 3-month",
};

/**
 * A spread's level — the recession warning gauge or its short-end sibling — in
 * percentage points, the unit the gauge's row on the same page prints it in
 * ("0.47pp"). The charts printed the one gauge three ways on one screen:
 * "Latest: 0.42%" under the ribbon, "+41.0 bp" under the inversion lines, and
 * 0.41pp in the row. A move in a rate stays in bp; a gap between two rates is
 * this.
 */
export const formatSpread = (value: number | null) => (typeof value === "number" ? `${value.toFixed(2)}pp` : "n/a");

const TERM_COPY: Record<CurveTerm, { label: string; toneClass: string; definition: string }> = {
  spread10Y2Y: {
    label: CURVE_SPREAD_LABELS.spread10Y2Y,
    toneClass: "text-emerald-200",
    definition: "Ten-year rate minus two-year rate.",
  },
  pp: {
    label: "pp",
    toneClass: "text-slate-300",
    definition: "Percentage point — the unit of a gap between two rates: 5% minus 4% is 1pp.",
  },
  bp: {
    label: "bp",
    toneClass: "text-slate-300",
    definition: "Basis point — one hundredth of a percentage point.",
  },
};

export function CurveTermsKey({
  terms,
  className,
}: {
  terms: readonly CurveTerm[];
  className?: string;
}) {
  return (
    <div className={className}>
      <dl className="grid gap-1.5 text-xs text-slate-400 sm:grid-cols-2">
        {terms.map((term) => {
          const copy = TERM_COPY[term];
          return (
            <div key={term} className="flex gap-2">
              <dt className={`shrink-0 font-medium ${copy.toneClass}`}>{copy.label}</dt>
              <dd>{copy.definition}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
