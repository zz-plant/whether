import { failureModeDefinitions, toolkitDefinitions } from "../decisionDomainCatalog";
import { productConceptArticles } from "../productCanon";

export type SearchEntityType = "toolkit" | "failure-mode" | "concept" | "doc";
export type SearchEntityJob = "check" | "approve" | "resolve" | "risk" | "trust";
export type SearchPrimaryHub = "/signals" | "/operations" | "/decide" | "/method";

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

export const searchJobDescriptions: Record<SearchEntityJob, string> = {
  check: "Evidence, replay, and provenance surfaces for understanding why the weekly call moved.",
  approve: "Planning and leadership-artifact surfaces for approving, holding, and sharing the weekly plan.",
  resolve: "Decision aids, toolkits, and one-question pages for the one unresolved call that remains.",
  risk: "Failure modes and framework context for pressure-testing the current posture.",
  trust: "Freshness, confidence, source, and formula checks for defending the call.",
};

export const searchPrimaryHubByJob: Record<SearchEntityJob, { href: SearchPrimaryHub; label: string; summary: string }> = {
  check: {
    href: "/signals",
    label: "Open Evidence",
    summary: "Start with the canonical proof surface when you need to see what changed and why.",
  },
  approve: {
    href: "/operations",
    label: "Open Planning",
    summary: "Start with the approval workspace when you need to approve, hold, or share the weekly plan.",
  },
  resolve: {
    href: "/decide",
    label: "Open Decision Tools",
    summary: "Start with the edge-case hub when one bounded question still needs an answer.",
  },
  risk: {
    href: "/method",
    label: "Open Trust",
    summary: "Start with the audit gate when you need to pressure-test the call or its assumptions.",
  },
  trust: {
    href: "/method",
    label: "Open Trust",
    summary: "Start with the audit gate when you need freshness, confidence, sources, or formulas.",
  },
};

const keyDocs: SearchEntity[] = [
  {
    id: "doc-signals",
    type: "doc",
    job: "check",
    routePriority: 4,
    recommendedHubHref: "/signals",
    recommendedHubLabel: "Open Evidence",
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
    recommendedHubHref: "/method",
    recommendedHubLabel: "Open Trust",
    title: "Run a trust check",
    href: "/method",
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
    recommendedHubLabel: "Open Evidence",
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
    recommendedHubHref: "/decide",
    recommendedHubLabel: "Open Decision Tools",
    title: "Translate the call by role or stage",
    href: "/guides",
    summary: "Downstream helper guides for translating weekly brief posture into role- and stage-specific calls.",
    intentLabel: "Translate decision by role",
    keywords: ["guides", "stakeholder", "stage", "decision translation", "weekly brief"],
  },
  {
    id: "doc-answers",
    type: "doc",
    job: "resolve",
    routePriority: 1,
    recommendedHubHref: "/decide",
    recommendedHubLabel: "Open Decision Tools",
    title: "Get a direct answer",
    href: "/answers",
    summary: "Single-question helper answers designed for shareable follow-through after the weekly brief.",
    intentLabel: "Get one-question answer",
    keywords: ["answers", "direct answer", "bounded decisions", "weekly posture", "shareable"],
  },
  {
    id: "doc-resources",
    type: "doc",
    job: "approve",
    routePriority: 1,
    recommendedHubHref: "/operations",
    recommendedHubLabel: "Open Planning",
    title: "Prepare a board-ready artifact",
    href: "/resources",
    summary: "Board-ready long-form helper artifacts for leadership reviews after weekly posture is set.",
    intentLabel: "Prepare governance artifact",
    keywords: ["resources", "board", "artifact", "template", "operations"],
  },
  {
    id: "doc-concepts",
    type: "doc",
    job: "risk",
    routePriority: 1,
    recommendedHubHref: "/method",
    recommendedHubLabel: "Open Trust",
    title: "Pressure-test a framework",
    href: "/concepts",
    summary: "Framework helper pages that contextualize product canon against current macro regime evidence.",
    intentLabel: "Pressure-test framework language",
    keywords: ["concepts", "canon", "frameworks", "regime context", "method"],
  },
  {
    id: "doc-method-formulas",
    type: "doc",
    job: "trust",
    routePriority: 4,
    recommendedHubHref: "/method",
    recommendedHubLabel: "Open Trust",
    title: "Inspect scoring and formulas",
    href: "/method#formula-reference",
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
    recommendedHubHref: "/decide",
    recommendedHubLabel: "Open Decision Tools",
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
    recommendedHubHref: "/method",
    recommendedHubLabel: "Open Trust",
    title: failureMode.title,
    href: `/learn/failure-modes/${formatFailureModeSlug(failureMode.slug)}`,
    summary: failureMode.summary,
    intentLabel: "Diagnose risk pattern",
    keywords: [failureMode.trigger, ...failureMode.symptoms, ...failureMode.firstMoves],
  }));

  const conceptEntities: SearchEntity[] = productConceptArticles.map((concept) => ({
    id: `concept-${concept.slug}`,
    type: "concept",
    job: "risk",
    routePriority: 1,
    recommendedHubHref: "/method",
    recommendedHubLabel: "Open Trust",
    title: concept.title,
    href: `/concepts/${concept.slug}`,
    summary: concept.summary,
    intentLabel: "Translate weekly call with concept context",
    keywords: [
      concept.author,
      concept.focus,
      concept.audience,
      concept.era,
      concept.whyItMattered,
      concept.demystificationPrompt,
    ],
  }));

  return [...toolkitEntities, ...failureModeEntities, ...conceptEntities, ...keyDocs];
};

export const searchEntityTypeLabels: Record<SearchEntityType, string> = {
  toolkit: "Toolkits to run",
  "failure-mode": "Risk patterns to diagnose",
  concept: "Framework context",
  doc: "Workflow surfaces",
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
