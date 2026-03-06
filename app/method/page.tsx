import type { Metadata } from "next";
import Link from "next/link";
import { buildBreadcrumbList, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { BreadcrumbTrail } from "../components/breadcrumbTrail";
import { StaticHubNav } from "../components/staticHubNav";

export const metadata: Metadata = buildPageMetadata({
  title: "Method — formulas, sources, and transparency",
  description:
    "Canonical trust surfaces for Whether: methodology, formulas, source coverage, and model limitations.",
  path: "/method",
  imageAlt: "Whether method hub",
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
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Method" }]} />
      <StaticHubNav currentPath="/method" />
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Method</h1>
        <p className="text-sm text-slate-300">
          Use Method for transparency only: formulas, assumptions, data provenance, and confidence boundaries.
          For operator education, use Learn. For action guidance, return to Weekly Brief, Signals, or Operations.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/methodology" className="weather-button inline-flex items-center justify-center">
            Open Methodology
          </Link>
          <Link href="/operations/data" className="weather-button inline-flex items-center justify-center">
            Open Data operations
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/methodology" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Methodology</h2>
          <p className="text-sm text-slate-300">How the model is built, where confidence comes from, and where limits apply.</p>
        </Link>
        <Link href="/operations/data" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Data operations</h2>
          <p className="text-sm text-slate-300">Source cadence, update process, and integration boundaries used by the system.</p>
        </Link>
        <Link href="/concepts" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Concepts library</h2>
          <p className="text-sm text-slate-300">Canonical concept articles referenced by guidance and diagnostics.</p>
        </Link>
        <Link href="/learn" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Learn hub</h2>
          <p className="text-sm text-slate-300">Operator education on interpretation patterns and recurring failure modes.</p>
        </Link>
      </section>
    </main>
  );
}
