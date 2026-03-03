import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/pageMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "How VC firms can enforce capital discipline across portfolios",
  description:
    "Portfolio-wide governance framework for VC firms: implementation model, standard posture language, and a board-forwardable operating artifact.",
  path: "/resources/how-vc-firms-can-enforce-capital-discipline-across-portfolios",
  imageAlt: "VC portfolio capital discipline authority page",
  imageParams: {
    template: "guides",
    title: "VC portfolio capital discipline",
  },
});

export default function Page() {
  return (
    <main
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10"
      data-page-cluster="vc"
      data-page-intent="vc-partner"
    >
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">VC authority page</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          How VC firms can enforce capital discipline across portfolios
        </h1>
        <p className="text-sm text-slate-200">
          Portfolio governance breaks when each company uses different threshold language, board packet formats, and escalation clocks.
          This guide gives VC firms a single operating system for posture standardization across portfolio companies.
        </p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Portfolio-wide framework</h2>
        <ol className="space-y-2 text-sm text-slate-200">
          <li>1. Standardize SAFE / RISKY / DANGEROUS commitment classes across every company.</li>
          <li>2. Require one monthly posture memo format: state, breach signals, actions, and reversal readiness.</li>
          <li>3. Use one escalation policy: two-checkpoint breach persistence triggers board-forwardable addendum.</li>
          <li>4. Normalize reversibility language so rollback windows, owners, and communication sequencing are explicit.</li>
        </ol>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Implementation model (first 90 days)</h2>
        <div className="space-y-3 text-sm text-slate-200">
          <p><span className="font-semibold text-slate-100">Days 1–30:</span> baseline all companies against one governance rubric and identify taxonomy drift.</p>
          <p><span className="font-semibold text-slate-100">Days 31–60:</span> roll out standardized board packet language and require exception logs with expiry dates.</p>
          <p><span className="font-semibold text-slate-100">Days 61–90:</span> run cross-portfolio posture calibration and reversal drills, then lock common threshold definitions for one quarter.</p>
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Board-forwardable artifact block</h2>
        <div className="rounded-lg border border-sky-400/35 bg-sky-500/10 p-4 text-sm text-slate-100">
          <p>Portfolio posture recommendation: maintain standardized governance language for two quarters before threshold recalibration.</p>
          <p className="mt-2">Control rule: any breach lasting two checkpoints requires a board addendum with owner, action, and rollback timeline.</p>
          <p className="mt-2">Capital discipline effect: tranche release is conditioned on comparable evidence packets across all portfolio companies.</p>
          <p className="mt-2">Reversibility requirement: every irreversible commitment must include a contingency plan and explicit escalation authority.</p>
        </div>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Supporting links</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          <li><Link href="/resources/capital-discipline-venture-backed-companies" className="text-sky-200 underline underline-offset-4">Capital Discipline pillar</Link></li>
          <li><Link href="/resources/vc-portfolio-governance-case-example-burn-multiple-normalization" className="text-sky-200 underline underline-offset-4">VC case example: burn multiple normalization</Link></li>
          <li><Link href="/resources/operator-posture-standardization-case-example-product-finance" className="text-sky-200 underline underline-offset-4">Operator case example: product-finance posture standardization</Link></li>
        </ul>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/resources/capital-posture-template" className="weather-button inline-flex items-center justify-center" data-conversion-event="download">Download posture template</Link>
          <Link href="/start?intent=board-pack-request&source=vc-authority" className="weather-pill inline-flex min-h-[44px] items-center px-4 py-2 text-sm font-semibold text-slate-100" data-conversion-event="request">Request board-pack walkthrough</Link>
        </div>
      </section>
    </main>
  );
}
