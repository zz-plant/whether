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
    title: "Evidence — drivers and thresholds",
    href: "/signals",
    summary: "Review macro evidence, thresholds, and the context behind current posture.",
    intentLabel: "Check what changed",
    keywords: ["signals", "evidence", "thresholds", "regime", "macro"],
  },
  {
    id: "doc-method",
    type: "doc",
    title: "Trust — freshness, confidence, and sources",
    href: "/method",
    summary: "See scoring, data cadence, source quality, and transparency notes.",
    intentLabel: "Validate trust",
    keywords: ["method", "methodology", "sources", "formulas", "confidence"],
  },
  {
    id: "doc-evidence",
    type: "doc",
    title: "Evidence — audit checklist",
    href: "/signals",
    summary: "Compact source and reliability checks used for weekly operating calls.",
    intentLabel: "Audit provenance",
    keywords: ["evidence", "provenance", "sources", "trust"],
  },
  {
    id: "doc-guides",
    type: "doc",
    title: "Guides — role and stage helper pages",
    href: "/guides",
    summary: "Downstream helper guides for translating weekly brief posture into role- and stage-specific calls.",
    intentLabel: "Translate decision by role",
    keywords: ["guides", "stakeholder", "stage", "decision translation", "weekly brief"],
  },
  {
    id: "doc-answers",
    type: "doc",
    title: "Answers — direct decision extracts",
    href: "/answers",
    summary: "Single-question helper answers designed for shareable follow-through after the weekly brief.",
    intentLabel: "Get one-question answer",
    keywords: ["answers", "direct answer", "bounded decisions", "weekly posture", "shareable"],
  },
  {
    id: "doc-resources",
    type: "doc",
    title: "Resources — governance helper library",
    href: "/resources",
    summary: "Board-ready long-form helper artifacts for leadership reviews after weekly posture is set.",
    intentLabel: "Prepare governance artifact",
    keywords: ["resources", "board", "artifact", "template", "operations"],
  },
  {
    id: "doc-concepts",
    type: "doc",
    title: "Concepts — canon in regime context",
    href: "/concepts",
    summary: "Framework helper pages that contextualize product canon against current macro regime evidence.",
    intentLabel: "Pressure-test framework language",
    keywords: ["concepts", "canon", "frameworks", "regime context", "method"],
  },
  {
    id: "doc-method-formulas",
    type: "doc",
    title: "Trust — formula reference",
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
  toolkit: "Toolkits",
  "failure-mode": "Failure modes",
  concept: "Concepts",
  doc: "Workflow & trust docs",
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
