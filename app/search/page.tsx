import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata } from "../../lib/seo";
import {
  searchJobLabels,
  searchIndex,
  type SearchEntityJob,
} from "../../lib/search/searchIndex";
import { noindexRobots } from "../../lib/seo/indexationPolicy";
import { buildToolkitLibraryHref } from "../answer/components/toolkitLibraryPanels";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Search Whether Guidance",
  description:
    "Route a question to Evidence, Planning, Resolve, or Trust instead of browsing the full site.",
  path: "/search",
  imageAlt: "Whether search",
});

metadata.robots = noindexRobots;

const searchJobOrder: SearchEntityJob[] = ["check", "approve", "resolve", "risk", "trust"];

const isSearchEntityJob = (value: string): value is SearchEntityJob =>
  searchJobOrder.includes(value as SearchEntityJob);

export const resolveSearchCommandHref = (query: string, results: ReturnType<typeof searchIndex>, activeJob?: SearchEntityJob) => {
  const normalizedQuery = query.trim().toLowerCase();
  const commandJob = activeJob
    ?? (
      (/(failure|risk|break|fragility)/.test(normalizedQuery) && results.some((entry) => entry.job === "risk"))
        ? "risk"
        : (/(trust|confidence|source|sources|formula|formulas)/.test(normalizedQuery) && results.some((entry) => entry.job === "trust"))
            ? "trust"
            : results[0]?.job
    );
  if (!commandJob) {
    return null;
  }

  if (commandJob === "resolve") {
    return results.some((entry) => entry.type === "toolkit")
      ? buildToolkitLibraryHref(query)
      : "/answer#unresolved-question-router";
  }

  if (commandJob === "risk") {
    return "/trust#revisit-call";
  }

  if (commandJob === "trust") {
    return "/trust#trust-snapshot";
  }

  if (commandJob === "approve") {
    return "/planning#ops-monthly-action-summary";
  }

  return "/evidence#decision-summary";
};

const searchIntentPrompts = [
  {
    label: "What changed this week?",
    query: "signals thresholds",
  },
  {
    label: "Should we freeze hiring?",
    query: "hiring freeze",
  },
  {
    label: "What could break this call?",
    query: "failure mode",
  },
  {
    label: "Can we trust this posture?",
    query: "sources confidence formulas",
  },
] as const;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; job?: string }>;
}) {
  const { q = "", job = "" } = await searchParams;
  const query = q.trim();
  const normalizedJob = job.trim().toLowerCase();
  const activeJob = isSearchEntityJob(normalizedJob) ? normalizedJob : undefined;

  if (!query) {
    permanentRedirect(buildToolkitLibraryHref());
  }

  const matchingResults = searchIndex(query);
  const results = activeJob
    ? matchingResults.filter((entry) => entry.job === activeJob)
    : matchingResults;
  const commandHref = resolveSearchCommandHref(query, results, activeJob);

  permanentRedirect(commandHref ?? "/answer#unresolved-question-router");
}
