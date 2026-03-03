import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/pageMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Capital Posture Template",
  description: "Board-ready capital posture template with SAFE/RISKY/DANGEROUS classifications and reversal trigger fields.",
  path: "/resources/capital-posture-template",
  imageAlt: "Capital posture template",
  imageParams: { template: "guides", title: "Capital Posture Template" },
});

export default function CapitalPostureTemplatePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6 print:border print:border-slate-300 print:bg-white">
        <h1 className="text-2xl font-semibold text-slate-100 print:text-slate-900 sm:text-3xl">Capital Posture Template</h1>
        <p className="text-sm text-slate-200 print:text-slate-700">Use this skimmable template for weekly leadership syncs and monthly board packets.</p>
        <ul className="space-y-1 text-sm text-slate-200 print:text-slate-700">
          <li>• Posture call + confidence + timestamp</li>
          <li>• SAFE / RISKY / DANGEROUS decision map</li>
          <li>• Reversal triggers with owners and escalation windows</li>
        </ul>
        <div className="flex flex-wrap gap-3 print:hidden">
          <a href="/downloads/capital-posture-template.md" className="weather-button inline-flex items-center justify-center" download data-conversion-event="download">Download template artifact</a>
          <Link href="/start?intent=capital-posture-template-gated" className="weather-pill inline-flex min-h-[44px] items-center px-4 py-2 text-sm font-semibold text-slate-100" data-conversion-event="download">Get guided version (Decision Shield)</Link>
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
