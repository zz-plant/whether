import { failureModeDefinitions, toolkitDefinitions } from "../decisionDomainCatalog";

type SearchEntityType = "toolkit" | "failure-mode" | "doc";
export type SearchEntityJob = "check" | "approve" | "resolve" | "risk" | "trust";
type SearchPrimaryHub = "/signals" | "/operate" | "/resolve" | "/trust";

type SearchEntity = {
  id: string;
  type: SearchEntityType;
  job: SearchEntityJob;
  routePriority: number;
  recommendedHubHref: SearchPrimaryHub;
  recommendedHubLabel: string;
  title: string;
  href: string;
  summary: string;
  intentLabel: string;
  keywords: string[];
};

const keyDocs: SearchEntity[] = [
  {
    id: "doc-signals",
    type: "doc",
    job: "check",
    routePriority: 4,
    recommendedHubHref: "/signals",
    recommendedHubLabel: "Evidence",
    title: "Check what changed and why",
    href: "/signals",
    summary: "Review the evidence, the pause lines, and what is behind this week's guidance.",
    intentLabel: "Check what changed",
    keywords: ["signals", "evidence", "thresholds", "regime", "macro"],
  },
  {
    id: "doc-method",
    type: "doc",
    job: "trust",
    routePriority: 4,
    recommendedHubHref: "/trust",
    recommendedHubLabel: "Trust",
    title: "Run a trust check",
    href: "/trust",
    summary: "See how the scores are built, how often the data refreshes, and where it comes from.",
    intentLabel: "Validate trust",
    keywords: ["method", "methodology", "sources", "formulas", "confidence"],
  },
  {
    id: "doc-evidence",
    type: "doc",
    job: "check",
    routePriority: 4,
    recommendedHubHref: "/signals",
    recommendedHubLabel: "Evidence",
    title: "Audit evidence and provenance",
    href: "/signals",
    summary: "Compact source and reliability checks used for weekly operating guidance.",
    intentLabel: "Audit provenance",
    keywords: ["evidence", "provenance", "sources", "trust"],
  },
  {
    id: "doc-guides",
    type: "doc",
    job: "resolve",
    routePriority: 1,
    recommendedHubHref: "/resolve",
    recommendedHubLabel: "Decision Tools",
    title: "Translate the guidance inside Decision Tools",
    href: "/resolve#guided-translation",
    summary: "Role and stage translation now lives inside the canonical Decision Tools workflow.",
    intentLabel: "Translate decision by role",
    keywords: ["guides", "stakeholder", "stage", "decision translation", "weekly brief"],
  },
  {
    id: "doc-answers",
    type: "doc",
    job: "resolve",
    routePriority: 1,
    recommendedHubHref: "/resolve",
    recommendedHubLabel: "Decision Tools",
    title: "Get a direct answer",
    href: "/resolve#direct-answers",
    summary: "Single-question helper answers designed for shareable follow-through after the weekly brief.",
    intentLabel: "Get one-question answer",
    keywords: ["answers", "direct answer", "bounded decisions", "weekly posture", "weekly guidance", "weekly call", "shareable"],
  },
  {
    id: "doc-resources",
    type: "doc",
    job: "approve",
    routePriority: 1,
    recommendedHubHref: "/operate",
    recommendedHubLabel: "Planning",
    title: "Prepare a board-ready artifact",
    href: "/operate#ops-export-briefs",
    summary: "Planning's artifact checkpoint when leadership needs a board-ready export after the weekly plan is set.",
    intentLabel: "Prepare governance artifact",
    keywords: ["resources", "board", "artifact", "template", "operations"],
  },
  {
    id: "doc-concepts",
    type: "doc",
    job: "risk",
    routePriority: 1,
    recommendedHubHref: "/resolve",
    recommendedHubLabel: "Decision Tools",
    title: "Translate framework language into a decision",
    href: "/resolve#guided-translation",
    summary: "Route product or operating framework language back into a live decision path instead of browsing concept libraries.",
    intentLabel: "Pressure-test framework language",
    keywords: ["frameworks", "regime context", "decision translation"],
  },
  {
    id: "doc-product-writing",
    type: "doc",
    job: "trust",
    routePriority: 1,
    recommendedHubHref: "/trust",
    recommendedHubLabel: "Trust",
    title: "Product writing against the record",
    href: "/concepts",
    summary: "Widely read product management essays and books, each placed on the month-end record: the conditions the month it came out.",
    intentLabel: "Read product writing in context",
    keywords: ["concepts", "canon", "essays", "product management", "reading list", "cagan", "torres", "perri"],
  },
  {
    id: "doc-toolkits",
    type: "doc",
    job: "resolve",
    routePriority: 1,
    recommendedHubHref: "/resolve",
    recommendedHubLabel: "Decision Tools",
    title: "Search the toolkit shortlist",
    href: "/resolve#toolkit-library",
    summary: "Toolkit search now lives under Decision Tools as a supporting shortlist rather than a standalone library.",
    intentLabel: "Find a runnable toolkit",
    keywords: ["toolkits", "rollback", "pmf", "roadmap", "pricing", "capacity"],
  },
  {
    id: "doc-method-formulas",
    type: "doc",
    job: "trust",
    routePriority: 4,
    recommendedHubHref: "/trust",
    recommendedHubLabel: "Trust",
    title: "Inspect scoring and formulas",
    href: "/trust#formula-reference",
    summary: "Open the formula reference section from the canonical Trust hub.",
    intentLabel: "Inspect scoring",
    keywords: ["formulas", "scoring", "thresholds", "regime", "methodology", "trust"],
  },
];

export const buildSearchIndex = (): SearchEntity[] => {
  const toolkitEntities: SearchEntity[] = toolkitDefinitions.map((toolkit) => ({
    id: `toolkit-${toolkit.slug}`,
    type: "toolkit",
    job: "resolve",
    routePriority: 2,
    recommendedHubHref: "/resolve",
    recommendedHubLabel: "Decision Tools",
    title: toolkit.title,
    href: `/toolkits/${toolkit.slug}`,
    summary: toolkit.decisionThisSession,
    intentLabel: "Run this decision toolkit",
    keywords: [
      toolkit.whenToUse,
      toolkit.operatingOutcome,
      toolkit.decisionArtifact,
      ...toolkit.instruments,
      ...toolkit.misuseCases,
    ],
  }));

  const failureModeEntities: SearchEntity[] = failureModeDefinitions.map((failureMode) => ({
    id: `failure-mode-${failureMode.slug}`,
    type: "failure-mode",
    job: "risk",
    routePriority: 2,
    recommendedHubHref: "/trust",
    recommendedHubLabel: "Trust",
    title: failureMode.title,
    href: `/trust#revisit-call`,
    summary: failureMode.summary,
    intentLabel: "Diagnose risk pattern",
    /* The type's own name, so "failure mode" finds these. It used to match by
       accident, through the "Safety Mode" the toolkit copy no longer says. */
    keywords: ["failure mode", failureMode.trigger, ...failureMode.symptoms, ...failureMode.firstMoves],
  }));

  return [...toolkitEntities, ...failureModeEntities, ...keyDocs];
};

const normalize = (value: string) => value.trim().toLowerCase();

/**
 * Whether `term` appears in `text` as a word, not as a fragment of one.
 *
 * The scorer used `String.includes`, so "cat" matched "allocate" and "risk"
 * matched "asterisks". Every entity here is prose, and a substring hit inside
 * an unrelated word is noise that outranks nothing but still fills the page.
 * A prefix match is kept deliberately — "hir" should find "hiring" — so the
 * boundary is required only before the term.
 */
const matchesTerm = (text: string, term: string) => {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}`, "i").test(text);
};

/**
 * Entities matching the query, strongest first.
 *
 * `routePriority` used to be added to every entity's score unconditionally, so
 * every score was positive, the `score > 0` filter removed nothing, and a query
 * matching no entity at all came back as the whole index ordered by priority.
 * A search that always "finds" everything cannot report that it found nothing,
 * which is why `/search` could never tell a good query from a typo. Priority is
 * a tie-break among things that matched, so it is applied only after one term
 * hits.
 */
export const searchIndex = (query: string): SearchEntity[] => {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return [];
  }

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  return buildSearchIndex()
    .map((entity) => {
      const haystack = [entity.title, entity.summary, entity.intentLabel, ...entity.keywords].join(" ");
      const matchScore = terms.reduce((total, term) => {
        if (matchesTerm(entity.title, term)) return total + 3;
        if (matchesTerm(entity.summary, term)) return total + 2;
        if (matchesTerm(haystack, term)) return total + 1;
        return total;
      }, 0);
      return { entity, score: matchScore === 0 ? 0 : matchScore + entity.routePriority };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.entity.title.localeCompare(right.entity.title))
    .map((entry) => entry.entity);
};

/** Human names for the five jobs, for the results page's group headings. */
export const searchJobLabels: Record<SearchEntityJob, string> = {
  check: "Check what changed",
  approve: "Approve or hold this week",
  resolve: "Resolve one remaining edge case",
  risk: "Diagnose what could break",
  trust: "Check the sources",
};

export const groupSearchResultsByJob = (results: SearchEntity[]) => {
  const grouped: Record<SearchEntityJob, SearchEntity[]> = {
    check: [],
    approve: [],
    resolve: [],
    risk: [],
    trust: [],
  };

  results.forEach((result) => {
    grouped[result.job].push(result);
  });

  return grouped;
};
