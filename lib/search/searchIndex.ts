import { failureModeDefinitions, toolkitDefinitions } from "../decisionDomainCatalog";

export type SearchEntityType = "toolkit" | "failure-mode" | "doc";
export type SearchEntityJob = "check" | "approve" | "resolve" | "risk" | "trust";
export type SearchPrimaryHub = "/signals" | "/operate" | "/answer" | "/trust";

export type SearchEntity = {
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

export const searchJobLabels: Record<SearchEntityJob, string> = {
  check: "Check what changed",
  approve: "Approve or hold this week",
  resolve: "Resolve one remaining edge case",
  risk: "Diagnose what could break",
  trust: "Defend the call",
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
    summary: "Review macro evidence, thresholds, and the context behind current posture.",
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
    summary: "See scoring, data cadence, source quality, and transparency notes.",
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
    summary: "Compact source and reliability checks used for weekly operating calls.",
    intentLabel: "Audit provenance",
    keywords: ["evidence", "provenance", "sources", "trust"],
  },
  {
    id: "doc-guides",
    type: "doc",
    job: "resolve",
    routePriority: 1,
    recommendedHubHref: "/answer",
    recommendedHubLabel: "Decision Tools",
    title: "Translate the call inside Decision Tools",
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
    recommendedHubHref: "/answer",
    recommendedHubLabel: "Decision Tools",
    title: "Get a direct answer",
    href: "/resolve#direct-answers",
    summary: "Single-question helper answers designed for shareable follow-through after the weekly brief.",
    intentLabel: "Get one-question answer",
    keywords: ["answers", "direct answer", "bounded decisions", "weekly posture", "shareable"],
  },
  {
    id: "doc-resources",
    type: "doc",
    job: "approve",
    routePriority: 1,
    recommendedHubHref: "/operate",
    recommendedHubLabel: "Planning",
    title: "Prepare a board-ready artifact",
    href: "/planning#ops-export-briefs",
    summary: "Planning's artifact checkpoint when leadership needs a board-ready export after the weekly plan is set.",
    intentLabel: "Prepare governance artifact",
    keywords: ["resources", "board", "artifact", "template", "operations"],
  },
  {
    id: "doc-concepts",
    type: "doc",
    job: "risk",
    routePriority: 1,
    recommendedHubHref: "/answer",
    recommendedHubLabel: "Decision Tools",
    title: "Translate framework language into a decision",
    href: "/resolve#guided-translation",
    summary: "Route product or operating framework language back into a live decision path instead of browsing concept libraries.",
    intentLabel: "Pressure-test framework language",
    keywords: ["concepts", "canon", "frameworks", "regime context", "decision translation"],
  },
  {
    id: "doc-toolkits",
    type: "doc",
    job: "resolve",
    routePriority: 1,
    recommendedHubHref: "/answer",
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

const formatFailureModeSlug = (slug: string) => slug;

export const buildSearchIndex = (): SearchEntity[] => {
  const toolkitEntities: SearchEntity[] = toolkitDefinitions.map((toolkit) => ({
    id: `toolkit-${toolkit.slug}`,
    type: "toolkit",
    job: "resolve",
    routePriority: 2,
    recommendedHubHref: "/answer",
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
    keywords: [failureMode.trigger, ...failureMode.symptoms, ...failureMode.firstMoves],
  }));

  return [...toolkitEntities, ...failureModeEntities, ...keyDocs];
};

const normalize = (value: string) => value.trim().toLowerCase();

export const searchIndex = (query: string): SearchEntity[] => {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return [];
  }

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  return buildSearchIndex()
    .map((entity) => {
      const haystack = [entity.title, entity.summary, entity.intentLabel, ...entity.keywords]
        .join(" ")
        .toLowerCase();
      const score = terms.reduce((total, term) => {
        if (entity.title.toLowerCase().includes(term)) return total + 3;
        if (entity.summary.toLowerCase().includes(term)) return total + 2;
        if (haystack.includes(term)) return total + 1;
        return total;
      }, 0) + entity.routePriority;
      return { entity, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.entity.title.localeCompare(right.entity.title))
    .map((entry) => entry.entity);
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
