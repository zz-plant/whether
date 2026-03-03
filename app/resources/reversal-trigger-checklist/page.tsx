import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/pageMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Reversal Trigger Checklist",
  description: "A short checklist to define, monitor, and escalate reversal triggers for board-visible capital decisions.",
  path: "/resources/reversal-trigger-checklist",
  imageAlt: "Reversal trigger checklist",
  imageParams: { template: "guides", title: "Reversal Trigger Checklist" },
});

export default function ReversalTriggerChecklistPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Reversal Trigger Checklist</h1>
        <p className="text-sm text-slate-200">Use before approving any RISKY commitment.</p>
        <ol className="space-y-2 text-sm text-slate-200">
          <li>1. Define threshold value and breach duration.</li>
          <li>2. Name owner + escalation recipient.</li>
          <li>3. Document rollback path and execution window.</li>
          <li>4. Confirm data source quality and update cadence.</li>
          <li>5. Add board notification trigger language.</li>
        </ol>
        <div className="flex flex-wrap gap-3">
          <a href="/downloads/reversal-trigger-checklist.md" className="weather-button inline-flex items-center justify-center" download data-conversion-event="download">Download checklist artifact</a>
          <Link href="/resources/decision-shield-overview" className="weather-pill inline-flex min-h-[44px] items-center px-4 py-2 text-sm font-semibold text-slate-100" data-conversion-event="request">Apply in Decision Shield</Link>
        </div>
      </section>
      <section className="weather-panel space-y-2 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Internal links</h2>
        <Link href="/resources/capital-discipline-venture-backed-companies" className="block text-sm text-sky-200 underline underline-offset-4">Canonical pillar: Capital Discipline</Link>
        <Link href="/resources/board-level-capital-posture-framework" className="block text-sm text-sky-200 underline underline-offset-4">Board Framework page</Link>
      </section>
    </main>
  );
}
