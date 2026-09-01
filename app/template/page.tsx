import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../components/pageShell";
import { TemplateActions } from "./templateActions";

export const metadata: Metadata = {
  title: "Bounded Decision Template — Action / Threshold / Reversal | Whether",
  description: "A printable one-page template for making decisions under uncertainty. Name the action, set the stopping condition, and define the reversal. Free to copy, share, and use with your team.",
  robots: { index: true, follow: true },
};

export default function TemplatePage() {
  return (
    <PageShell backdropVariant="default">
      <article className="weather-panel space-y-8 px-5 py-5 max-w-2xl">
        <div className="space-y-3">
          <h1 className="text-fluid-xl font-semibold text-slate-100">Bounded Decision Template</h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            A bounded decision has three parts. Fill them out before the decision is urgent — 
            that is when the framework is most useful. Print this page or copy the structure 
            into your planning document.
          </p>
        </div>

        <div className="border border-dashed border-slate-600 rounded-xl p-6 space-y-6 print:border-black print:border-solid">
          <div className="space-y-2">
            <p className="text-fluid-xs font-semibold tracking-[0.08em] text-sky-200 uppercase">The decision</p>
            <div className="border-b border-slate-600 pb-2">
              <p className="text-sm text-slate-400 italic">What are you considering doing?</p>
            </div>
            <div className="h-16 border-b border-slate-700/50" />
          </div>

          <div className="space-y-2">
            <p className="text-fluid-xs font-semibold tracking-[0.08em] text-amber-200 uppercase">Action</p>
            <p className="text-xs text-slate-400">What will you do now, given current conditions? Be specific — not a direction, a commitment.</p>
            <div className="h-12 border-b border-slate-700/50" />
          </div>

          <div className="space-y-2">
            <p className="text-fluid-xs font-semibold tracking-[0.08em] text-rose-200 uppercase">Threshold</p>
            <p className="text-xs text-slate-400">What specific, measurable condition would cause you to pause the action. Name the number, date, or event.</p>
            <div className="h-12 border-b border-slate-700/50" />
          </div>

          <div className="space-y-2">
            <p className="text-fluid-xs font-semibold tracking-[0.08em] text-emerald-200 uppercase">Reversal</p>
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
          <br />Inspired by the bounded decision framework used in Whether&apos;s weekly brief.
        </p>

        <section className="space-y-4 border-t border-slate-700/50 pt-6">
          <h2 className="type-eyebrow">Next steps</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href="/" className="weather-surface block min-h-[44px] no-underline px-4 py-3 space-y-1 hover:border-sky-500/40 transition-colors">
              <p className="text-xs font-semibold text-sky-200">Weekly brief →</p>
              <p className="text-xs text-slate-300">See current posture and decisions</p>
            </Link>
            <Link href="/threshold" className="weather-surface block min-h-[44px] no-underline px-4 py-3 space-y-1 hover:border-sky-500/40 transition-colors">
              <p className="text-xs font-semibold text-sky-200">The framework →</p>
              <p className="text-xs text-slate-300">Why bounded decisions work</p>
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
