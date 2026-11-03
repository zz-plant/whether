import type { DecisionPageDefinition } from "../../app/answers/decisionPages";
import type { BoundedDecisionRule, DecisionArea } from "../report/boundedDecisionRules";
import { getRegimePublicLabel } from "../regimePresentation";
import { buildCanonicalUrl } from "../seo";
import { resolveAnswerUpdatedAt } from "./contentLedger";

/**
 * One canonical answer object, rendered to the page and served to agents.
 *
 * The page and `get_answer` each rebuilt the same answer from the same fields,
 * so a change to one could leave the other on the old text. This object is the
 * single source: the page renders it and the agent returns it, and a drift test
 * asserts the two agree. Surface-specific rendering (the page's own citation
 * line, the hero's richer rules table) stays on the surface; the answer itself
 * does not.
 */
type AnswerObject = {
  slug: string;
  title: string;
  permalink: string;
  category: DecisionPageDefinition["category"];
  shortAnswer: string;
  directAnswer: string;
  audience: string;
  companyInputs: string[];
  decisionNote: string;
  watchouts: string[];
  faq: Array<{ question: string; answer: string }>;
  lastReviewed?: string;
  standing: {
    recordDateLabel: string;
    conditions: string;
    scores: { tightness: number; riskAppetite: number };
  };
  rules: Array<{
    area: DecisionArea;
    actionNow: string;
    pauseIf: string;
    resumeWhen: string;
  }>;
  /** A citeable line for the agent surface; the page keeps its own citation. */
  citation: string;
  attributionSnippet: string;
};

export const buildAnswerObject = ({
  page,
  recordDateLabel,
  regime,
  scores,
  mappedRules,
}: {
  page: DecisionPageDefinition;
  recordDateLabel: string;
  regime: string;
  scores: { tightness: number; riskAppetite: number };
  mappedRules: BoundedDecisionRule[];
}): AnswerObject => {
  const permalink = buildCanonicalUrl(`/answers/${page.slug}`);

  return {
    slug: page.slug,
    title: page.title,
    permalink,
    category: page.category,
    shortAnswer: page.shortAnswer,
    directAnswer: page.directAnswer,
    audience: page.audience,
    companyInputs: [...page.companyInputs],
    decisionNote: page.decisionNote,
    watchouts: [...(page.watchouts ?? [])],
    faq: (page.faq ?? []).map((entry) => ({ ...entry })),
    lastReviewed: resolveAnswerUpdatedAt(page.slug, page.updatedAt),
    standing: {
      recordDateLabel,
      conditions: getRegimePublicLabel(regime),
      scores: { tightness: scores.tightness, riskAppetite: scores.riskAppetite },
    },
    rules: mappedRules.map((rule) => ({
      area: rule.area,
      actionNow: rule.doNow[0] ?? rule.recommendation,
      pauseIf: rule.pauseTrigger,
      resumeWhen: rule.resumeTrigger,
    })),
    citation: `Whether Weekly Brief (Week of ${recordDateLabel}): "${page.title}" — ${permalink}`,
    attributionSnippet: `According to Whether's weekly guidance for startup leaders (Week of ${recordDateLabel}, ${permalink}): "${page.shortAnswer}"`,
  };
};
