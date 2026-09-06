import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../components/pageShell";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import { TemplateActions } from "./templateActions";

/*
 * The bounded-decision framework and the blank form for it, on one page.
 *
 * These were /threshold and /template: an explainer of the three parts, and a
 * printable form asking for exactly those three parts. Each ended with a "next
 * steps" row whose first suggestion was the other one. Nobody wants the form
 * without the explanation, and the explanation's whole payoff is filling one
 * in — so the form is now the last section here and /template redirects to it.
 */

export const metadata: Metadata = {
  title: "Bounded Decisions — Framework and Printable Template | Whether",
  description:
    "A decision framework for operating under uncertainty: define the action, set the threshold that pauses it, and name the condition that reverses it. Includes a free printable template — no signup, no data collected.",
  openGraph: {
    title: "Bounded Decisions: Act, Pause, Reverse",
    description: "A framework for making decisions under uncertainty without waiting for certainty, with a blank template to fill in.",
  },
  robots: { index: true, follow: true },
};

export default function ThresholdPage() {
  return (
    <PageShell backdropVariant="default">
      <article className="weather-panel space-y-8 px-5 py-5 max-w-3xl">
        <h1 className="text-fluid-2xl font-semibold text-slate-100">Bounded decisions</h1>
        <p className="text-sm text-slate-300 leading-relaxed">
          A bounded decision has three parts: an action, a threshold that pauses it, and a condition that reverses it.
          That is the complete structure. It works because it separates what you will do from the conditions under which you will stop.
        </p>

        <section className="space-y-4">
          <h2 className="type-eyebrow">The three parts</h2>
          <div className="grid gap-4">
            <div className="weather-surface px-4 py-4 space-y-2">
              <p className="text-fluid-xs font-semibold tracking-[0.08em] text-sky-200">{DECISION_CONTRACT_LABELS.slot.action}</p>
              <p className="text-sm text-slate-200">What you will do now, given current conditions. Not what you hope to do — what the evidence supports doing right now.</p>
            </div>
            <div className="weather-surface px-4 py-4 space-y-2">
              <p className="text-fluid-xs font-semibold tracking-[0.08em] text-amber-200">{DECISION_CONTRACT_LABELS.slot.threshold}</p>
              <p className="text-sm text-slate-200">The specific, measurable condition that would cause you to pause the action. Not a feeling — a number. &ldquo;Pause if funding pressure exceeds 76.&rdquo;</p>
            </div>
            <div className="weather-surface px-4 py-4 space-y-2">
              <p className="text-fluid-xs font-semibold tracking-[0.08em] text-emerald-200">{DECISION_CONTRACT_LABELS.slot.reversal}</p>
              <p className="text-sm text-slate-200">The condition that would clear the threshold and allow the action to resume. Without this, the threshold is a permanent stop, not a pause.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="type-eyebrow">Why it works</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Most strategic decisions fail not because the action was wrong, but because there was no condition for stopping. The action continues past the point where it should have paused, and by the time the error is visible, the cost has already been incurred.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            A bounded decision makes the stopping condition explicit before the action begins. This does not guarantee the action is right. It guarantees the action will not continue past the point where it becomes wrong without a visible signal.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            This structure was developed across clinical workflows, physician financial guidance, and contested healthcare claims — environments where an unbounded decision can mean patient harm, regulatory action, or fiduciary breach. It is applied here to macro uncertainty because the same logic applies: the cost of continuing past the stopping point is higher than the cost of pausing too early.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="type-eyebrow">In practice</h2>
          <div className="weather-surface px-4 py-4 space-y-2">
            <p className="text-sm text-slate-200 font-semibold">{DECISION_CONTRACT_LABELS.slot.action}: Gate net-new hiring to short-payback roles only.</p>
            <p className="text-sm text-slate-300">{DECISION_CONTRACT_LABELS.slot.threshold}: Pause all hiring if credit conditions tighten above 76.</p>
            <p className="text-sm text-slate-300">{DECISION_CONTRACT_LABELS.slot.reversal}: Resume staged approvals when credit conditions ease below 64.</p>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            The threshold makes the decision concrete. The reversal makes it temporary. Together they make the decision safe to start.
          </p>
        </section>

        {/* The anchor /template redirects to, so an external link to the form
            still lands on the form rather than the top of the explainer. */}
        <section id="template" className="space-y-4 scroll-mt-24 border-t border-slate-700/50 pt-6">
          <h2 className="type-eyebrow">Fill one in</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Fill these out before the decision is urgent — that is when the framework is most useful.
            Print this section or copy the structure into your planning document.
          </p>

          <div className="border border-dashed border-slate-600 rounded-xl p-6 space-y-6 print:border-black print:border-solid">
            <div className="space-y-2">
              <p className="text-fluid-xs font-semibold tracking-[0.08em] text-sky-200 uppercase">The decision</p>
              <div className="border-b border-slate-600 pb-2">
                <p className="text-sm text-slate-400 italic">What are you considering doing?</p>
              </div>
              <div className="h-16 border-b border-slate-700/50" />
            </div>

            <div className="space-y-2">
              <p className="text-fluid-xs font-semibold tracking-[0.08em] text-amber-200 uppercase">{DECISION_CONTRACT_LABELS.slot.action}</p>
              <p className="text-xs text-slate-400">What will you do now, given current conditions? Be specific — not a direction, a commitment.</p>
              <div className="h-12 border-b border-slate-700/50" />
            </div>

            <div className="space-y-2">
              <p className="text-fluid-xs font-semibold tracking-[0.08em] text-rose-200 uppercase">{DECISION_CONTRACT_LABELS.slot.threshold}</p>
              <p className="text-xs text-slate-400">What specific, measurable condition would cause you to pause the action. Name the number, date, or event.</p>
              <div className="h-12 border-b border-slate-700/50" />
            </div>

            <div className="space-y-2">
              <p className="text-fluid-xs font-semibold tracking-[0.08em] text-emerald-200 uppercase">{DECISION_CONTRACT_LABELS.slot.reversal}</p>
              <p className="text-xs text-slate-400">What condition would clear the threshold and allow the action to resume? Without this, the threshold is a permanent stop.</p>
              <div className="h-12 border-b border-slate-700/50" />
            </div>

            <div className="space-y-2">
              <p className="text-fluid-xs font-semibold tracking-[0.08em] text-slate-400 uppercase">Review cadence</p>
              <p className="text-xs text-slate-400">How often will you check whether the threshold or reversal has been triggered?</p>
              <div className="h-8 border-b border-slate-700/50" />
            </div>
          </div>

          <TemplateActions />

          <p className="text-fluid-micro text-slate-400 italic">
            No signup required. No data collected. This template is free to use, copy, and share.
          </p>
        </section>

        <section className="space-y-4 border-t border-slate-700/50 pt-6">
          <h2 className="type-eyebrow">Next steps</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href="/" className="weather-surface block min-h-[44px] no-underline px-4 py-3 space-y-1 hover:border-sky-500/40 transition-colors">
              <p className="text-xs font-semibold text-sky-200">Weekly brief →</p>
              <p className="text-xs text-slate-300">See current posture and operating decisions</p>
            </Link>
            <Link href="/trust" className="weather-surface block min-h-[44px] no-underline px-4 py-3 space-y-1 hover:border-sky-500/40 transition-colors">
              <p className="text-xs font-semibold text-sky-200">Trust &amp; Method →</p>
              <p className="text-xs text-slate-300">How thresholds and scores are derived</p>
            </Link>
            <Link href="/operate" className="weather-surface block min-h-[44px] no-underline px-4 py-3 space-y-1 hover:border-sky-500/40 transition-colors">
              <p className="text-xs font-semibold text-sky-200">Planning →</p>
              <p className="text-xs text-slate-300">Turn posture into team approvals</p>
            </Link>
          </div>
        </section>
      </article>
    </PageShell>
  );
}
