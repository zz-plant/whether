import { z } from "zod";
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
  /** The heading over the page's how-to-apply section, written for this question. */
  applyHeading: z.string().min(1),
  contextHeading: z.string().min(1),
  context: z.string().min(1),
  companyInputs: z.array(z.string().min(1)).min(3).max(4),
  decisionNote: z.string().min(1),
  supportingLinks: z.array(z.object({
    label: z.string().min(1),
    href: z.string().regex(/^(?:\/(?!\/)|https:\/\/)/),
  })).min(1),
  mappedDecisionAreas: z.array(decisionAreaSchema).min(1),
  thresholdFocus: z.enum(["tightness", "risk", "both"]),
  featuredOrder: z.number().int().positive().optional(),
});


export type AnswerPageData = z.infer<typeof answerPageSchema>;

export const answerPageContent = z.array(answerPageSchema).parse(answerPagesData);
