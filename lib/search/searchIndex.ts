import { failureModeDefinitions, toolkitDefinitions } from "../decisionDomainCatalog";
import { productConceptArticles } from "../productCanon";

export type SearchEntityType = "toolkit" | "failure-mode" | "concept" | "doc";

export type SearchEntity = {
  id: string;
  type: SearchEntityType;
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
    title: "Signals — evidence and thresholds",
    href: "/signals",
    summary: "Review macro evidence, thresholds, and the context behind current posture.",
    intentLabel: "Check what changed",
    keywords: ["signals", "evidence", "thresholds", "regime", "macro"],
  },
  {
    id: "doc-method",
    type: "doc",
    title: "Method — formulas, cadence, and sources",
    href: "/method",
    summary: "See scoring, data cadence, source quality, and transparency notes.",
    intentLabel: "Validate trust",
    keywords: ["method", "methodology", "sources", "formulas", "confidence"],
  },
  {
    id: "doc-evidence",
    type: "doc",
    title: "Signals — evidence checklist",
    href: "/signals",
    summary: "Compact source and reliability checks used for weekly operating calls.",
    intentLabel: "Audit provenance",
    keywords: ["evidence", "provenance", "sources", "trust"],
  },
  {
    id: "doc-formulas",
    type: "doc",
    title: "Methodology — formulas and scoring reference",
    href: "/methodology",
    summary: "Reference formulas behind regime scoring and decision thresholds.",
    intentLabel: "Inspect scoring",
    keywords: ["formulas", "scoring", "thresholds", "regime"],
  },
];

const formatFailureModeSlug = (slug: string) => slug;

export const buildSearchIndex = (): SearchEntity[] => {
  const toolkitEntities: SearchEntity[] = toolkitDefinitions.map((toolkit) => ({
    id: `toolkit-${toolkit.slug}`,
    type: "toolkit",
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
    title: failureMode.title,
    href: `/learn/failure-modes/${formatFailureModeSlug(failureMode.slug)}`,
    summary: failureMode.summary,
    intentLabel: "Diagnose risk pattern",
    keywords: [failureMode.trigger, ...failureMode.symptoms, ...failureMode.firstMoves],
  }));

  const conceptEntities: SearchEntity[] = productConceptArticles.map((concept) => ({
    id: `concept-${concept.slug}`,
    type: "concept",
    title: concept.title,
    href: `/concepts/${concept.slug}`,
    summary: concept.summary,
    intentLabel: "Learn concept context",
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
  toolkit: "Toolkits",
  "failure-mode": "Failure modes",
  concept: "Concepts",
  doc: "Signals & method docs",
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
      }, 0);
      return { entity, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.entity.title.localeCompare(right.entity.title))
    .map((entry) => entry.entity);
};

export const groupSearchResultsByType = (results: SearchEntity[]) => {
  const grouped: Record<SearchEntityType, SearchEntity[]> = {
    toolkit: [],
    "failure-mode": [],
    concept: [],
    doc: [],
  };

  results.forEach((result) => {
    grouped[result.type].push(result);
  });

  return grouped;
};
