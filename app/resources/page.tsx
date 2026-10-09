import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import { buildResourceHubEntries } from "../../lib/resourceHub";
import { PageShell } from "../components/pageShell";
import { Breadcrumbs } from "../components/ui/breadcrumbs";
import { GovernancePillarsGlyph } from "../components/illustrations/GovernancePillarsGlyph";

export const metadata: Metadata = buildPageMetadata({
  title: "Guides",
  description:
    "Long-form guides behind the weekly guidance — capital discipline, board-level capital posture, reversibility as governance — and the most-asked decision guides.",
  path: "/resources",
  imageAlt: "Whether guides",
});

/*
 * The hub the resource pages were missing. `/resources` redirected to an anchor
 * on /operate, so every breadcrumb under it was a 308 and three of the six
 * indexable pages beneath it had no inbound link at all. This is deliberately
 * a list, not a magazine: each page's own description, grouped by what it is.
 */
export default function ResourcesHubPage() {
  const entries = buildResourceHubEntries();
  const pillars = entries.filter((entry) => entry.kind === "pillar");
  const articles = entries.filter((entry) => entry.kind !== "pillar");

  return (
    <PageShell backdropVariant="hub">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Guides" }]} />
      <article className="weather-panel space-y-6 px-5 max-sm:px-0 py-5">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 max-w-2xl">
            {/* "Guides" (2026-10-09): what the page holds, in the reader's word. The
                header's label for this page belongs to the navigation and is
                changed there. */}
            <h1 className="text-fluid-2xl font-semibold text-slate-100">Guides</h1>
            {/* No "evergreen" claim: the answers listed here carry this week's
                standing, so the page is not free of week-to-week change. */}
            <p className="text-sm text-slate-300">
              The long-form guides behind the weekly operating guidance, and the decision guides operators ask for most.
            </p>
          </div>
          <GovernancePillarsGlyph size={56} className="self-start sm:self-center" />
        </header>

        <section aria-labelledby="resources-pillars-heading" className="space-y-3">
          <h2 id="resources-pillars-heading" className="type-eyebrow">Governance frameworks</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {pillars.map((entry) => (
              <li key={entry.href}>
                <Link href={entry.href} className="weather-surface block space-y-1 px-4 py-4 text-sm text-slate-100 hover:border-sky-500/50">
                  <span className="block font-semibold">{entry.title}</span>
                  <span className="block text-fluid-xs text-slate-400">{entry.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="resources-articles-heading" className="space-y-3">
          <h2 id="resources-articles-heading" className="type-eyebrow">Decision guides</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {articles.map((entry) => (
              <li key={entry.href}>
                <Link href={entry.href} className="weather-surface block space-y-1 px-4 py-4 text-sm text-slate-100 hover:border-sky-500/50">
                  <span className="block font-semibold">{entry.title}</span>
                  <span className="block text-fluid-xs text-slate-400">{entry.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </PageShell>
  );
}
