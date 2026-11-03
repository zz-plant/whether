import { z } from "zod";
import answerPagesData from "../content/answers/pages.json";

const decisionAreaSchema = z.enum([
  "hiring",
  "product-tempo",
  "burn-discipline",
  "capital-raising",
  "expansion-bets",
]);

export const answerPageSchema = z.object({
  slug: z.string().min(1),
  keyword: z.string().min(1),
  title: z.string().min(1),
  /** How people ask this question in their own words. Read by `matchDecisionPage`, so an agent passing a user's question finds the page; never printed. */
  askedAs: z.array(z.string().min(1)).min(3),
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
  /** When the enduring answer last changed, ISO date. Distinct from the weekly reading. */
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Common ways this decision goes wrong, in the reader's words. */
  watchouts: z.array(z.string().min(1)).min(2).max(5).optional(),
  /** Page-specific questions and answers, distinct from the weekly payload. */
  faq: z
    .array(z.object({ question: z.string().min(1), answer: z.string().min(1) }))
    .min(1)
    .max(4)
    .optional(),
});


export type AnswerPageData = z.infer<typeof answerPageSchema>;

export const answerPageContent = z.array(answerPageSchema).parse(answerPagesData);
