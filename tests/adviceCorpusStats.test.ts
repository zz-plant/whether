import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import {
  blockBootstrapIndices,
  circularShifts,
  cohensKappa,
  confusionMatrix,
  firmMatchedDifference,
  firmWeightedShare,
  holmAdjust,
  laggedCorrelation,
  pearson,
  percentileInterval,
  percentileRanks,
  permutationPValue,
  pooledShare,
  rotate,
  seededRandom,
} from "../scripts/advice-corpus/stats";
import { isAllowedByRobots, parseRobots } from "../scripts/advice-corpus/politeFetch";
import { applyExclusions, isAnnouncement } from "../scripts/advice-corpus/corpus";

const close = (actual: number, expected: number, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected}`);

describe("firm weighting", () => {
  // One prolific firm (nine posts, all expand) and one quiet firm (one post, conserve).
  const items = [
    ...Array.from({ length: 9 }, () => ({ firm: "Prolific", stance: "expand", weight: 1 })),
    { firm: "Quiet", stance: "conserve", weight: 1 },
  ];

  it("counts each firm once, so the prolific firm cannot outweigh the quiet one", () => {
    close(firmWeightedShare(items, "expand"), 0.5);
    close(firmWeightedShare(items, "conserve"), 0.5);
    close(pooledShare(items, "expand"), 0.9);
  });

  it("weights a sampled non-candidate by its inverse sampling probability inside its firm", () => {
    const withSample = [
      { firm: "A", stance: "craft", weight: 1 },
      { firm: "A", stance: "none", weight: 10 },
    ];
    close(firmWeightedShare(withSample, "none"), 10 / 11);
  });

  it("compares each firm with itself, so a firm present on one side only moves nothing", () => {
    const high = [
      ...Array.from({ length: 4 }, (_, index) => ({ firm: "A", stance: index === 0 ? "expand" : "conserve", weight: 1 })),
      ...Array.from({ length: 5 }, () => ({ firm: "NewFirm", stance: "conserve", weight: 1 })),
    ];
    const low = Array.from({ length: 4 }, (_, index) => ({ firm: "A", stance: index < 3 ? "expand" : "conserve", weight: 1 }));
    const result = firmMatchedDifference(high, low, "expand");
    assert.equal(result.firms, 1);
    close(result.difference, 0.25 - 0.75);
  });
});

describe("lagged correlation", () => {
  it("lines the outcome up with the driver `lag` months earlier", () => {
    const driver = [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0];
    const outcome = rotate(driver, 3); // the outcome follows the driver three months later
    close(laggedCorrelation(outcome, driver, 3), 1);
    assert.ok(laggedCorrelation(outcome, driver, 0) < 0.5);
  });

  it("skips months with no reading", () => {
    close(pearson([1, null, 3, 4], [2, 9, 6, 8]), pearson([1, 3, 4], [2, 6, 8]));
    assert.ok(Number.isNaN(pearson([1, 2], [1, 2])));
  });
});

describe("resampling and permutation", () => {
  it("is seeded: the same seed draws the same blocks", () => {
    assert.deepEqual(blockBootstrapIndices(30, 12, 3, seededRandom(7)), blockBootstrapIndices(30, 12, 3, seededRandom(7)));
  });

  it("draws whole blocks of consecutive periods, trimmed to the series length", () => {
    const [replicate] = blockBootstrapIndices(30, 12, 1, seededRandom(1));
    assert.equal(replicate.length, 30);
    assert.equal(replicate[1] - replicate[0], 1);
    assert.ok(replicate.every((index) => index >= 0 && index < 30));
  });

  it("rotates, shifts at least the minimum, and counts the observed value among the nulls", () => {
    assert.deepEqual(rotate([1, 2, 3, 4], 1), [4, 1, 2, 3]);
    assert.deepEqual(circularShifts(30, 12), [12, 13, 14, 15, 16, 17, 18]);
    close(permutationPValue(-0.3, [-0.4, -0.1, 0, 0.2], "lower"), 2 / 5);
    close(permutationPValue(0.5, [0.1, 0.6], "higher"), 2 / 3);
  });

  it("reads a percentile interval and ranks with ties", () => {
    const [low, high] = percentileInterval(Array.from({ length: 101 }, (_, index) => index));
    close(low, 2.5);
    close(high, 97.5);
    assert.deepEqual(percentileRanks([10, 20, 20, 30]), [0, 0.5, 0.5, 1]);
  });
});

describe("agreement", () => {
  it("computes Cohen's kappa against chance", () => {
    const hand = ["expand", "expand", "conserve", "conserve", "craft", "none"];
    const model = ["expand", "conserve", "conserve", "conserve", "craft", "none"];
    const { kappa, agreement } = cohensKappa(hand, model);
    close(agreement, 5 / 6);
    // p_e = (2·1 + 2·3 + 1·1 + 1·1) / 36 = 10/36
    close(kappa, (5 / 6 - 10 / 36) / (1 - 10 / 36));
    assert.deepEqual(confusionMatrix(hand, model, ["expand", "conserve", "craft", "none"]), [
      [1, 1, 0, 0],
      [0, 2, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ]);
  });

  it("adjusts p-values by Holm's step-down", () => {
    assert.deepEqual(holmAdjust([0.01, 0.04, 0.03]), [0.03, 0.06, 0.06]);
  });
});

describe("reading sources politely", () => {
  it("obeys the longest matching robots rule, wildcards included", () => {
    const policy = parseRobots(["User-agent: *", "Disallow: /library?*", "Allow: /library?categories=*", "Disallow: /*.md$"].join("\n"), "WhetherAdviceCorpus");
    assert.equal(isAllowedByRobots(policy, "/library?page=2"), false);
    assert.equal(isAllowedByRobots(policy, "/library?categories=growth"), true);
    assert.equal(isAllowedByRobots(policy, "/post.md"), false);
    assert.equal(isAllowedByRobots(policy, "/blog?page=3"), true);
  });

  it("prefers a group naming the corpus's agent over the wildcard, and keeps a crawl delay", () => {
    const policy = parseRobots(["User-agent: *", "Disallow: /", "", "User-agent: WhetherAdviceCorpus", "Crawl-delay: 5", "Allow: /writing/"].join("\n"), "WhetherAdviceCorpus/1.0");
    assert.equal(isAllowedByRobots(policy, "/writing/a-post"), true);
    assert.equal(policy.crawlDelaySeconds, 5);
    const blocked = parseRobots(["User-agent: GPTBot", "Disallow: /", "User-agent: *", "Allow: /"].join("\n"), "WhetherAdviceCorpus");
    assert.equal(isAllowedByRobots(blocked, "/anything"), true);
  });
});

describe("the registered exclusions", () => {
  it("drops investment, portfolio and hiring announcements by title, and keeps advice that mentions investing", () => {
    for (const title of ["Partnering with Pace: making work weightless", "Why We Invested in Darrow", "Welcome, Jared", "Sam Smith joins Greylock", "We're hiring"]) {
      assert.ok(isAnnouncement(title), title);
    }
    for (const title of ["How to raise a seed round", "Investing for the long term is a founder's job too", "What we look for in a Series A"]) {
      assert.ok(!isAnnouncement(title), title);
    }
  });

  it("applies short, announcement and duplicate exclusions in order, keeping a firm's earliest copy", () => {
    const post = (id: string, month: string, title: string, words = 400, firm = "USV") => ({ id, source: "avc", firm, url: `https://x/${id}`, title, author: null, month, words, text: "" });
    const result = applyExclusions([
      post("a", "2015-03", "Burn Rates"),
      post("b", "2015-01", "Burn Rates"),
      post("c", "2015-02", "Burn Rates", 400, "Benchmark"),
      post("d", "2015-02", "Video Of The Week", 90),
      post("e", "2015-02", "Introducing Our New Fund"),
      post("f", "2011-12", "Before the window"),
    ]);
    assert.deepEqual(result.kept.map((entry) => entry.id), ["b", "c"]);
    assert.deepEqual([result.short, result.announcement, result.duplicate], [1, 1, 1]);
  });
});
