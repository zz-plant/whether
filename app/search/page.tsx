import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { SearchResults } from "./searchResults";
import { isSearchEntityJob } from "./searchCommand";
import { noindexRobots } from "../../lib/seo/indexationPolicy";
import { PageShell } from "../components/pageShell";
import { Breadcrumbs } from "../components/ui/breadcrumbs";
import { SearchRadarGlyph } from "../components/illustrations/SearchRadarGlyph";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Search Whether Guidance",
  description:
    "Route a question to Evidence, Planning, Resolve, or Trust instead of browsing the full site.",
  path: "/search",
  imageAlt: "Whether search",
});

metadata.robots = noindexRobots;

/**
 * Results, rather than a redirect.
 *
 * Every request used to end in a 308 — to the toolkit library on an empty
 * query, and otherwise to whichever hub the top match belonged to. A reader
 * never saw what matched or whether anything had, a typo landed them somewhere
 * unexplained, and the intent behind the search left no trace. The redirect
 * target is still offered, as the first action, because going straight to the
 * hub is usually right; it is now a link the reader can decline.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; job?: string }>;
}) {
  const { q = "", job = "" } = await searchParams;
  const query = q.trim();
  const normalizedJob = job.trim().toLowerCase();
  const activeJob = isSearchEntityJob(normalizedJob) ? normalizedJob : undefined;

  return (
    <PageShell backdropVariant="hub">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Search" }]} />
      <article className="weather-panel space-y-6 px-5 py-5">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-fluid-2xl font-semibold text-slate-100">Search</h1>
            <p className="text-sm text-slate-300">
              Route a question to the surface that answers it: evidence, guardrails, toolkits, or the method behind the call.
            </p>
          </div>
          <SearchRadarGlyph size={56} className="self-start sm:self-center" />
        </header>

        {/* A client component, and still server-rendered: Next renders these
            into the initial HTML, so `?q=` arrives as results rather than as an
            empty box that fills in after hydration. What the browser adds is
            answering the next keystroke without a round trip. */}
        <SearchResults initialQuery={query} activeJob={activeJob} />
      </article>
    </PageShell>
  );
}
