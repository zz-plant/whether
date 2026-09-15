import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import { buildResourceHubEntries } from "../../lib/resourceHub";
import { PageShell } from "../components/pageShell";
import { Breadcrumbs } from "../components/ui/breadcrumbs";

export const metadata: Metadata = buildPageMetadata({
  title: "Governance Resources",
  description:
    "Capital discipline, board-level capital posture, and reversibility as governance: the long-form guides behind the weekly operating call, with the decision guides operators ask for most.",
  path: "/resources",
  imageAlt: "Whether governance resources",
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
  const articles = entries.filter((entry) => entry.kind === "article");

  return (
    <PageShell backdropVariant="hub">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Resources" }]} />
      <article className="weather-panel space-y-6 px-5 py-5">
        <header className="space-y-2">
          <h1 className="text-fluid-2xl font-semibold text-slate-100">Governance resources</h1>
          <p className="text-sm text-slate-300">
            The long-form guides behind the weekly operating call, and the decision guides operators ask for most.
            Evergreen by design: what changes week to week is on the brief, not here.
          </p>
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
