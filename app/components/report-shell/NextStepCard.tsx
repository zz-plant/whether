import { InternalAwareLink } from "./InternalAwareLink";

export type NextStep = {
  /** Why a reader who finished this page would go there, in their terms. */
  description: string;
  href: string;
  /** The button: where it goes, as a verb phrase. "Continue" named no destination. */
  label: string;
};

/**
 * The handoff, in one predictable place.
 *
 * The loop is linear — call → plan → evidence → resolve — and every report
 * page had a "Next: …" hint somewhere different: a line in the nav block on
 * one page, a pill in the header on another. Readers had to hunt for it. It
 * is now a card at the end of every report page, where a reader who has
 * finished the page is looking.
 *
 * The button names the destination. It said "Continue →" on every page, under
 * lines like "Return to Planning next", so the card carried the word "next"
 * twice and the one control on it did not say where it went.
 */
export function NextStepCard({ nextStep }: { nextStep?: NextStep }) {
  if (!nextStep) return null;

  return (
    <section
      aria-label="Next step"
      data-testid="next-step-card"
      className="rounded-xl border border-sky-500/25 bg-sky-500/[0.06] weather-inset"
    >
      <p className="type-eyebrow text-sky-200/80">Next</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[48ch] text-fluid-base font-semibold text-slate-50">{nextStep.description}</p>
        <InternalAwareLink
          href={nextStep.href}
          className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-fluid-xs font-semibold text-slate-100 no-underline"
        >
          {nextStep.label}
        </InternalAwareLink>
      </div>
    </section>
  );
}
