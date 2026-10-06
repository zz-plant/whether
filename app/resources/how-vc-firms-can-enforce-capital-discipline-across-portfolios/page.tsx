import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/seo";
import { ContentMeasurementTracker } from "../../components/contentMeasurementTracker";
import { ContentPageShell } from "../../components/ui/contentPageShell";

export const metadata: Metadata = buildPageMetadata({
  title: "How VC firms can enforce capital discipline across portfolios",
  description:
    "Portfolio-wide governance framework for VC firms: an implementation model, one set of threshold words for every company, and a memo block to forward to a board.",
  path: "/resources/how-vc-firms-can-enforce-capital-discipline-across-portfolios",
  imageAlt: "VC portfolio capital discipline authority page",
  imageParams: {
    template: "guides",
    title: "VC portfolio capital discipline",
  },
});

export default function Page() {
  const pagePath = "/resources/how-vc-firms-can-enforce-capital-discipline-across-portfolios";

  return (
    <ContentPageShell
      data-content-measurement-root={pagePath}
      data-page-cluster="vc"
      data-page-intent="vc-partner"
    >
      <ContentMeasurementTracker pagePath={pagePath} cluster="vc" intent="vc-partner" />
      <section className="weather-panel space-y-4 px-6 max-sm:px-0 py-6">
        <p className="type-eyebrow">For VC firms</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          How VC firms can enforce capital discipline across portfolios
        </h1>
        <p className="text-sm text-slate-200">
          Portfolio governance breaks when each company uses different threshold language, board packet formats, and escalation clocks.
          This guide gives VC firms one set of words, thresholds and formats to use across every portfolio company.
        </p>
      </section>

      <section className="weather-panel space-y-4 px-6 max-sm:px-0 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Portfolio-wide framework</h2>
        <ol className="space-y-2 text-sm text-slate-200">
          <li>1. Standardize SAFE / RISKY / DANGEROUS commitment classes across every company.</li>
          <li>2. Require one monthly memo format: the current guidance, the thresholds breached, the action taken, and the steps that can still be undone.</li>
          <li>3. Use one escalation rule: a threshold still breached at the second monthly check-in gets a written addendum to the board pack, with an owner, an action and a rollback date.</li>
          <li>4. Normalize reversibility language so rollback windows, owners, and communication sequencing are explicit.</li>
        </ol>
      </section>

      <section className="weather-panel space-y-4 px-6 max-sm:px-0 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Implementation model (first 90 days)</h2>
        <div className="space-y-3 text-sm text-slate-200">
          <p><span className="font-semibold text-slate-100">Days 1–30:</span> score every company against one rubric and find where they use different words for the same commitment class.</p>
          <p><span className="font-semibold text-slate-100">Days 31–60:</span> roll out standardized board packet language and require exception logs with expiry dates.</p>
          <p><span className="font-semibold text-slate-100">Days 61–90:</span> compare thresholds across the portfolio, run reversal drills, then lock one set of threshold definitions for a quarter.</p>
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 max-sm:px-0 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Board-forwardable artifact block</h2>
        <div className="rounded-lg border border-sky-400/35 bg-sky-500/10 p-4 text-sm text-slate-100">
          <p>Portfolio recommendation: keep one governance vocabulary for two quarters before changing any threshold.</p>
          <p className="mt-2">Control rule: any breach lasting two checkpoints requires a board addendum with owner, action, and rollback timeline.</p>
          <p className="mt-2">Capital discipline effect: tranche release is conditioned on comparable evidence packets across all portfolio companies.</p>
          <p className="mt-2">Reversibility requirement: every irreversible commitment must include a contingency plan and explicit escalation authority.</p>
        </div>
      </section>

      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Supporting links</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          <li><Link href="/resources/capital-discipline-venture-backed-companies" className="text-sky-200 underline underline-offset-4">Capital discipline for venture-backed companies</Link></li>
          <li><Link href="/resources/board-level-capital-posture-framework" className="text-sky-200 underline underline-offset-4">Board-level capital posture framework</Link></li>
        </ul>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/resources/capital-posture-template" className="weather-button inline-flex items-center justify-center" data-conversion-event="download">Download the Capital Posture Template</Link>
          <Link href="/operate#ops-export-briefs" className="weather-pill inline-flex min-h-[44px] items-center px-4 py-2 text-sm font-semibold text-slate-100" data-conversion-event="request">Open board-pack exports</Link>
        </div>
      </section>
    </ContentPageShell>
  );
}
