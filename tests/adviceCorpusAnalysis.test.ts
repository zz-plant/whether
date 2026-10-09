import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import {
  addMonths,
  groupByMonth,
  highLowDifference,
  monthGrid,
  netSeries,
  periodShares,
  PRIMARY,
  quarterOf,
  scanLags,
  selectPosts,
  type CorpusPost,
  type RecordMonth,
  type Stance,
} from "../scripts/advice-corpus/analysis";

let counter = 0;
const post = (month: string, firm: string, stance: Stance, fields: Partial<CorpusPost> = {}): CorpusPost => ({
  id: `p${(counter += 1)}`,
  firm,
  month,
  prefilter: "candidate",
  capitalRelevant: true,
  audience: "founders",
  stance,
  metrics: [],
  confidence: "high",
  ...fields,
});

describe("the month grid", () => {
  it("steps months and quarters across year ends", () => {
    assert.equal(addMonths("2022-07", 12), "2023-07");
    assert.equal(addMonths("2022-01", -1), "2021-12");
    assert.deepEqual(monthGrid("2021-11", "2022-02"), ["2021-11", "2021-12", "2022-01", "2022-02"]);
    assert.equal(quarterOf("2022-09"), "2022Q3");
  });
});

describe("the eligible set", () => {
  it("keeps capital-relevant posts addressed to founders, candidates only, for the primary analysis", () => {
    const posts = [
      post("2015-01", "A", "expand"),
      post("2015-01", "A", "craft", { capitalRelevant: false }),
      post("2015-01", "A", "conserve", { audience: "lps" }),
      post("2015-01", "A", "conserve", { prefilter: "sample" }),
    ];
    assert.equal(selectPosts(posts, PRIMARY).length, 1);
    assert.equal(selectPosts(posts, { capitalOnly: false, includeSample: true }).length, 3);
  });
});

describe("period shares", () => {
  it("weight each firm present equally, and leave an empty period empty", () => {
    const posts = [post("2015-01", "A", "expand"), post("2015-01", "A", "expand"), post("2015-01", "A", "expand"), post("2015-02", "B", "conserve"), post("2015-01", "B", "conserve")];
    const [january, february, march] = periodShares(posts, ["2015-01", "2015-02", "2015-03"], (month) => month);
    assert.equal(january.shares.expand, 0.5);
    assert.equal(january.firms, 2);
    assert.equal(february.shares.conserve, 1);
    assert.equal(march.n, 0);
    assert.ok(Number.isNaN(march.shares.expand));
    const pooled = periodShares(posts, ["2015-01"], (month) => month, true);
    assert.equal(pooled[0].shares.expand, 0.75);
  });

  it("give net stance only for months with at least three posts", () => {
    const posts = [post("2015-01", "A", "expand"), post("2015-01", "B", "expand"), post("2015-01", "C", "conserve"), post("2015-02", "A", "expand")];
    const [january, february] = netSeries(posts, ["2015-01", "2015-02"]);
    assert.ok(january !== null && Math.abs(january - (2 / 3 - 1 / 3)) < 1e-9);
    assert.equal(february, null);
  });
});

describe("the lag scan", () => {
  it("finds the lag at which conservation steps up after a crossing", () => {
    // Conserve share 0 until three months after the crossing, then 1; two firms throughout.
    const crossing = "2022-07";
    const posts = monthGrid("2021-01", "2024-06").flatMap((month) => {
      const stance: Stance = month >= addMonths(crossing, 3) ? "conserve" : "expand";
      return [post(month, "A", stance), post(month, "B", stance)];
    });
    const scan = scanLags(groupByMonth(posts), crossing, [0, 1, 2, 3, 4, 5, 6], "conserve");
    assert.equal(scan.bestLag, 3);
    assert.equal(scan.best, 1);
    assert.ok(scan.lags[0].difference < 1);
  });
});

describe("the high/low difference", () => {
  it("is negative and significant when expansion falls in high-pressure months", () => {
    const months = monthGrid("2015-01", "2024-12");
    const record: RecordMonth[] = months.map((month) => ({ month, fp: month >= "2021-01" && month <= "2022-12" ? 90 : 10, ra: 50 }));
    const posts = months.flatMap((month) => {
      const high = month >= "2021-01" && month <= "2022-12";
      return ["A", "B", "C"].map((firm, index) => post(month, firm, high ? (index === 0 ? "expand" : "conserve") : index === 2 ? "conserve" : "expand"));
    });
    const result = highLowDifference(posts, record, (month) => month.fp > 70, "expand", { replicates: 200, seed: 1, direction: "lower" });
    assert.ok(Math.abs(result.estimate - (1 / 3 - 2 / 3)) < 1e-9, String(result.estimate));
    assert.equal(result.firms, 3);
    assert.ok((result.p ?? 1) < 0.05, String(result.p));
    assert.ok(result.high < 0);
  });
});
