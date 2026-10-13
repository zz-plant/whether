/**
 * The registered classification rubric (pre-registration §4): the prompt the local model
 * reads, the JSON shape it must answer in, and the parser that turns an answer into a label.
 * The validation hand labels follow the same rubric, so the two are comparable.
 *
 * PROMPT_VERSION changes whenever a word of the prompt changes; a label records the version
 * it was made under. `advice-v1` was registered first; `advice-v2` replaced it after the
 * validation (pre-registration §11, D4), and every post was labelled again under it.
 */
import { z } from "zod";

import { ADVICE_STANCE_DEFINITIONS } from "../../lib/adviceStance";
import { HEAD_WORDS, SNIPPET_WORDS, SNIPPETS } from "./paths";

export const PROMPT_VERSION = "advice-v2";

export const STANCES = ["expand", "conserve", "craft", "none"] as const;
export const AUDIENCES = ["founders", "lps", "general"] as const;
export const CONFIDENCES = ["high", "medium", "low"] as const;

/** The metric vocabulary, and the family each belongs to for H5. */
export const METRICS = {
  growth_rate: "growth",
  valuation_multiple: "growth",
  users_or_gmv: "growth",
  arr: "neutral",
  net_retention: "neutral",
  burn_multiple: "efficiency",
  cac_payback: "efficiency",
  rule_of_40: "efficiency",
  runway: "efficiency",
  burn_rate: "efficiency",
  gross_margin: "efficiency",
  profitability: "efficiency",
  unit_economics: "efficiency",
  magic_number: "efficiency",
} as const;
export type Metric = keyof typeof METRICS;
const METRIC_KEYS = Object.keys(METRICS).filter((key): key is Metric => key in METRICS);

/**
 * The words that must appear in a post for the model's claim that it names a metric to
 * stand. Registered post-processing: a metric the text never mentions is dropped, which
 * stops a model from listing the whole vocabulary.
 */
export const METRIC_PATTERNS: Record<Metric, RegExp> = {
  growth_rate: /\bgrowth rates?\b|\bgrow(?:th|ing)? (?:at )?\d+ ?%|month[- ]over[- ]month|year[- ]over[- ]year|\byoy\b|\bmom\b|\bt2d3\b|triple,? triple/i,
  valuation_multiple: /\bmultiples?\b|\b\d+(?:\.\d+)? ?x (?:revenue|arr|sales|forward)/i,
  users_or_gmv: /\bgmv\b|gross merchandise|\b[dm]au\b|daily active|monthly active|\busers?\b/i,
  arr: /\barr\b|annual(?:ized)? recurring revenue|\brecurring revenue\b/i,
  net_retention: /net (?:revenue |dollar )?retention|\bn[rd]r\b/i,
  burn_multiple: /burn multiple/i,
  cac_payback: /payback/i,
  rule_of_40: /rule of (?:40|forty)/i,
  runway: /\brunway\b/i,
  burn_rate: /burn rate|\bburn(?:ing)? (?:cash|money|through)|monthly burn|\bnet burn\b|\bcash burn\b/i,
  gross_margin: /gross margins?/i,
  profitability: /profitab|\bebitda\b|free cash flow|break[- ]?even|operating margin|net income|cash flow positive/i,
  unit_economics: /unit economics|\bcac\b|\bltv\b|lifetime value|customer acquisition cost|contribution margin/i,
  magic_number: /magic number/i,
};

/**
 * Capital terms: the prefilter's keyword half counts them, and the classifier input quotes
 * windows around them from past the head of a long post. Matched case-insensitively on word
 * boundaries.
 */
export const CAPITAL_TERMS = [
  "fundrais\\w*",
  "raise money",
  "raising money",
  "raise capital",
  "raising capital",
  "runway",
  "burn rate",
  "burn multiple",
  "burning cash",
  "cash burn",
  "valuations?",
  "down rounds?",
  "up rounds?",
  "bridge rounds?",
  "term sheets?",
  "series [abcd]",
  "seed rounds?",
  "venture (?:capital|funding|market)",
  "layoffs?",
  "laid off",
  "headcount",
  "hiring plan",
  "hire ahead",
  "profitab\\w*",
  "default alive",
  "capital efficien\\w*",
  "efficient growth",
  "growth at all costs",
  "blitzscal\\w*",
  "rule of 40",
  "payback",
  "unit economics",
  "gross margins?",
  "revenue multiples?",
  "arr multiples?",
  "growth rates?",
  "cut costs",
  "cost cutting",
  "spend(?:ing)? less",
  "extend (?:your )?runway",
  "downturn",
  "recession",
  "frugal\\w*",
  "dilution",
  "ipos?",
];

export const capitalTermPattern = () => new RegExp(`\\b(?:${CAPITAL_TERMS.join("|")})\\b`, "gi");

/**
 * What the model reads: the title, the first HEAD_WORDS words, then up to SNIPPETS windows of
 * SNIPPET_WORDS words around capital terms later in the post, so a long essay's money section
 * is not cut off. The date, firm and author are withheld: the label must come from the text,
 * not from the model's memory of what markets did that year.
 */
export function buildClassifierInput(title: string, text: string): string {
  const words = text.split(/\s+/).filter(Boolean);
  const head = words.slice(0, HEAD_WORDS).join(" ");
  const parts = [`Title: ${title}`, "", head];
  if (words.length > HEAD_WORDS) {
    const tailWords = words.slice(HEAD_WORDS);
    const tail = tailWords.join(" ");
    const snippets: string[] = [];
    let lastEnd = 0;
    for (const match of tail.matchAll(capitalTermPattern())) {
      if (snippets.length >= SNIPPETS) break;
      const index = (tail.slice(0, match.index).match(/ /g) ?? []).length;
      if (index < lastEnd) continue;
      const start = Math.max(lastEnd, index - Math.floor(SNIPPET_WORDS / 2));
      const end = Math.min(tailWords.length, start + SNIPPET_WORDS);
      snippets.push(`… ${tailWords.slice(start, end).join(" ")} …`);
      lastEnd = end;
    }
    parts.push("", snippets.length > 0 ? "[Later in the post]" : "[The post continues]", ...snippets);
  }
  return parts.join("\n");
}

const definition = (stance: keyof typeof ADVICE_STANCE_DEFINITIONS) => ADVICE_STANCE_DEFINITIONS[stance].corpusDefinition;

export const SYSTEM_PROMPT = [
  "You label blog posts and essays written by venture investors. Read the post and answer with one JSON object.",
  "",
  "Fields:",
  "- capital_relevant (boolean): true when a substantial part of the post (its main point, or at least a full paragraph) is about money at a startup or the market for startup capital: fundraising timing, amount, valuation or terms (term sheets, SAFEs, pro rata, dilution, option pools); burn, runway or spending, including benchmarks of what to spend; hiring pace, headcount or compensation; growth targets against efficiency; profitability; layoffs; venture or public markets as they bear on startups. This field is independent of the stance: a craft post on how to run a fundraise, a spending benchmark, a term-sheet explainer or a post of venture-market data that prescribes nothing is still capital_relevant. False for posts that do not spend a paragraph on money.",
  "- audience: \"founders\" when the post is addressed to founders, operators, executives, portfolio companies or startup employees; \"lps\" when it is addressed to investors (limited partners, fund managers, other VCs) or is about running or investing in funds; \"general\" when it is for the public, policymakers or readers at large.",
  "- stance: what the post tells founders to do about their company. Advice about personal life, possessions or personal finances is none.",
  `  - "expand": ${definition("expand")}`,
  `  - "conserve": ${definition("conserve")}`,
  `  - "craft": ${definition("craft")}`,
  "  - \"none\": gives founders no advice at all: news, portfolio or hiring announcements, a company's results, market or policy commentary that prescribes nothing, personal essays, or advice only for investors.",
  "- metrics_named: the business metrics the post explicitly mentions, from this list only: " + METRIC_KEYS.join(", ") + ". Most posts mention none or one or two; never list a metric the text does not mention. Use [] when it names none.",
  "- evidence: a verbatim quote from the post of at most 15 words that best supports the stance. Use \"\" when the stance is none.",
  "- confidence: \"high\", \"medium\" or \"low\": how sure you are of the stance.",
  "",
  "Rules for the stance:",
  "1. Judge what the post tells founders to do, not what it describes. Reporting what companies or investors are doing (raising bigger rounds, cutting burn, growing fast), market data, valuation analysis and forecasts are none unless the post also tells the reader what to do; advice usually says should, must, need to, don't, or recommends. A company's announcement of its own growth is none.",
  "2. Raising money: raising more than the plan needs in order to accelerate, or raising as much as possible while money is easy, is expand; raising to extend runway or survive is conserve; how to run a raise (pitching, process, terms, sizing a round to reach the next milestone) is craft.",
  "3. Hiring: hiring ahead or faster is expand; freezing, slowing or cutting is conserve; how to interview, recruit, onboard or structure a team is craft.",
  "4. Growth: expand needs money or headcount: spend more, hire ahead, take bigger or more bets, or put growth ahead of efficiency. Advice on how to grow (marketing, sales, customer success, product, pricing, retention) that asks for no extra spending or headcount is craft.",
  "5. If the post weighs both directions, choose the one it recommends on balance. A framework or checklist takes the direction it serves: one for cutting burn or extending runway is conserve, one for accelerating is expand. Only a post that recommends neither direction and offers a way to decide is craft.",
  "6. Expand and conserve are advice about money, so a post with either stance is capital_relevant.",
  "7. Any concrete how-to advice to founders or operators is craft, however short: management, leadership, product, hiring practice, marketing, sales, storytelling, culture, careers, productivity, working with a board, running a fundraise. Interviews, profiles, case studies and Q&As that pass on lessons founders can use are craft. Use none only when the post gives founders no advice at all.",
  "8. Ignore anything you know about when the post was written or what markets did afterwards. Judge only the text given.",
].join("\n");

export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    capital_relevant: { type: "boolean" },
    audience: { type: "string", enum: [...AUDIENCES] },
    stance: { type: "string", enum: [...STANCES] },
    metrics_named: { type: "array", items: { type: "string", enum: METRIC_KEYS } },
    evidence: { type: "string" },
    confidence: { type: "string", enum: [...CONFIDENCES] },
  },
  required: ["capital_relevant", "audience", "stance", "metrics_named", "evidence", "confidence"],
};

const RawLabelSchema = z.object({
  capital_relevant: z.boolean(),
  audience: z.enum(AUDIENCES),
  stance: z.enum(STANCES),
  metrics_named: z.array(z.string()).default([]),
  evidence: z.string().default(""),
  confidence: z.enum(CONFIDENCES),
});

export type Label = {
  capitalRelevant: boolean;
  audience: (typeof AUDIENCES)[number];
  stance: (typeof STANCES)[number];
  metrics: Metric[];
  evidence: string;
  confidence: (typeof CONFIDENCES)[number];
};

const isMetric = (value: string): value is Metric => value in METRICS;

/** At most 15 words, the registered ceiling for a quote kept in committed data. */
export const clipQuote = (quote: string) => quote.trim().replace(/^["“”']+|["“”']+$/g, "").split(/\s+/).filter(Boolean).slice(0, 15).join(" ");

/**
 * The model's answer as a label, or an error saying why not. Registered post-processing:
 * a directional stance makes the post capital-relevant (rule 6 of advice-v2, 5 of v1); unknown metrics, duplicates
 * and metrics whose words do not appear in `text` (the model's input) are dropped; the quote
 * is clipped to 15 words.
 */
export function parseLabel(raw: string, text = ""): { ok: true; label: Label } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    const braces = /\{[\s\S]*\}/.exec(raw);
    if (!braces) return { ok: false, error: "no JSON object in the answer" };
    try {
      json = JSON.parse(braces[0]);
    } catch {
      return { ok: false, error: "unparseable JSON" };
    }
  }
  const parsed = RawLabelSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") };
  const value = parsed.data;
  const directional = value.stance === "expand" || value.stance === "conserve";
  return {
    ok: true,
    label: {
      capitalRelevant: value.capital_relevant || directional,
      audience: value.audience,
      stance: value.stance,
      metrics: [...new Set(value.metrics_named.filter(isMetric))].filter((metric) => METRIC_PATTERNS[metric].test(text)),
      evidence: value.stance === "none" ? "" : clipQuote(value.evidence),
      confidence: value.confidence,
    },
  };
}

/** Whether a quote appears in the text, ignoring case, punctuation and spacing. */
export function isVerbatim(quote: string, text: string): boolean {
  const squash = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const needle = squash(quote);
  return needle.length > 0 && squash(text).includes(needle);
}
