import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../components/pageShell";

export const metadata: Metadata = {
  title: "Bounded Decisions — Action, Threshold, Reversal | Whether",
  description: "A decision framework for operating under uncertainty: define the action, set the threshold that pauses it, and name the condition that reverses it. Used by startup leaders navigating macro uncertainty.",
  openGraph: {
    title: "Bounded Decisions: Act, Pause, Reverse",
    description: "A framework for making decisions under uncertainty without waiting for certainty.",
  },
  robots: { index: true, follow: true },
};

export default function ThresholdPage() {
  return (
    <PageShell backdropVariant="default" showFooter>
      <article className="weather-panel space-y-8 px-5 py-5 max-w-3xl">
        <h1 className="text-fluid-2xl font-semibold text-slate-100">Bounded Decisions</h1>
        <p className="text-sm text-slate-300 leading-relaxed">
          A bounded decision has three parts: an action, a threshold that pauses it, and a condition that reverses it.
          That is the complete structure. It works because it separates what you will do from the conditions under which you will stop.
        </p>

        <section className="space-y-4">
          <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">The three parts</h2>
          <div className="grid gap-4">
            <div className="weather-surface px-4 py-4 space-y-2">
              <p className="text-fluid-xs font-semibold tracking-[0.08em] text-sky-200">Action</p>
              <p className="text-sm text-slate-200">What you will do now, given current conditions. Not what you hope to do — what the evidence supports doing right now.</p>
            </div>
            <div className="weather-surface px-4 py-4 space-y-2">
              <p className="text-fluid-xs font-semibold tracking-[0.08em] text-amber-200">Threshold</p>
              <p className="text-sm text-slate-200">The specific, measurable condition that would cause you to pause the action. Not a feeling — a number. &ldquo;Pause if tightness exceeds 76.&rdquo;</p>
            </div>
            <div className="weather-surface px-4 py-4 space-y-2">
              <p className="text-fluid-xs font-semibold tracking-[0.08em] text-emerald-200">Reversal</p>
              <p className="text-sm text-slate-200">The condition that would clear the threshold and allow the action to resume. Without this, the threshold is a permanent stop, not a pause.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Why it works</h2>
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
          <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">In practice</h2>
          <div className="weather-surface px-4 py-4 space-y-2">
            <p className="text-sm text-slate-200 font-semibold">Action: Gate net-new hiring to short-payback roles only.</p>
            <p className="text-sm text-slate-300">Threshold: Pause all hiring if credit conditions tighten above 76.</p>
            <p className="text-sm text-slate-300">Reversal: Resume staged approvals when credit conditions ease below 64.</p>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            The threshold makes the decision concrete. The reversal makes it temporary. Together they make the decision safe to start.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Next</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/" className="weather-surface block no-underline px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-sky-200">← Weekly brief</p>
              <p className="text-xs text-slate-300">See this week&apos;s posture and decisions</p>
            </Link>
            <Link href="/" className="weather-surface block no-underline px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-sky-200">Current regime</p>
              <p className="text-xs text-slate-300">See the current macro regime and bounded decision</p>
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Related</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/" className="weather-surface block no-underline px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-sky-200">Current regime</p>
              <p className="text-xs text-slate-300">See the current macro regime and bounded decision</p>
            </Link>
            <Link href="/trust" className="weather-surface block no-underline px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-sky-200">Methodology</p>
              <p className="text-xs text-slate-300">How scores and thresholds are determined</p>
            </Link>
          </div>
        </section>

        <div className="border-t border-slate-700/50 pt-6">
          <Link href="/" className="inline-flex items-center gap-2 rounded-sm border border-slate-700/60 px-4 py-2 text-fluid-micro font-medium text-slate-400 hover:border-sky-500/40 hover:text-sky-200 transition-colors no-underline">
            ← Back to weekly brief
          </Link>
        </div>
      </article>
    </PageShell>
  );
}
