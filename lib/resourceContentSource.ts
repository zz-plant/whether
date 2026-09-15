import { z } from "zod";
import resourceArticlesData from "../content/resources/articles.json";
import resourceMetaData from "../content/resources/meta.json";
import resourcePillarsData from "../content/resources/pillars.json";

type ResourcePillarSectionData = {
  heading: string;
  paragraphs: string[];
  subsections?: ResourcePillarSectionData[];
};

const resourcePillarSectionSchema: z.ZodType<ResourcePillarSectionData> = z.lazy(() =>
  z.object({
    heading: z.string().min(1),
    paragraphs: z.array(z.string().min(1)).min(1),
    subsections: z.array(resourcePillarSectionSchema).optional(),
  }),
);

const governanceLexiconTermSchema = z.object({
  slug: z.enum([
    "reversibility",
    "escalation-thresholds",
    "30-day-confirmation-logic",
    "capital-regime",
  ]),
  term: z.string().min(1),
  definition: z.string().min(1),
  boardPrompt: z.string().min(1),
});

const resourceSupportingPagesSchema = z.object({
  decisionShieldOverview: z.object({
    path: z.literal("/resources/decision-shield-overview"),
    title: z.string().min(1),
  }),
  capitalPostureTemplate: z.object({
    path: z.literal("/resources/capital-posture-template"),
    title: z.string().min(1),
  }),
  reversalTriggerChecklist: z.object({
    path: z.literal("/resources/reversal-trigger-checklist"),
    title: z.string().min(1),
  }),
  quarterlyCapitalPostureMemoExample: z.object({
    path: z.literal("/resources/quarterly-capital-posture-memo-example"),
    title: z.string().min(1),
  }),
});

const resourceMetaSchema = z.object({
  governanceLexicon: z.array(governanceLexiconTermSchema),
  canonicalCapitalDisciplinePath: z.literal("/resources/capital-discipline-venture-backed-companies"),
  resourceSupportingPages: resourceSupportingPagesSchema,
});

const resourcePillarPageSchema = z.object({
  slug: z.enum([
    "capital-discipline-venture-backed-companies",
    "board-level-capital-posture-framework",
    "reversibility-as-governance",
  ]),
  keyword: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  h1: z.string().min(1),
  canonicalPath: z.string().min(1),
  parentTopic: z.boolean(),
  cluster: z.enum(["authority", "pain", "tool", "vc"]),
  intent: z.enum(["cfo", "board", "vp-product", "vc-partner"]),
  boardPackContext: z.string().min(1),
  midpointCtaLabel: z.string().min(1),
  sections: z.array(resourcePillarSectionSchema).min(1),
});

const resourceArticleEmbedSchema = z.object({
  kind: z.literal("iframe"),
  title: z.string().min(1).optional(),
  src: z.string().min(1).optional(),
  html: z.string().min(1).optional(),
  caption: z.string().min(1).optional(),
  provider: z.string().min(1).optional(),
});

const resourceArticleSectionSchema = z.object({
  heading: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(1),
  embeds: z.array(resourceArticleEmbedSchema).optional(),
});

const resourceArticleSchema = z.object({
  slug: z.enum([
    "should-we-freeze-hiring-high-interest-rate-environment",
    "how-much-runway-do-we-need-tightening-market",
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
  keyword: z.string().min(1),
  cluster: z.enum(["pain", "vc"]),
  intent: z.enum(["cfo", "board", "vp-product", "vc-partner"]),
  format: z.enum(["guide", "case-example"]),
  boardSummary: z.array(z.string().min(1)).min(1),
  sections: z.array(resourceArticleSectionSchema).min(1),
  includeSharedDeepDive: z.boolean().optional(),
  faqs: z.array(
    z.object({
      question: z.string().min(1),
      answer: z.string().min(1),
    }),
  ).min(1),
  toolLink: z.object({
    href: z.string().min(1),
    label: z.string().min(1),
  }),
});

export type GovernanceLexiconTermData = z.infer<typeof governanceLexiconTermSchema>;
export type ResourcePillarPageData = z.infer<typeof resourcePillarPageSchema>;
export type ResourceArticleEmbedData = z.infer<typeof resourceArticleEmbedSchema>;
export type ResourceArticleSectionData = z.infer<typeof resourceArticleSectionSchema>;
export type ResourceArticleData = z.infer<typeof resourceArticleSchema>;

export const resourceMetaContent = resourceMetaSchema.parse(resourceMetaData);
export const resourcePillarContent = z.array(resourcePillarPageSchema).parse(resourcePillarsData);
export const resourceArticleContent = z.array(resourceArticleSchema).parse(resourceArticlesData);
