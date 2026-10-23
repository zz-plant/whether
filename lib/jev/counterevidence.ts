import { z } from "zod";
import { canonicalAuditSchema, instruction, noul } from "./auditRequests";
import { parseJevResponse, type JevQuestion, type JevRequest, type JevResult } from "./jevClient";

/**
 * The counterevidence review packet (weekly brief → evidence for and against).
 *
 * The evidence mode (`--mode evidence`) ranks supplied candidates for how well
 * they *support* the call. This mode asks the third question the review loop
 * needs: whether a candidate's claim, if it holds, would *weaken* the call's
 * operating implication — a challenge, judged independently of the side the
 * source pool retrieved the passage for. The packet is assembled
 * deterministically from Clef's typed answers: what could weaken this call
 * (the source-supported challenges), what backs it (the supporting passages),
 * and what would require reconsideration (the canonical change line — printed
 * by the engine, never invented by a model).
 *
 * No generated claims. A challenge is only listed when the excerpt supports
 * the claim (`supported_*` ≥ threshold) and the model judged it challenging
 * (`challenges_*` ≥ threshold) with a relevant claim; anything unresolved or
 * failed goes to the review list for a person. The packet keeps each
 * candidate's own wording and citation, and the side the pool retrieved it
 * for, so a reviewer can see where retrieval and judgment disagree.
 */

const counterevidenceCandidateSchema = z.object({
  id: z.string().min(1).max(100),
  claim: z.string().min(1).max(12_000),
  excerpt: z.string().min(1).max(12_000),
  sourceUrl: z.url({ protocol: /^https?$/ }),
  observedAt: z.iso.date(),
  /** The side the pool retrieved the passage for; Clef judges independently and may disagree. */
  side: z.enum(["support", "challenge"]).optional(),
});

export const counterevidenceInputSchema = z.object({
  canonical: canonicalAuditSchema,
  candidates: z.array(counterevidenceCandidateSchema).min(1).max(16)
    .refine((items) => new Set(items.map((item) => item.id)).size === items.length, "candidate IDs must be unique"),
});

export type CounterevidenceInput = z.infer<typeof counterevidenceInputSchema>;

/** The same three per-candidate judgments the other evidence mode asks, plus the challenge direction. */
export const buildCounterevidenceAudit = (input: unknown): JevRequest => {
  const bundle = counterevidenceInputSchema.parse(input);
  const questions: Record<string, JevQuestion> = {};
  bundle.candidates.forEach((_, index) => {
    questions[`relevance_${index}`] = {
      type: "score", instructions: instruction(`How directly does \`candidates[${index}].claim\` explain an operating implication of \`canonical.guidance\`?`),
      criteria: ["Unrelated to the guidance", "Useful background without a decision implication", "Directly explains an operating implication"],
    };
    questions[`supported_${index}`] = noul(
      `Does \`candidates[${index}].excerpt\` support \`candidates[${index}].claim\` in context?`,
      "Excerpt supports the claim",
      "Unsupported, contradicted or insufficient evidence",
    );
    questions[`challenges_${index}`] = noul(
      `If \`candidates[${index}].claim\` holds, does it weaken the operating implication of \`canonical.guidance\`?`,
      "Holds → the guidance's implication is weaker or wrong",
      "Holds → the guidance's implication still stands",
    );
  });
  return { state: bundle, questions };
};

type CounterevidenceFinding = {
  /** The candidate's own id, kept verbatim. */
  id: string;
  claim: string;
  excerpt: string;
  sourceUrl: string;
  observedAt: string;
  /** What the pool retrieved the passage for; null when the pool said nothing. */
  side: "support" | "challenge" | null;
  /** 1–3, the model's relevance level. */
  relevance: number;
  /** 0–1, whether the excerpt supports the claim. */
  support: number;
  /** 0–1, whether the claim would weaken the call. */
  challenge: number;
};

type CounterevidencePacket = {
  call: {
    guidance: string;
    action: string | null;
    pauseLine: string | null;
    changeLine: string | null;
    recordDate: string;
    readingId: string;
    engineVersion: string;
  };
  /** What backs the call: supported, relevant, and not judged challenging. */
  supporting: CounterevidenceFinding[];
  /** What could weaken it: judged challenging, and the excerpt supports the claim. */
  challenges: CounterevidenceFinding[];
  /** What would require reconsideration — the engine's printed change line, never a model's invention. */
  reconsideration: string | null;
  /** Candidates a person should look at: failed calls, or judgments near the threshold. */
  review: string[];
  /** Whether the review actually ran. Distinguishes "ran, found none" from "never ran". */
  ran: boolean;
};

const callOf = (bundle: CounterevidenceInput): CounterevidencePacket["call"] => ({
  guidance: bundle.canonical.guidance,
  action: bundle.canonical.action ?? null,
  pauseLine: bundle.canonical.pauseLine ?? null,
  changeLine: bundle.canonical.changeLine ?? null,
  recordDate: bundle.canonical.recordDate,
  readingId: bundle.canonical.readingId,
  engineVersion: bundle.canonical.engineVersion,
});

const isUnresolved = (p: number | undefined, threshold: number): boolean =>
  typeof p === "number" && p > 1 - threshold && p < threshold;

/**
 * Deterministic assembly: a challenge must be source-supported and relevant, or
 * it is noise and goes to the review list. Near-threshold judgments and failed
 * calls are never read as clears, matching `selectEvidence`'s gate.
 */
export const buildCounterevidencePacket = (
  input: unknown,
  result: JevResult,
  threshold: number,
): CounterevidencePacket => {
  const bundle = counterevidenceInputSchema.parse(input);
  const validated = result.ok ? parseJevResponse(result, buildCounterevidenceAudit(input).questions) : result;
  if (!validated.ok) {
    return {
      call: callOf(bundle),
      supporting: [],
      challenges: [],
      reconsideration: bundle.canonical.changeLine ?? null,
      review: bundle.candidates.map((candidate) => candidate.id),
      ran: false,
    };
  }

  const supporting: CounterevidenceFinding[] = [];
  const challenges: CounterevidenceFinding[] = [];
  const review: string[] = [];

  bundle.candidates.forEach((candidate, index) => {
    const relevance = validated.answers[`relevance_${index}`];
    const support = validated.answers[`supported_${index}`];
    const challenge = validated.answers[`challenges_${index}`];
    if (relevance?.type !== "score" || support?.type !== "noul" || challenge?.type !== "noul") {
      review.push(candidate.id);
      return;
    }
    const finding: CounterevidenceFinding = {
      id: candidate.id,
      claim: candidate.claim,
      excerpt: candidate.excerpt,
      sourceUrl: candidate.sourceUrl,
      observedAt: candidate.observedAt,
      side: candidate.side ?? null,
      relevance: relevance.score,
      support: support.noul,
      challenge: challenge.noul,
    };

    const relevant = relevance.confidence >= threshold && relevance.score >= 2;
    const supported = support.noul >= threshold;
    const challenging = challenge.noul >= threshold;
    if (!relevant || !supported || isUnresolved(support.noul, threshold) || isUnresolved(challenge.noul, threshold)) {
      review.push(candidate.id);
      return;
    }
    if (challenging) challenges.push(finding);
    else supporting.push(finding);
  });

  const byChallenge = (a: CounterevidenceFinding, b: CounterevidenceFinding) =>
    b.challenge - a.challenge || b.relevance - a.relevance || a.id.localeCompare(b.id);
  const byRelevance = (a: CounterevidenceFinding, b: CounterevidenceFinding) =>
    b.relevance - a.relevance || b.support - a.support || a.id.localeCompare(b.id);

  return {
    call: callOf(bundle),
    supporting: supporting.sort(byRelevance),
    challenges: challenges.sort(byChallenge),
    reconsideration: bundle.canonical.changeLine ?? null,
    review: [...new Set(review)].sort(),
    ran: true,
  };
};

/**
 * The packet's one-line verdict, so an empty result reads as a finding rather
 * than silence: "no sourced challenge this week" is itself a trust claim, and a
 * run that never completed says so instead of reporting a clean bill of health.
 */
export const summarizeCounterevidencePacket = (packet: CounterevidencePacket): string => {
  if (!packet.ran) return "the review could not run — nothing was judged";
  if (packet.challenges.length > 0) {
    return packet.challenges.length === 1
      ? "1 sourced challenge to this call"
      : `${packet.challenges.length} sourced challenges to this call`;
  }
  if (packet.supporting.length > 0) {
    return packet.supporting.length === 1
      ? "no sourced challenge this week — 1 supporting passage"
      : `no sourced challenge this week — ${packet.supporting.length} supporting passages`;
  }
  return "nothing was retrieved for this call";
};