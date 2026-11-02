import { z } from "zod";
import { answerPageContent, answerPageSchema, type AnswerPageData } from "../answerContentSource";
import { findDecisionPage, type DecisionPageDefinition } from "../../app/answers/decisionPages";
import { getWhetherKv, type KvNamespace } from "../runtime/kv";

/**
 * A thin published-content layer over KV.
 *
 * The bundled `content/answers/pages.json` stays the seed and the offline
 * fallback. A published set, once written, is read in preference to it, so an
 * answer edit can ship without a deploy. Invalid published content is never
 * served: it fails the same schema the build uses and falls back to the seed.
 */
export const ANSWER_CONTENT_KV_KEY = "answers:pages:v1";

const answerPagesSchema = z.array(answerPageSchema);

type PublishVerdict = { ok: boolean; reasons: string[] };

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * The publish guard: the structural checks that do not need a live read.
 * The corpus audit owns the rest (traffic, freshness, launch readiness).
 */
export const validateAnswerPagesForPublish = (pages: AnswerPageData[]): PublishVerdict => {
  const reasons: string[] = [];
  const slugs = new Set<string>();
  const answers = new Map<string, string>();

  for (const page of pages) {
    if (slugs.has(page.slug)) reasons.push(`duplicate slug: ${page.slug}`);
    slugs.add(page.slug);

    if (page.supportingLinks.length < 2) {
      reasons.push(`${page.slug}: fewer than 2 onward links`);
    }

    const answer = normalize(`${page.shortAnswer}|${page.directAnswer}`);
    const existing = answers.get(answer);
    if (existing) reasons.push(`duplicate enduring answer: ${existing} and ${page.slug}`);
    else answers.set(answer, page.slug);
  }

  return { ok: reasons.length === 0, reasons };
};

/** The published set, or the bundled seed when there is none or it is invalid. */
export const readAnswerPagesWithSource = async (
  kv: KvNamespace | null = getWhetherKv(),
): Promise<{ pages: AnswerPageData[]; source: "kv" | "seed" }> => {
  if (!kv) return { pages: answerPageContent, source: "seed" };

  let raw: string | null;
  try {
    raw = await kv.get(ANSWER_CONTENT_KV_KEY);
  } catch {
    return { pages: answerPageContent, source: "seed" };
  }
  if (!raw) return { pages: answerPageContent, source: "seed" };

  try {
    return { pages: answerPagesSchema.parse(JSON.parse(raw)), source: "kv" };
  } catch {
    /* A published set that does not parse is worse than the seed. */
    return { pages: answerPageContent, source: "seed" };
  }
};

export const readAnswerPages = async (kv: KvNamespace | null = getWhetherKv()): Promise<AnswerPageData[]> =>
  (await readAnswerPagesWithSource(kv)).pages;

/**
 * The page a request should render: the published set's copy when one exists,
 * the bundled seed otherwise. Returns the same `DecisionPageDefinition` shape
 * `findDecisionPage` does, so callers do not branch.
 */
export const findPublishedDecisionPage = async (
  slug: string,
  kv: KvNamespace | null = getWhetherKv(),
): Promise<DecisionPageDefinition | undefined> => {
  const { pages, source } = await readAnswerPagesWithSource(kv);
  if (source === "seed") return findDecisionPage(slug);

  const page = pages.find((candidate) => candidate.slug === slug);
  if (!page) return undefined;
  return { ...page, mappedDecisionAreas: [...page.mappedDecisionAreas] };
};

/** Validate and publish a set. Throws rather than writing something invalid. */
export const publishAnswerPages = async (
  pages: unknown,
  kv: KvNamespace | null = getWhetherKv(),
): Promise<AnswerPageData[]> => {
  if (!kv) throw new Error("No KV binding is available to publish answer content.");
  const parsed = answerPagesSchema.parse(pages);
  const verdict = validateAnswerPagesForPublish(parsed);
  if (!verdict.ok) {
    throw new Error(`Answer content refused: ${verdict.reasons.join("; ")}`);
  }
  await kv.put(ANSWER_CONTENT_KV_KEY, JSON.stringify(parsed));
  return parsed;
};
