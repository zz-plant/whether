import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/pageMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Quarterly Capital Posture Memo Example",
  description: "Forward-ready memo example for board updates on posture, risk classes, and reversal trigger logic.",
  path: "/resources/quarterly-capital-posture-memo-example",
  imageAlt: "Quarterly capital posture memo example",
  imageParams: { template: "guides", title: "Quarterly Capital Posture Memo Example" },
});

export default function QuarterlyMemoExamplePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6 print:border print:border-slate-300 print:bg-white">
        <h1 className="text-2xl font-semibold text-slate-100 print:text-slate-900 sm:text-3xl">Quarterly Capital Posture Memo Example</h1>
        <p className="text-sm text-slate-200 print:text-slate-700">A concise board document format you can copy for quarterly operating reviews.</p>
        <ul className="space-y-1 text-sm text-slate-200 print:text-slate-700">
          <li>• One-sentence posture call</li>
          <li>• SAFE / RISKY / DANGEROUS decisions this quarter</li>
          <li>• Trigger outcomes and reversal plans</li>
          <li>• Requested board approvals</li>
        </ul>
        <div className="flex flex-wrap gap-3 print:hidden">
          <Link href="/downloads/quarterly-capital-posture-memo-example.md" className="weather-button inline-flex items-center justify-center" download data-conversion-event="download">Download memo artifact</Link>
          <Link href="/resources/capital-posture-template" className="weather-pill inline-flex min-h-[44px] items-center px-4 py-2 text-sm font-semibold text-slate-100" data-conversion-event="download">Open template</Link>
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
