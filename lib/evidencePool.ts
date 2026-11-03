import { z } from "zod";
import { canonicalAuditSchema } from "./jev/auditRequests";

/**
 * The source-pool builder: turns a recurring passage collection into the input
 * `--mode counterevidence` judges.
 *
 * The counterevidence loop's gap was that its pool was hand-assembled per
 * week. This is the retrieval side: given a passage file (the recurring
 * evidence set) and the weekly call's canonical document, EmbeddingGemma
 * retrieves passages that support the operating implication and passages that
 * challenge its assumptions, each tagged with the side it was retrieved for.
 *
 * The side is a *retrieval hypothesis*, not a verdict: Clef judges each
 * candidate independently in `--mode counterevidence`, and the packet carries
 * both the pool's side and the model's judgment so the two can be compared.
 * Everything here is pure and deterministic — embedding happens in
 * `scripts/pool-builder.ts` — so the selection rules are testable offline.
 */

const evidencePassageSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(500).optional(),
  text: z.string().min(1).max(12_000),
  sourceUrl: z.url({ protocol: /^https?$/ }),
  /** The passage's own publication date; becomes the candidate's `observedAt`. */
  publishedAt: z.iso.date(),
});
export type EvidencePassage = z.infer<typeof evidencePassageSchema>;

export const evidencePoolSchema = z.object({
  passages: z.array(evidencePassageSchema).min(1).max(500)
    .refine((items) => new Set(items.map((passage) => passage.id)).size === items.length, "passage ids must be unique"),
});

/** The canonical shape the pool is built against; the same object `--mode counterevidence` reads. */
export const poolCanonicalSchema = canonicalAuditSchema;
type PoolCanonical = z.infer<typeof poolCanonicalSchema>;

/**
 * The retrieval frame for "what backs the call": the guidance as printed, with
 * its pause and restart lines, so passages about the same operating mechanism
 * rank highest.
 */
export const buildSupportQuery = (canonical: PoolCanonical): string =>
  [canonical.guidance, canonical.action, canonical.pauseLine, canonical.resumeLine]
    .filter((line): line is string => Boolean(line))
    .join(" ");

/**
 * The retrieval frame for "what could change it": the opposite stance, stated
 * without the call's metric vocabulary. EmbeddingGemma's embeddings are topic
 * similarity, not stance — a frame that restates the call's change line embeds
 * ~0.9-similar to the support frame and no challenge passage separates
 * (measured 2026-10-23 on the live weekly reading). This frame instead
 * describes the opposite action in different words, so it retrieves passages
 * arguing the other side.
 *
 * It is deterministic and posture-agnostic enough to be a starting point: for a
 * tightening call the opposite stance is expansion. The side it suggests is a
 * hypothesis, never a verdict — Clef classifies each candidate's stance in
 * `--mode counterevidence`, and a mismatch between the pool's side and the
 * model's judgment is exactly the retrieval-quality signal the reviewed-case
 * registry measures.
 */
export const buildChallengeQuery = (): string =>
  "Money is cheaper again and the freeze lifts. Companies resume hiring, new spend, and the new bets they postponed. What should a startup do now?";

export const cosineSimilarity = (a: number[], b: number[]): number => {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < length; index += 1) {
    const av = a[index] ?? 0;
    const bv = b[index] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
};

type PoolSelectionOptions = {
  /** How many passages to retrieve in total, by relevance to the call. */
  top: number;
  /** A passage must clear this similarity to the call's frame to be retrieved. */
  minSimilarity: number;
};

type PoolCandidate = {
  passage: EvidencePassage;
  /** The frame the passage resembles more; a hypothesis Clef verifies, not a stance verdict. */
  side: "support" | "challenge";
  supportSimilarity: number;
  challengeSimilarity: number;
};

/**
 * The retrieval decision, purely from similarity. Embedding similarity is
 * topic similarity, so the pool is ranked by relevance to the call's frame and
 * each passage is tagged with the frame it resembles more. Passages that argue
 * the opposite stance with the call's own vocabulary still resemble the call's
 * frame — they are tagged by the closer frame and Clef corrects the stance, so
 * the interesting disagreements stay in the pool instead of being dropped as
 * "ambiguous" (measured 2026-10-23: a margin filter dropped the one genuine
 * challenge of the live weekly reading).
 */
export const selectEvidencePool = (
  passages: EvidencePassage[],
  supportSimilarity: number[],
  challengeSimilarity: number[],
  options: PoolSelectionOptions,
): { supporting: PoolCandidate[]; challenging: PoolCandidate[]; excluded: number } => {
  const ranked = passages
    .map((passage, index) => ({
      passage,
      supportSimilarity: supportSimilarity[index] ?? 0,
      challengeSimilarity: challengeSimilarity[index] ?? 0,
    }))
    .filter(({ supportSimilarity }) => supportSimilarity >= options.minSimilarity)
    .sort((a, b) => b.supportSimilarity - a.supportSimilarity || a.passage.id.localeCompare(b.passage.id))
    .slice(0, options.top);

  const supporting: PoolCandidate[] = [];
  const challenging: PoolCandidate[] = [];
  for (const item of ranked) {
    const side: "support" | "challenge" = item.supportSimilarity >= item.challengeSimilarity ? "support" : "challenge";
    (side === "support" ? supporting : challenging).push({ ...item, side });
  }

  return {
    supporting,
    challenging,
    excluded: passages.length - ranked.length,
  };
};

/** The claim a candidate carries: the passage's own title, or its first sentence. */
export const claimOf = (passage: EvidencePassage): string => {
  if (passage.title) return passage.title;
  const first = passage.text.split(/(?<=[.!?])\s+/)[0]?.trim() ?? passage.text;
  return first.length > 200 ? `${first.slice(0, 197)}...` : first;
};

/**
 * Builds the exact input `--mode counterevidence` consumes, so the pool drops
 * straight into the audit. `counterevidenceInputSchema` validates the result.
 */
export const buildCounterevidenceInput = (
  canonical: PoolCanonical,
  candidates: PoolCandidate[],
) => ({
  canonical,
  candidates: candidates.map(({ passage, side }) => ({
    id: passage.id,
    claim: claimOf(passage),
    excerpt: passage.text,
    sourceUrl: passage.sourceUrl,
    observedAt: passage.publishedAt,
    side,
  })),
});