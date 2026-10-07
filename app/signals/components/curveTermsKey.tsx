/**
 * Expands the bond-desk shorthand the curve charts are labelled in.
 *
 * The axes say "10Y-2Y", "2Y-3M", "pp" and "bp" because that is what fits in a 100-unit
 * viewBox. That is fine for a reader who already trades bonds and unreadable for
 * everyone else, so every surface that renders those labels renders this key with
 * them. Shared so the curve surfaces cannot drift apart on what a term means.
 *
 * It is the whole definition, not a pointer to one: /signals is the method layer, where
 * instrument names are allowed only when they are defined on the same screen. It used to
 * end in a "Full glossary" link, and that page is gone.
 */

type CurveTerm = "spread10Y2Y" | "spread2Y3M" | "maturities" | "pp" | "bp";

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
    label: "10Y−2Y",
    toneClass: "text-emerald-200",
    definition: "Ten-year rate minus two-year rate.",
  },
  spread2Y3M: {
    label: "2Y−3M",
    toneClass: "text-amber-200",
    definition: "Two-year rate minus three-month rate.",
  },
  maturities: {
    label: "1M, 3M, 2Y, 10Y",
    toneClass: "text-slate-300",
    definition: "How long the government is borrowing for: one/three months, two/ten years.",
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
