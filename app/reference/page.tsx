import type { Metadata } from "next";
import Link from "next/link";
import { buildBreadcrumbList, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import { StaticHubNav } from "../components/staticHubNav";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { BreadcrumbTrail } from "../components/breadcrumbTrail";

export const metadata: Metadata = buildPageMetadata({
  title: "Reference — methods, formulas, and source map",
  description:
    "Canonical transparency surfaces for Whether: model method, formulas, source coverage, and evidence boundaries.",
  path: "/reference",
  imageAlt: "Whether reference hub",
});

export default function ReferencePage() {
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    ...buildBreadcrumbList(
      createBreadcrumbTrail([
        { path: "/" },
        { path: "/reference" },
      ]),
    ),
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }} />
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Reference" }]} />
      <StaticHubNav currentPath="/reference" />
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Reference</h1>
        <p className="text-sm text-slate-300">
          Use Reference for canonical trust surfaces only: methods, formulas, and source transparency. For long-form board artifacts and templates, use Resources.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/method" className="weather-button inline-flex items-center justify-center">
            Open Method
          </Link>
          <Link href="/resources" className="weather-button inline-flex items-center justify-center">
            Open Resources
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/method" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Method</h2>
          <p className="text-sm text-slate-300">How the model is constructed, what it includes, and where confidence limits apply.</p>
        </Link>
        <Link href="/methodology" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Formulas</h2>
          <p className="text-sm text-slate-300">Formula-level definitions, thresholds, and interpretation notes for key indicators.</p>
        </Link>
        <Link href="/operations/data" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Data operations</h2>
          <p className="text-sm text-slate-300">Data source cadence, handoff conventions, and operational data usage guidance.</p>
        </Link>
        <Link href="/learn" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Learn</h2>
          <p className="text-sm text-slate-300">Concepts and diagnostic failure modes for operator education and pattern recognition.</p>
        </Link>
      </section>
    </main>
  );
}
