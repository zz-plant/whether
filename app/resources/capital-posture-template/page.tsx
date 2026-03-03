import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/pageMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Capital Posture Template",
  description: "Capital posture template for board packs, escalation thresholds, and 30-day confirmation logic reviews.",
  path: "/resources/capital-posture-template",
  imageAlt: "Capital posture template",
});

export default function CapitalPostureTemplatePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Capital Posture Template</h1>
        <p className="text-sm text-slate-200">
          Download-ready placeholder for board teams: posture scorecard, reversibility class map, escalation thresholds, and
          30-day confirmation logic sheet.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/toolkits"
            className="weather-button inline-flex items-center justify-center"
            data-conversion-event="download"
          >
            Download Template (placeholder)
          </Link>
          <Link
            href="/start?intent=board-pack-request"
            className="weather-pill inline-flex min-h-[44px] items-center px-4 py-2 text-sm font-semibold text-slate-100"
            data-conversion-event="request"
          >
            Request Board Pack
          </Link>
        </div>
      </section>
    </main>
  );
}
