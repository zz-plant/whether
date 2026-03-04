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
  const referenceDestinations = [
    {
      href: "/method",
      title: "Method",
      description: "How the model is constructed, what it includes, and where confidence limits apply.",
      accentClass: "weather-card-accent-sky",
    },
    {
      href: "/formulas",
      title: "Formulas",
      description: "Formula-level definitions, thresholds, and interpretation notes for key indicators.",
      accentClass: "weather-card-accent-violet",
    },
    {
      href: "/operations/data",
      title: "Data operations",
      description: "Data source cadence, handoff conventions, and operational data usage guidance.",
      accentClass: "weather-card-accent-teal",
    },
    {
      href: "/learn",
      title: "Learn",
      description: "Concepts and diagnostic failure modes for operator education and pattern recognition.",
      accentClass: "weather-card-accent-amber",
    },
  ] as const;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }} />
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Reference" }]} />
      <StaticHubNav currentPath="/reference" />
      <section className="weather-panel-hero space-y-3 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Canonical trust surfaces</p>
        <h1 className="type-section text-slate-100">Reference</h1>
        <p className="text-[15px] text-slate-300 sm:text-base">
          Use Reference for canonical trust surfaces only: methods, formulas, and source transparency. For long-form board artifacts and templates, use Resources.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/method" className="weather-button-primary inline-flex items-center justify-center">
            Open Method
          </Link>
          <Link href="/resources" className="weather-button inline-flex items-center justify-center">
            Open Resources
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {referenceDestinations.map((destination) => (
          <Link key={destination.href} href={destination.href} className={`weather-panel weather-card-accent ${destination.accentClass} space-y-2 px-4 py-3`}>
            <h2 className="text-lg font-semibold text-slate-100">{destination.title}</h2>
            <p className="text-[15px] text-slate-300 sm:text-base">{destination.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
