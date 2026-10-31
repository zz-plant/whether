import type { ReactNode } from "react";

/**
 * A claim, its evidence, and the one limit that travels with it.
 *
 * The site made this shape three times — the advice corpus, the calibration
 * study and the premise test all print "here is what we found, here is the
 * number with its interval, here is what it cannot show" — with different
 * markup each time. One component keeps the order fixed and makes a claim
 * without its limit impossible to render, which is the editorial rule for a
 * past result (docs/editorial-guardrails.md, "Past and future claims").
 */
export function FindingCard({
  claim,
  evidence,
  limit,
  source,
  className,
}: {
  /** The result, as one sentence a reader could repeat. */
  claim: string;
  /** The numbers behind it. Prose, a list or a small table; the caller owns the shape. */
  evidence: ReactNode;
  /** The strongest reason the claim could be wrong, in one or two sentences. */
  limit: string;
  /** Where to check it: the document and the section, not a bare URL. */
  source?: { label: string; href: string; note?: string };
  className?: string;
}) {
  return (
    <section data-finding-card className={className}>
      <p className="text-base font-semibold leading-snug text-slate-100">{claim}</p>
      <div className="mt-2 space-y-2 text-sm text-slate-300">{evidence}</div>
      <p className="mt-3 max-w-prose text-fluid-nano text-slate-400">
        <span className="font-semibold text-slate-300">Limit.</span> {limit}
      </p>
      {source ? (
        <p className="mt-1 max-w-prose text-fluid-nano text-slate-500">
          <span className="font-semibold text-slate-400">Source.</span>{" "}
          <a href={source.href} className="underline decoration-slate-600 underline-offset-4 hover:text-slate-300">
            {source.label}
          </a>
          {source.note ? `, ${source.note}` : null}.
        </p>
      ) : null}
    </section>
  );
}
