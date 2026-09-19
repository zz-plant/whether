import type { Metadata } from "next";
import { ActionLink } from "../components/ui/actionLink";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { JsonLdScript } from "../components/jsonLdScript";
import {
  buildBreadcrumbList,
  buildCanonicalUrl,
  buildPageMetadata,
  organizationName,
} from "../../lib/seo";
import {
  buildAuthorSchema,
  publisherAuthor,
  publisherContactPath,
  publisherProfilePath,
} from "../../lib/publisher";

import { OperatingLoopGlyph } from "../components/illustrations/OperatingLoopGlyph";

export const metadata: Metadata = buildPageMetadata({
  title: "About Whether",
  description:
    "Who writes Whether, what the weekly operating brief is, and what it is built from.",
  path: publisherProfilePath,
  imageAlt: "About Whether",
});

export default function AboutPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        url: buildCanonicalUrl(publisherProfilePath),
        name: "About Whether",
        publisher: { "@type": "Organization", name: organizationName, url: buildCanonicalUrl("/") },
      },
      {
        ...buildAuthorSchema(),
        description: publisherAuthor.bio,
        worksFor: { "@type": "Organization", name: organizationName, url: buildCanonicalUrl("/") },
      },
      buildBreadcrumbList(createBreadcrumbTrail([{ path: "/" }, { path: publisherProfilePath, label: "About" }])),
    ],
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-10">
      <JsonLdScript data={structuredData} />

      <section className="weather-panel space-y-4 px-5 py-5 sm:px-6 sm:py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">About Whether</h1>
        <p className="text-sm text-slate-300">
          Whether turns public macro signals into a weekly operating posture for startup and product leaders. Each
          week it answers three things: what should change right now, how sure we are, and what would flip the call.
        </p>
        <p className="text-sm text-slate-300">
          It is not a macro blog and not a prediction engine. Every call is bounded — an action, the threshold that
          triggers it, and the condition that reverses it — so a team can act on it and revisit it later without
          re-litigating the reasoning.
        </p>
        <div className="pt-2">
          <OperatingLoopGlyph variant="detailed" />
        </div>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Who writes it</h2>
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-slate-100">{publisherAuthor.name}</span> — {publisherAuthor.role}
        </p>
        <p className="text-sm text-slate-300">{publisherAuthor.bio}</p>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">What it is built from</h2>
        <p className="text-sm text-slate-300">
          Whether reads public data from FRED across six signal families — Treasury yields, credit spreads,
          inflation, labor, financial conditions, and volatility — and scores them into one of four operating
          regimes. The two numbers the brief leads with are built from the Chicago Fed financial conditions
          index and the VIX, not from the yield curve alone.
        </p>
        <p className="text-sm text-slate-300">
          Startup-market inputs — funding velocity, layoff trend, SaaS multiples — come from a curated
          snapshot rather than a live feed, and every surface that uses them says so. The scoring formulas,
          source list, refresh cadence, and stated limitations are published in full.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <ActionLink href="/trust" variant="pill">
            Sources and formulas
          </ActionLink>
          <ActionLink href="/history" variant="pill">
            Every past posture
          </ActionLink>
        </div>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Corrections and questions</h2>
        <p className="text-sm text-slate-300">
          Whether publishes dated records that do not change after the fact. If a published brief is wrong, say so
          and it gets a correction note rather than a silent edit.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <ActionLink href={publisherContactPath} variant="primary">
            Contact
          </ActionLink>
          <ActionLink href="/" variant="pill">
            This week&apos;s brief
          </ActionLink>
        </div>
      </section>
    </main>
  );
}
