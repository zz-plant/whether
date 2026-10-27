import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildChallengeQuery,
  buildCounterevidenceInput,
  buildSupportQuery,
  claimOf,
  cosineSimilarity,
  evidencePoolSchema,
  selectEvidencePool,
  type EvidencePassage,
} from "../lib/evidencePool";
import { counterevidenceInputSchema } from "../lib/jev/counterevidence";

/**
 * The retrieval side of the counterevidence loop: EmbeddingGemma turns a
 * recurring passage file into the pool `--mode counterevidence` judges. The
 * side tags are retrieval hypotheses — Clef judges them independently — so the
 * selection rules must be deterministic and the output must be exactly what
 * the audit accepts.
 */

const canonical = {
  recordDate: "2026-10-15", engineVersion: "test-engine", readingId: "reading-1",
  guidance: "Hold net-new hiring.", action: "Hold net-new hiring.",
  pauseLine: "Funding pressure above 70", resumeLine: "Funding pressure below 66",
  changeLine: "Risk appetite above 50", sourceUrl: "https://fred.stlouisfed.org/series/DGS1MO",
};

const passage = (id: string, overrides: Partial<EvidencePassage> = {}): EvidencePassage => ({
  id,
  title: "Advice on hiring",
  text: "In tight funding markets, founders should hold off on expanding headcount.",
  sourceUrl: "https://example.com/advice",
  publishedAt: "2026-10-01",
  ...overrides,
});

describe("source-pool query frames", () => {
  it("builds the support frame from the call as printed", () => {
    const query = buildSupportQuery(canonical);
    assert.match(query, /Hold net-new hiring\./);
    assert.match(query, /Funding pressure above 70/);
  });

  it("builds the challenge frame as the opposite stance, without the call's metrics", () => {
    const query = buildChallengeQuery();
    assert.match(query, /Money is cheaper again/);
    assert.match(query, /resume hiring/);
    assert.doesNotMatch(query, /Hold net-new hiring|Funding pressure|Risk appetite/, "metric vocabulary entangles the two frames' embeddings");
  });
});

describe("source-pool selection", () => {
  const similarities = (support: number[], challenge: number[]) => ({ support, challenge });

  it("ranks by relevance to the call and tags each passage with the frame it resembles more", () => {
    const pool = [
      passage("strong-support", { title: "Backs the call" }),
      passage("strong-challenge", { title: "Against the call" }),
      passage("both", { title: "Both at once" }),
      passage("below-floor", { title: "Unrelated" }),
      passage("top-support", { title: "Closest to the call" }),
    ];
    const { support, challenge } = similarities([0.8, 0.76, 0.75, 0.2, 0.9], [0.7, 0.9, 0.79, 0.1, 0.5]);
    const selection = selectEvidencePool(pool, support, challenge, { top: 4, minSimilarity: 0.3 });

    assert.deepEqual(selection.supporting.map((item) => item.passage.id), ["top-support", "strong-support"]);
    assert.deepEqual(selection.challenging.map((item) => item.passage.id), ["strong-challenge", "both"], "a passage similar to both frames is tagged by the closer one, not dropped");
    assert.equal(selection.excluded, 1, "below-floor passages are not retrieved");
  });

  it("tags an opposite-stance passage by the closer frame so Clef can correct it", () => {
    const pool = [passage("money-cheapens", { title: "The freeze lifts" })];
    const selection = selectEvidencePool(pool, [0.805], [0.802], { top: 6, minSimilarity: 0.3 });
    assert.deepEqual(selection.supporting.map((item) => item.passage.id), ["money-cheapens"], "it resembles the call's topic; the challenge is Clef's judgment");
    assert.deepEqual(selection.challenging, []);
    assert.equal(selection.excluded, 0);
  });

  it("computes cosine similarity the way the embedding pipeline does", () => {
    assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
    assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
    const angle = cosineSimilarity([1, 1], [1, 0]);
    assert.ok(Math.abs(angle - Math.SQRT1_2) < 1e-9);
    assert.equal(cosineSimilarity([0, 0], [1, 0]), 0, "a zero vector matches nothing, not everything");
  });
});

describe("source-pool output", () => {
  it("produces exactly the input the counterevidence audit accepts", () => {
    const input = buildCounterevidenceInput(canonical, [
      { passage: passage("s1", { title: "Backs the call" }), side: "support", supportSimilarity: 0.8, challengeSimilarity: 0.1 },
      { passage: passage("c1", { title: "A challenge", text: "Conditions will flip and hiring should resume.", publishedAt: "2026-10-02" }), side: "challenge", supportSimilarity: 0.2, challengeSimilarity: 0.75 },
    ]);

    const parsed = counterevidenceInputSchema.parse(input);
    assert.deepEqual(parsed.candidates.map((item) => item.id), ["s1", "c1"]);
    assert.deepEqual(parsed.candidates.map((item) => item.side), ["support", "challenge"]);
    assert.equal(parsed.candidates[0]?.claim, "Backs the call", "the passage's own title travels as the claim");
    assert.equal(parsed.candidates[1]?.sourceUrl, "https://example.com/advice");
    assert.equal(parsed.candidates[1]?.observedAt, "2026-10-02");
  });

  it("falls back to the first sentence of the text for a claim", () => {
    assert.equal(claimOf(passage("no-title", { title: undefined })), "In tight funding markets, founders should hold off on expanding headcount.");
  });

  it("refuses a pool with a duplicate passage id or a non-http source", () => {
    assert.throws(() => evidencePoolSchema.parse({ passages: [passage("a"), passage("a")] }), /unique/);
    assert.throws(() => evidencePoolSchema.parse({ passages: [passage("a", { sourceUrl: "javascript:alert(1)" })] }));
    assert.throws(() => evidencePoolSchema.parse({ passages: [] }), /invalid|array|expected|too small|at least/i);
  });
});