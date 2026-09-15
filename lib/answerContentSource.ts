import { z } from "zod";
import answerMetaData from "../content/answers/meta.json";
import answerPagesData from "../content/answers/pages.json";

const decisionAreaSchema = z.enum([
  "hiring",
  "product-tempo",
  "burn-discipline",
  "capital-raising",
  "expansion-bets",
]);

const answerPageSchema = z.object({
  slug: z.string().min(1),
  keyword: z.string().min(1),
  title: z.string().min(1),
  category: z.enum(["climate", "decision", "explanation"]),
  shortAnswer: z.string().min(1),
  directAnswer: z.string().min(1),
  audience: z.string().min(1),
  mappedDecisionAreas: z.array(decisionAreaSchema).min(1),
  thresholdFocus: z.enum(["tightness", "risk", "both"]),
  featuredOrder: z.number().int().positive().optional(),
});

const answerMetaSchema = z.object({
  answerCategories: z.array(
    z.object({
      key: z.enum(["climate", "decision", "explanation"]),
      label: z.string().min(1),
    }),
  ).min(1),
});

export type AnswerPageData = z.infer<typeof answerPageSchema>;

export const answerPageContent = z.array(answerPageSchema).parse(answerPagesData);
export const answerMetaContent = answerMetaSchema.parse(answerMetaData);
