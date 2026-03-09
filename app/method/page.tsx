import type { Metadata } from "next";
import Link from "next/link";
import { buildBreadcrumbList, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { BreadcrumbTrail } from "../components/breadcrumbTrail";
import { NextStepRail } from "../components/nextStepRail";
import { StaticHubNav } from "../components/staticHubNav";

export const metadata: Metadata = buildPageMetadata({
  title: "Methodology & Data — formulas, sources, and transparency",
  description:
    "Canonical trust surfaces for Whether: methodology, formulas, source coverage, and model limitations.",
  path: "/method",
  imageAlt: "Whether methodology and data hub",
});

export default function MethodPage() {
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    ...buildBreadcrumbList(
      createBreadcrumbTrail([
        { path: "/" },
        { path: "/method" },
      ]),
    ),
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }} />
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Methodology & Data" }]} />
      <StaticHubNav currentPath="/method" />
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Methodology &amp; Data</h1>
        <p className="text-sm text-slate-300">
          Use Methodology &amp; Data for transparency only: formulas, assumptions, data provenance, and confidence limits. For operator education and failure-mode interpretation, use Concepts &amp; Diagnostics.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/methodology" className="weather-button inline-flex items-center justify-center">
            Open full methodology
          </Link>
          <Link href="/learn" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] text-slate-200 hover:border-sky-400/70 hover:text-slate-100">
            Open Concepts &amp; Diagnostics
          </Link>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/methodology" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Methodology reference</h2>
          <p className="text-sm text-slate-300">Review formulas, weighting choices, and fallback logic in full detail.</p>
        </Link>
        <Link href="/sources" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Sources and freshness</h2>
          <p className="text-sm text-slate-300">Inspect source coverage, update cadence, and provenance for each signal.</p>
        </Link>
        <Link href="/confidence" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Confidence and limits</h2>
          <p className="text-sm text-slate-300">Understand uncertainty, assumptions, and conditions that can flip the call.</p>
        </Link>
        <Link href="/learn" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Concepts &amp; Diagnostics</h2>
          <p className="text-sm text-slate-300">Use operator-facing diagnostics, concepts, and failure modes.</p>
        </Link>
      </section>
      <NextStepRail currentPath="/method" />
    </main>
  );
}
