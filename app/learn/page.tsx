import type { Metadata } from "next";
import Link from "next/link";
import { buildBreadcrumbList, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { BreadcrumbTrail } from "../components/breadcrumbTrail";
import { HubHero, HubPageShell, HubSection } from "../components/hubPageShell";
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
    <HubPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }} />
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Learn" }]} />
      <StaticHubNav currentPath="/learn" />
      <HubHero
        eyebrow="Supporting surface under Method"
        title="Use Learn for interpretation depth, not for the canonical call."
        description="Open this library when a team needs context on why a failure pattern appears, how a framework should be read, or what concept best explains the current posture."
        actions={<Link href="/method" className="weather-button inline-flex items-center justify-center">Open Method</Link>}
      />
      <HubSection
        title="Pick the reference that unblocks the conversation"
        description="Both routes are supporting surfaces. Method remains the primary trust hub for sources, formulas, confidence, and revisit conditions."
      >
        <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/learn/failure-modes" className="weather-hub-link-card space-y-2">
          <h2 className="text-lg font-semibold text-slate-100">Diagnostics library</h2>
          <p className="text-sm text-slate-300">Diagnose common failure patterns and trace the underlying concepts.</p>
        </Link>
        <Link href="/concepts" className="weather-hub-link-card space-y-2">
          <h2 className="text-lg font-semibold text-slate-100">Concepts</h2>
          <p className="text-sm text-slate-300">Understand the reasoning model used in Whether guidance.</p>
        </Link>
        </div>
      </HubSection>
      <NextStepRail currentPath="/learn" />
    </HubPageShell>
  );
}
