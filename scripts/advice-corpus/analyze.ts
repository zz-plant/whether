#!/usr/bin/env bun
/**
 * Stage 6: the registered analysis, run once on the committed labels and the month-end record.
 * Prints every number the results document reports, as JSON; seeded, so a re-run prints the
 * same numbers.
 *
 *   bun run advice-corpus:analyze > .cache/advice-corpus/results.json
 */
import { getRegimePublicLabel } from "../../lib/regimePresentation";
import { getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";
import {
  addMonths,
  compareDrivers,
  eraShares,
  eventWindow,
  FP_LINE,
  highLowDifference,
  lagAfterCrossing,
  monthGrid,
  netSeries,
  periodShares,
  PRIMARY,
  quarterOf,
  RA_LINE,
  scanLags,
  groupByMonth,
  selectPosts,
  shareOfMonths,
  STANCE_KEYS,
  type CorpusPost,
  type RecordMonth,
  type Selection,
} from "./analysis";
import { SEEDS } from "./paths";
import { METRICS } from "./rubric";
import { readPostsFile, toCorpusPost } from "./siteData";
import { holmAdjust, laggedCorrelation, mean, pearson } from "./stats";

const REPLICATES = 2000;
const LAGS = Array.from({ length: 13 }, (_, lag) => lag);
const CROSSING = "2022-07";

/** The month-end record as the analysis reads it. */
export function loadRecord(first: string, last: string): { record: RecordMonth[]; changes: { month: string; from: string; to: string }[] } {
  const series = getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER);
  const inWindow = series.filter((entry) => entry.recordDate.slice(0, 7) >= first && entry.recordDate.slice(0, 7) <= last);
  const changes: { month: string; from: string; to: string }[] = [];
  inWindow.forEach((entry, index) => {
    const previous = inWindow[index - 1];
    if (previous && previous.regime !== entry.regime) {
      changes.push({ month: entry.recordDate.slice(0, 7), from: getRegimePublicLabel(previous.regime), to: getRegimePublicLabel(entry.regime) });
    }
  });
  return { record: inWindow.map((entry) => ({ month: entry.recordDate.slice(0, 7), fp: entry.tightness, ra: entry.riskAppetite })), changes };
}

const wilson = (hits: number, n: number) => {
  if (n === 0) return { share: Number.NaN, low: Number.NaN, high: Number.NaN };
  const z = 1.96;
  const p = hits / n;
  const centre = (p + (z * z) / (2 * n)) / (1 + (z * z) / n);
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / (1 + (z * z) / n);
  return { share: p, low: centre - half, high: centre + half };
};

const highFp = (month: RecordMonth) => month.fp > FP_LINE;
const highRa = (month: RecordMonth) => month.ra > RA_LINE;

function hypotheses(posts: readonly CorpusPost[], record: readonly RecordMonth[], selection: Selection, pooled = false) {
  const months = record.map((month) => month.month);
  const eligible = selectPosts(posts, selection);
  const h1 = highLowDifference(eligible, record, highFp, "expand", { replicates: REPLICATES, seed: SEEDS.bootstrap, direction: "lower", pooled });
  const pseudo = monthGrid("2013-01", "2020-07").filter((month) =>
    monthGrid(addMonths(month, -12), addMonths(month, 23)).every((inner) => (record.find((entry) => entry.month === inner)?.fp ?? 0) <= FP_LINE),
  );
  const h2 = lagAfterCrossing(eligible, { crossing: CROSSING, pseudoCrossings: pseudo, lags: LAGS, replicates: REPLICATES, seed: SEEDS.bootstrap, pooled });
  const net = netSeries(eligible, months, pooled);
  const h3 = compareDrivers(
    net,
    record.map((month) => month.fp),
    record.map((month) => month.ra),
    { lags: LAGS, replicates: REPLICATES, seed: SEEDS.bootstrap },
  );
  return { eligible: eligible.length, h1, h2, h3 };
}

function quarterlyH3(posts: readonly CorpusPost[], record: readonly RecordMonth[]) {
  const eligible = selectPosts(posts, PRIMARY);
  const quarters = [...new Set(record.map((month) => quarterOf(month.month)))];
  const rows = periodShares(eligible, quarters, quarterOf);
  const net = rows.map((row) => (row.n >= 3 ? row.shares.expand - row.shares.conserve : null));
  const quarterMean = (pick: (month: RecordMonth) => number) =>
    quarters.map((quarter) => mean(record.filter((month) => quarterOf(month.month) === quarter).map(pick)));
  return compareDrivers(net, quarterMean((month) => month.fp), quarterMean((month) => month.ra), {
    lags: [0, 1, 2, 3, 4],
    replicates: REPLICATES,
    seed: SEEDS.bootstrap,
  });
}

function main() {
  const postsArg = process.argv.indexOf("--posts");
  const postsFile = postsArg > -1 ? readPostsFile(process.argv[postsArg + 1]) : readPostsFile();
  const posts = postsFile.posts.map(toCorpusPost);
  const { record, changes } = loadRecord(postsFile.window.first, postsFile.window.last);
  const months = record.map((month) => month.month);
  const primary = selectPosts(posts, PRIMARY);

  // Base rates.
  const firms = [...new Set(posts.map((post) => post.firm))].sort();
  const byFirm = firms.map((firm) => {
    const ofFirm = posts.filter((post) => post.firm === firm);
    const eligible = primary.filter((post) => post.firm === firm);
    return {
      firm,
      classified: ofFirm.length,
      eligible: eligible.length,
      firstMonth: eligible[0]?.month ?? null,
      lastMonth: eligible.at(-1)?.month ?? null,
      stance: Object.fromEntries(STANCE_KEYS.map((stance) => [stance, eligible.filter((post) => post.stance === stance).length])),
    };
  });
  const topFirm = [...byFirm].sort((a, b) => b.eligible - a.eligible)[0]?.firm ?? "";
  const highMonths = new Set(record.filter(highFp).map((month) => month.month));
  const byFirmPressure = firms.map((firm) => {
    const side = (high: boolean) => {
      const inSide = primary.filter((post) => post.firm === firm && highMonths.has(post.month) === high);
      const share = (stance: string) => (inSide.length === 0 ? null : inSide.filter((post) => post.stance === stance).length / inSide.length);
      return { posts: inSide.length, expand: share("expand"), conserve: share("conserve"), craft: share("craft") };
    };
    return { firm, low: side(false), high: side(true) };
  });
  const overall = {
    classified: posts.length,
    candidates: posts.filter((post) => post.prefilter === "candidate").length,
    sampled: posts.filter((post) => post.prefilter === "sample").length,
    capitalRelevantCandidates: posts.filter((post) => post.prefilter === "candidate" && post.capitalRelevant).length,
    eligible: primary.length,
    audience: Object.fromEntries(["founders", "lps", "general"].map((audience) => [audience, posts.filter((post) => post.audience === audience).length])),
    stanceAmongEligible: Object.fromEntries(STANCE_KEYS.map((stance) => [stance, primary.filter((post) => post.stance === stance).length])),
    stanceAll: Object.fromEntries(STANCE_KEYS.map((stance) => [stance, posts.filter((post) => post.stance === stance).length])),
    confidence: Object.fromEntries(["high", "medium", "low"].map((level) => [level, posts.filter((post) => post.confidence === level).length])),
    evidenceVerbatim: postsFile.posts.filter((post) => post.evidence !== "").reduce((sum, post) => sum + (post.evidenceVerbatim ? 1 : 0), 0),
    evidenceGiven: postsFile.posts.filter((post) => post.evidence !== "").length,
    monthsAboveFpLine: shareOfMonths(record, highFp),
    monthsAboveRaLine: shareOfMonths(record, highRa),
    eligibleByYear: Object.fromEntries(
      [...new Set(months.map((month) => month.slice(0, 4)))].map((year) => [year, primary.filter((post) => post.month.startsWith(year)).length]),
    ),
  };

  // Prefilter: what the sample says the score dropped.
  const sampled = posts.filter((post) => post.prefilter === "sample");
  const missCapital = wilson(sampled.filter((post) => post.capitalRelevant).length, sampled.length);
  const missEligible = wilson(sampled.filter((post) => post.capitalRelevant && post.audience === "founders").length, sampled.length);
  const nonCandidates = postsFile.counts.nonCandidates ?? Number.NaN;
  const foundCapital = posts.filter((post) => post.prefilter === "candidate" && post.capitalRelevant).length;
  const prefilter = {
    missCapital,
    missEligible,
    nonCandidates,
    estimatedMissedCapital: missCapital.share * nonCandidates,
    recallCapital: foundCapital / (foundCapital + missCapital.share * nonCandidates),
    recallCapitalInterval: [foundCapital / (foundCapital + missCapital.high * nonCandidates), foundCapital / (foundCapital + missCapital.low * nonCandidates)],
  };

  // H1–H3 on the primary set, then the robustness checks.
  const main = hypotheses(posts, record, PRIMARY);
  const robustness = {
    R1_unweighted: hypotheses(posts, record, PRIMARY, true),
    R2_withoutTopFirm: { firm: topFirm, ...hypotheses(posts, record, { ...PRIMARY, excludeFirm: topFirm }) },
    R3_allFounderPosts: hypotheses(posts, record, { capitalOnly: false, includeSample: true }),
    R4_quarterlyH3: quarterlyH3(posts, record),
    R5_withSample: hypotheses(posts, record, { capitalOnly: true, includeSample: true }),
    R6_confidentOnly: hypotheses(posts, record, { ...PRIMARY, minConfidence: "medium" }),
  };
  const holm = holmAdjust([main.h1.p ?? Number.NaN, main.h2.estimate.p ?? Number.NaN, main.h3.fp.p]);

  // H2 secondary: advice leading the crossing, the cross-correlation, and the downward crossing.
  const byMonth = groupByMonth(primary);
  const leading = scanLags(byMonth, CROSSING, Array.from({ length: 12 }, (_, index) => index - 12), "conserve");
  const conserveSeries = periodShares(primary, months, (month) => month).map((row) => (row.n >= 3 ? row.shares.conserve : null));
  const aboveLine = record.map((month) => (highFp(month) ? 1 : 0));
  const crossCorrelation = LAGS.map((lag) => ({ lag, r: laggedCorrelation(conserveSeries, aboveLine, lag) }));
  const downward = scanLags(byMonth, "2025-12", [0, 1, 2, 3], "conserve");

  // H4: craft among all founder-addressed posts, with the prefilter weights.
  const founders = selectPosts(posts, { capitalOnly: false, includeSample: true });
  const h4 = {
    fp: highLowDifference(founders, record, highFp, "craft", { replicates: REPLICATES, seed: SEEDS.bootstrap, direction: "higher" }),
    ra: highLowDifference(founders, record, highRa, "craft", { replicates: REPLICATES, seed: SEEDS.bootstrap, direction: "higher" }),
    lag0: {
      fp: pearson(
        periodShares(founders, months, (month) => month).map((row) => (row.n >= 3 ? row.shares.craft : null)),
        record.map((month) => month.fp),
      ),
      ra: pearson(
        periodShares(founders, months, (month) => month).map((row) => (row.n >= 3 ? row.shares.craft : null)),
        record.map((month) => month.ra),
      ),
    },
  };

  // H5 (exploratory): metric families among eligible posts that name any metric.
  const naming = primary.filter((post) => post.metrics.length > 0);
  const family = (post: CorpusPost, wanted: string) =>
    post.metrics.some((metric) => Object.entries(METRICS).some(([key, value]) => key === metric && value === wanted)) ? "yes" : "no";
  const h5 = {
    naming: naming.length,
    efficiency: highLowDifference(naming, record, highFp, "yes", {
      replicates: REPLICATES,
      seed: SEEDS.bootstrap,
      direction: "higher",
      labelOf: (post) => family(post, "efficiency"),
    }),
    growth: highLowDifference(naming, record, highFp, "yes", {
      replicates: REPLICATES,
      seed: SEEDS.bootstrap,
      direction: "lower",
      labelOf: (post) => family(post, "growth"),
    }),
    byYear: [...new Set(months.map((month) => month.slice(0, 4)))].map((year) => {
      const inYear = primary.filter((post) => post.month.startsWith(year));
      const share = (metric: string) => (inYear.length === 0 ? null : inYear.filter((post) => post.metrics.includes(metric)).length / inYear.length);
      return {
        year,
        eligible: inYear.length,
        growth_rate: share("growth_rate"),
        valuation_multiple: share("valuation_multiple"),
        burn_multiple: share("burn_multiple"),
        cac_payback: share("cac_payback"),
        rule_of_40: share("rule_of_40"),
        anyEfficiency: inYear.length === 0 ? null : inYear.filter((post) => family(post, "efficiency") === "yes").length / inYear.length,
        anyGrowth: inYear.length === 0 ? null : inYear.filter((post) => family(post, "growth") === "yes").length / inYear.length,
      };
    }),
  };

  // Event windows around the changes in conditions.
  const events = changes.map((change) => ({
    ...change,
    expand: eventWindow(primary, change.month, "expand", { width: 6, replicates: REPLICATES, seed: SEEDS.bootstrap, last: postsFile.window.last }),
    conserve: eventWindow(primary, change.month, "conserve", { width: 6, replicates: REPLICATES, seed: SEEDS.bootstrap, last: postsFile.window.last }),
  }));


  console.log(
    JSON.stringify(
      {
        window: postsFile.window,
        counts: postsFile.counts,
        changes,
        overall,
        byFirm,
        byFirmPressure,
        prefilter,
        eras: eraShares(primary),
        h1: main.h1,
        h2: { ...main.h2, leading, crossCorrelation, downward },
        h3: main.h3,
        holm: { h1: holm[0], h2: holm[1], h3: holm[2] },
        h4,
        h5,
        events,
        robustness,
      },
      (_, value) => (typeof value === "number" && !Number.isFinite(value) ? null : value),
      1,
    ),
  );
}

if (import.meta.main) main();
