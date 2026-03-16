import type { Metadata } from "next";
import Link from "next/link";
import { buildBreadcrumbList, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { BreadcrumbTrail } from "../components/breadcrumbTrail";
import { NextStepRail } from "../components/nextStepRail";
import { StaticHubNav } from "../components/staticHubNav";

export const metadata: Metadata = buildPageMetadata({
  title: "Learn — supporting references for Method",
  description: "Supporting reference library under Method for diagnostics and concept references; not a primary operating workflow.",
  path: "/learn",
  imageAlt: "Whether concepts and diagnostics hub",
});

export default function LearnPage() {
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    ...buildBreadcrumbList(
      createBreadcrumbTrail([
        { path: "/" },
        { path: "/learn" },
      ]),
    ),
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }} />
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Learn" }]} />
      <StaticHubNav currentPath="/learn" />
      <section className="weather-panel space-y-3 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Supporting surface under Method</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Concepts & Diagnostics</h1>
        <p className="text-sm text-slate-300">Use Concepts & Diagnostics for operator education only: failure modes, interpretation patterns, and worked examples. Method remains the primary trust hub for sources, formulas, confidence, and revisit conditions.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/method" className="weather-button inline-flex items-center justify-center">Open Method</Link>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/learn/failure-modes" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Diagnostics library</h2>
          <p className="text-sm text-slate-300">Diagnose common failure patterns and trace the underlying concepts.</p>
        </Link>
        <Link href="/concepts" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Concepts</h2>
          <p className="text-sm text-slate-300">Understand the reasoning model used in Whether guidance.</p>
        </Link>
      </section>
      <NextStepRail currentPath="/learn" />
    </main>
  );
}
