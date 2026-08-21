import { GlossaryLink } from "../../components/ui/plainLanguage";

/**
 * Expands the bond-desk shorthand the curve charts are labelled in.
 *
 * The axes say "10Y-2Y", "2Y-3M", and "bp" because that is what fits in a 100-unit
 * viewBox. That is fine for a reader who already trades bonds and unreadable for
 * everyone else, so every surface that renders those labels renders this key with
 * them. Shared so the two curve surfaces cannot drift apart on what a term means.
 */

export type CurveTerm = "spread10Y2Y" | "spread2Y3M" | "maturities" | "bp";

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
      <p className="mt-2 text-xs text-slate-400">
        <GlossaryLink>Full glossary</GlossaryLink>
      </p>
    </div>
  );
}
