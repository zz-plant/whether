import type { AdviceStance } from "./adviceStance";
import {
  canonChangeLines,
  formatCanonShare,
  isPlacedCanonEntry,
  type CanonTimelineEntry,
  type PlacedEntry,
  type RecordMonth,
} from "./productCanon";

/**
 * The measures /concepts prints under its base-rate table, kept apart from the
 * list in `lib/productCanon.ts`: how long before each capital text the record
 * last moved, which score alone lines up with the advice, and the pairs of
 * texts that point opposite ways on one decision. Each is a count over the
 * record with its sample size beside it. None is offered as a cause.
 */

/**
 * Two texts on the same decision, one tagged expand and one conserve. Chosen
 * from the entries above in both directions on purpose: pairs whose months had
 * different conditions, and pairs whose months had the same ones.
 */
type AdvicePairDefinition = {
  decision: string;
  expand: string;
  conserve: string;
};

const advicePairDefinitions: readonly AdvicePairDefinition[] = [
  { decision: "How fast to grow", expand: "startup-equals-growth", conserve: "default-alive-or-default-dead" },
  { decision: "Hiring", expand: "the-saas-adventure", conserve: "the-upside-of-a-downturn" },
  { decision: "Speed or efficiency", expand: "blitzscaling", conserve: "update-on-metas-year-of-efficiency" },
  { decision: "Spending", expand: "its-time-to-build", conserve: "the-burn-multiple" },
];

const median = (values: readonly number[]) => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/** Null when no text has the measure: the event had not happened yet on the record. */
type LagSummary = { texts: number; median: number; min: number; max: number } | null;

const summarizeLag = (values: readonly number[]): LagSummary =>
  values.length === 0 ? null : { texts: values.length, median: median(values), min: Math.min(...values), max: Math.max(...values) };

const capitalEntries = (timeline: readonly CanonTimelineEntry[]) =>
  timeline.filter(isPlacedCanonEntry).filter((entry) => entry.stance !== "craft");

/**
 * How long before each capital text the record last moved: the latest change
 * in conditions, and the last crossing of each score's line. A distance in
 * time, measured; nothing here says the text answered the move.
 */
export const buildCapitalAdviceLag = (timeline: readonly CanonTimelineEntry[]) => {
  const entries = capitalEntries(timeline);
  return {
    capitalTexts: entries.length,
    sinceChange: summarizeLag(
      entries.filter((entry) => !entry.reading.heldSinceRecordStart).map((entry) => entry.reading.heldMonths - 1),
    ),
    sinceRiskAppetiteCrossed: summarizeLag(
      entries.flatMap((entry) => (entry.reading.monthsSinceRiskAppetiteCrossed === null ? [] : [entry.reading.monthsSinceRiskAppetiteCrossed])),
    ),
    sinceFundingPressureCrossed: summarizeLag(
      entries.flatMap((entry) =>
        entry.reading.monthsSinceFundingPressureCrossed === null ? [] : [entry.reading.monthsSinceFundingPressureCrossed],
      ),
    ),
  };
};

const monthsWord = (months: number) => (months === 1 ? "1 month" : `${months} months`);

const describeLagSummary = (lead: string, lag: LagSummary, capitalTexts: number, firstEvent: string) => {
  if (lag === null) return `${lead}: none of the ${capitalTexts} capital texts came after ${firstEvent}.`;
  const rest = capitalTexts - lag.texts;
  const excluded = rest === 0 ? "" : `; the other ${rest} came out before ${firstEvent}`;
  return lag.texts === 1
    ? `${lead}: ${monthsWord(lag.min)}, for the one capital text published after a crossing${excluded}.`
    : `${lead}: a median of ${monthsWord(lag.median)}, ranging from ${lag.min} to ${monthsWord(lag.max)}, across ${lag.texts} of the ${capitalTexts} capital texts${excluded}.`;
};

/** One sentence per measure, each with its count of texts and why the rest are out. */
export const describeCapitalAdviceLag = (lag: ReturnType<typeof buildCapitalAdviceLag>): string[] => [
  describeLagSummary("Since the latest change in conditions", lag.sinceChange, lag.capitalTexts, "the record's first change"),
  describeLagSummary(
    `Since risk appetite last crossed ${canonChangeLines.riskAppetite}`,
    lag.sinceRiskAppetiteCrossed,
    lag.capitalTexts,
    "its first crossing",
  ),
  describeLagSummary(
    `Since funding pressure last crossed ${canonChangeLines.fundingPressure}`,
    lag.sinceFundingPressureCrossed,
    lag.capitalTexts,
    "its first crossing",
  ),
];

type SideMatch = { matches: number; of: number };

/**
 * Which score, taken alone, sits on the side that matches each capital text:
 * funding pressure at or under its line, or risk appetite above its line, for
 * expand; the other side for conserve.
 */
export const buildScoreAlignment = (series: readonly RecordMonth[], timeline: readonly CanonTimelineEntry[]) => {
  const entries = capitalEntries(timeline);
  const count = (stance: AdviceStance, matches: (entry: PlacedEntry) => boolean): SideMatch => {
    const ofStance = entries.filter((entry) => entry.stance === stance);
    return { matches: ofStance.filter(matches).length, of: ofStance.length };
  };
  const fundingPressure = {
    expand: count("expand", (entry) => entry.reading.fundingPressure <= canonChangeLines.fundingPressure),
    conserve: count("conserve", (entry) => entry.reading.fundingPressure > canonChangeLines.fundingPressure),
  };
  const riskAppetite = {
    expand: count("expand", (entry) => entry.reading.riskAppetite > canonChangeLines.riskAppetite),
    conserve: count("conserve", (entry) => entry.reading.riskAppetite <= canonChangeLines.riskAppetite),
  };
  const monthShare = (onExpandSide: (month: RecordMonth) => boolean) =>
    series.length > 0 ? series.filter(onExpandSide).length / series.length : 0;
  return {
    capitalTexts: entries.length,
    fundingPressure: {
      ...fundingPressure,
      matches: fundingPressure.expand.matches + fundingPressure.conserve.matches,
      /** Share of all months on the expand side of this line: what matching an Expand text costs. */
      expandSideMonths: monthShare((month) => month.tightness <= canonChangeLines.fundingPressure),
    },
    riskAppetite: {
      ...riskAppetite,
      matches: riskAppetite.expand.matches + riskAppetite.conserve.matches,
      expandSideMonths: monthShare((month) => month.riskAppetite > canonChangeLines.riskAppetite),
    },
  };
};

export const describeScoreAlignment = (alignment: ReturnType<typeof buildScoreAlignment>): string[] => {
  const { capitalTexts, fundingPressure, riskAppetite } = alignment;
  if (capitalTexts === 0) return ["No capital text falls inside the record."];
  const better =
    riskAppetite.matches > fundingPressure.matches
      ? "Risk appetite lines up better"
      : fundingPressure.matches > riskAppetite.matches
        ? "Funding pressure lines up better"
        : "Neither score lines up better";
  return [
    `Risk appetite alone matches ${riskAppetite.matches} of the ${capitalTexts}: above ${canonChangeLines.riskAppetite} for ${riskAppetite.expand.matches} of ${riskAppetite.expand.of} Expand texts, and at ${canonChangeLines.riskAppetite} or below for ${riskAppetite.conserve.matches} of ${riskAppetite.conserve.of} Conserve texts.`,
    `Funding pressure alone matches ${fundingPressure.matches}: at ${canonChangeLines.fundingPressure} or below for ${fundingPressure.expand.matches} of ${fundingPressure.expand.of} Expand texts, and above ${canonChangeLines.fundingPressure} for ${fundingPressure.conserve.matches} of ${fundingPressure.conserve.of} Conserve texts.`,
    `For scale, funding pressure was at ${canonChangeLines.fundingPressure} or below in ${formatCanonShare(fundingPressure.expandSideMonths)} of all months, and risk appetite above ${canonChangeLines.riskAppetite} in ${formatCanonShare(riskAppetite.expandSideMonths)}.`,
    `${better}, on ${capitalTexts} texts. That is too few to rank the two scores.`,
  ];
};

/** The pairs, resolved against the timeline. A pair whose texts are missing or untagged the right way is dropped, not guessed. */
export const buildAdvicePairs = (timeline: readonly CanonTimelineEntry[]) =>
  advicePairDefinitions.flatMap((pair) => {
    const expand = timeline.find((entry) => entry.slug === pair.expand && entry.stance === "expand");
    const conserve = timeline.find((entry) => entry.slug === pair.conserve && entry.stance === "conserve");
    return expand && conserve ? [{ decision: pair.decision, expand, conserve }] : [];
  });

export const describeAdvicePairs = (pairs: ReturnType<typeof buildAdvicePairs>): string => {
  const placed = pairs.filter((pair) => isPlacedCanonEntry(pair.expand) && isPlacedCanonEntry(pair.conserve));
  const same = placed.filter(
    (pair) => pair.expand.reading.kind === "reading" && pair.conserve.reading.kind === "reading" && pair.expand.reading.regime === pair.conserve.reading.regime,
  ).length;
  return `In ${same} of these ${placed.length} pairs, both texts came out under the same conditions.`;
};

