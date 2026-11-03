import type { TimeMachineRegimeEntry } from "../timeMachine/timeMachineCache";
import { REGIME_SEVERITY_RANK, getRegimePublicLabel, isRegimeKey } from "../regimePresentation";
import type { RegimeKey } from "../regimeEngine";
import { signalReadingMeaning } from "./signalTranslations";
import { formatMonthLabel } from "../timeMachine/monthFormatting";
import { RUNWAY_BAND_OPTIONS, type RunwayBand } from "./operatorRunway";

/**
 * The last time the call moved the way it moved this week, and what the two
 * scores did afterwards.
 *
 * `/history/compare` and the time machine hold fourteen years of record, and
 * neither is offered at the moment a reader most needs it: the week the call
 * changes. This reads the month-end walk the site already serves and finds
 * the most recent month the call moved in the same direction — toward tighter
 * money or toward easier money, by the severity order the four weather words
 * sit in — then reports where funding pressure and risk appetite stood three
 * months later. Null when this week's call did not change, or when no earlier
 * change in that direction has three following months on record.
 *
 * Direction, not the exact pair: seven changes since 2012 is too few for
 * "Sunny to Freezing" to have a precedent most weeks, and the card names the
 * pair it found so a reader can tell the two apart.
 *
 * What it found is one earlier month, and a reader takes it for a pattern unless the
 * card says how that month differed from this one: the scores three months on
 * stood where they stood because of where they started, and the change it matched
 * may have come from another state. `today` carries this week's pair and scores so
 * the card can put the two side by side (`describeAgainstToday`).
 */
const FOLLOW_THROUGH_MONTHS = 3;

type MonthRef = { year: number; month: number; recordDate: string };

export type LastTimeCallChanged = {
  direction: "tightening" | "easing";
  changedAt: MonthRef & { from: RegimeKey; to: RegimeKey; fromLabel: string; toLabel: string };
  after: MonthRef;
  monthsLater: number;
  tightness: { atChange: number; later: number };
  riskAppetite: { atChange: number; later: number };
  /** This week's change and scores, for the comparison with the month that was found. */
  today: { from: RegimeKey; to: RegimeKey; tightness: number; riskAppetite: number };
};

const severityStep = (from: RegimeKey, to: RegimeKey) =>
  Math.sign(REGIME_SEVERITY_RANK[to] - REGIME_SEVERITY_RANK[from]);

const monthRef = (entry: TimeMachineRegimeEntry): MonthRef => ({
  year: entry.year,
  month: entry.month,
  recordDate: entry.recordDate,
});

export const findLastTimeCallChanged = ({
  series,
  currentRegime,
  previousRegime,
  currentScores,
}: {
  /** The month-end walk, any order; only entries with both scores count. */
  series: readonly TimeMachineRegimeEntry[];
  currentRegime: RegimeKey;
  /** The call before this week's. Absent or equal means the call did not change. */
  previousRegime: RegimeKey | null | undefined;
  /** Where the two scores stand this week. */
  currentScores: { tightness: number; riskAppetite: number };
}): LastTimeCallChanged | null => {
  if (!previousRegime || previousRegime === currentRegime) return null;
  const step = severityStep(previousRegime, currentRegime);
  if (step === 0) return null;

  const ordered = [...series]
    .filter((entry) => Number.isFinite(entry.tightness) && Number.isFinite(entry.riskAppetite))
    .sort((a, b) => a.recordDate.localeCompare(b.recordDate));

  for (let index = ordered.length - 1 - FOLLOW_THROUGH_MONTHS; index >= 1; index -= 1) {
    const entry = ordered[index];
    const before = ordered[index - 1];
    if (entry.regime === before.regime) continue;
    if (severityStep(before.regime, entry.regime) !== step) continue;
    const after = ordered[index + FOLLOW_THROUGH_MONTHS];
    return {
      direction: step > 0 ? "tightening" : "easing",
      changedAt: {
        ...monthRef(entry),
        from: before.regime,
        to: entry.regime,
        fromLabel: getRegimePublicLabel(before.regime),
        toLabel: getRegimePublicLabel(entry.regime),
      },
      after: monthRef(after),
      monthsLater: FOLLOW_THROUGH_MONTHS,
      tightness: { atChange: entry.tightness, later: after.tightness },
      riskAppetite: { atChange: entry.riskAppetite, later: after.riskAppetite },
      today: { from: previousRegime, to: currentRegime, ...currentScores },
    };
  }
  return null;
};

/* Inside this many points a score is "about where it was": the walk is monthly and the
   scores are whole numbers, so a gap this small is not a difference worth naming. */
const ABOUT_THE_SAME = 5;

/**
 * The month that was found, set against this week: the change it was and the one this
 * week is, then each score with what it meant, then and now. Each score carries its
 * meaning (`signalReadingMeaning`), once where both readings share it, so "7" and "43"
 * say "avoiding risk" and "selective about risk" without the reader knowing which end
 * of the scale is which.
 * `alike` is where the two are the same change with both scores about where they were;
 * anything else says it is one earlier outcome and not a forecast, because that is what
 * a reader who sees "3 months on, the scores stood here" is most likely to take it for.
 */
export const describeAgainstToday = (record: LastTimeCallChanged): { alike: boolean; text: string } => {
  const { today, changedAt } = record;
  const samePair = changedAt.from === today.from && changedAt.to === today.to;
  const alike =
    samePair
    && Math.abs(today.tightness - record.tightness.atChange) <= ABOUT_THE_SAME
    && Math.abs(today.riskAppetite - record.riskAppetite.atChange) <= ABOUT_THE_SAME;
  /* One sentence per score, and a meaning printed once when both readings share
     it: "Funding pressure was 79 (money is hard to raise) then and is 90 (money is
     hard to raise) now; risk appetite was …" carried the same gloss twice in a
     35-word sentence until 2026-10-09. */
  const scoreSentence = (key: "tightness" | "riskAppetite", label: string, then: number, now: number) => {
    const meaningThen = signalReadingMeaning(key, then);
    const meaningNow = signalReadingMeaning(key, now);
    return meaningThen === meaningNow
      ? `${label} was ${then} then and is ${now} now; at both readings, ${meaningThen}.`
      : `${label} was ${then} then (${meaningThen}) and is ${now} now (${meaningNow}).`;
  };
  const sentences = [
    ...(samePair
      ? []
      : [`That change was ${changedAt.fromLabel} to ${changedAt.toLabel}; this week's is ${getRegimePublicLabel(today.from)} to ${getRegimePublicLabel(today.to)}.`]),
    scoreSentence("tightness", "Funding pressure", record.tightness.atChange, today.tightness),
    scoreSentence("riskAppetite", "Risk appetite", record.riskAppetite.atChange, today.riskAppetite),
    ...(alike ? [] : ["One earlier outcome, not a forecast."]),
  ];
  return { alike, text: sentences.join(" ") };
};

/** "tightened" or "eased": what the found month has in common with this week. */
export const lastTimeVerb = (record: Pick<LastTimeCallChanged, "direction">) =>
  record.direction === "tightening" ? "tightened" : "eased";

/** The comparison page for the change month against the month three later. */
export const buildLastTimeCompareHref = (record: LastTimeCallChanged) =>
  `/history/compare?yearA=${record.changedAt.year}&monthA=${record.changedAt.month}&yearB=${record.after.year}&monthB=${record.after.month}`;

type RecentCallChange = MonthRef & { fromLabel: string; toLabel: string };

/**
 * The most recent months the call changed, newest first — the turning points a
 * first-time reader can open in the time machine to check what the site said
 * then against what they remember happening. Read off the same month-end walk
 * as the card above, so a month offered here is one the time machine covers.
 */
export const findRecentCallChanges = (
  series: readonly TimeMachineRegimeEntry[],
  count: number,
): RecentCallChange[] => {
  const ordered = [...series].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
  const changes: RecentCallChange[] = [];
  for (let index = ordered.length - 1; index >= 1 && changes.length < count; index -= 1) {
    const entry = ordered[index];
    const before = ordered[index - 1];
    if (entry.regime === before.regime) continue;
    changes.push({
      ...monthRef(entry),
      fromLabel: getRegimePublicLabel(before.regime),
      toLabel: getRegimePublicLabel(entry.regime),
    });
  }
  return changes;
};

type Spell = { regime: RegimeKey; start: MonthRef; end: MonthRef; months: number };

const spellsOf = (series: readonly TimeMachineRegimeEntry[]): Spell[] => {
  const ordered = [...series].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
  const spells: Spell[] = [];
  for (const entry of ordered) {
    const last = spells.at(-1);
    if (last && last.regime === entry.regime) {
      last.end = monthRef(entry);
      last.months += 1;
    } else {
      spells.push({ regime: entry.regime, start: monthRef(entry), end: monthRef(entry), months: 1 });
    }
  }
  return spells;
};

/**
 * Since when this week's conditions have held, for the card's stamp line: "Since Apr
 * 2026" (2026-11-03). A reader can't tell from "Cloudy" alone whether it is this week's
 * news or the standing state. Null when the latest month-end is not in these
 * conditions (a change that began this week, which the stamp's "Was …" already says)
 * or the record does not reach back to a change.
 */
export const describeConditionsSince = ({
  series,
  currentRegime,
}: {
  series: readonly TimeMachineRegimeEntry[];
  currentRegime: RegimeKey;
}): string | null => {
  const spells = spellsOf(series);
  const current = spells.at(-1);
  if (spells.length < 2 || !current || current.regime !== currentRegime) return null;
  return `Since ${formatMonthLabel(current.start.year, current.start.month)}`;
};

/**
 * Where a score sits against every month-end on the record, in words, for a reader who
 * has no feel for the 0–100 scale (2026-11-03): "higher than in most months since 2012",
 * or "about typical" in the middle fifth. Words, not "9 of 10": the reader needs the
 * rank, not a second fraction beside the score. Higher and lower, not better and worse:
 * the sentence it sits in says which way the score is bad.
 */
const shareWords = (share: number) => (share >= 0.95 ? "almost every month" : "most months");

const describeScoreAgainstRecord = ({
  series,
  metric,
  value,
}: {
  series: readonly TimeMachineRegimeEntry[];
  metric: "tightness" | "riskAppetite";
  value: number;
}): string | null => {
  const firstYear = [...series].sort((a, b) => a.recordDate.localeCompare(b.recordDate)).at(0)?.year;
  if (series.length < 24 || firstYear === undefined) return null;
  const below = series.filter((entry) => entry[metric] < value).length / series.length;
  const above = series.filter((entry) => entry[metric] > value).length / series.length;
  if (below >= 0.6) return `higher than in ${shareWords(below)} since ${firstYear}`;
  if (above >= 0.6) return `lower than in ${shareWords(above)} since ${firstYear}`;
  return "about typical";
};

/*
 * Which side of each change line each condition sits on. From the assessed conditions,
 * not the raw scores, so the facts under the weather word cannot disagree with it while
 * a change waits on its second reading.
 */
const CONDITION_SIDES: Record<RegimeKey, { money: "pricey" | "cheap"; investors: "willing" | "wary" }> = {
  SCARCITY: { money: "pricey", investors: "wary" },
  DEFENSIVE: { money: "pricey", investors: "willing" },
  VOLATILE: { money: "cheap", investors: "wary" },
  EXPANSION: { money: "cheap", investors: "willing" },
};

/**
 * The two plain facts the weather word stands for, each with its score set against the
 * record (2026-11-03): "Money is pricey: funding pressure 90, higher than in most
 * months since 2012. Investors are willing: risk appetite 53, about typical." It takes
 * the place of the regime's one-line rationale under the call: the four words are not a
 * severity scale (Stormy is not worse than Cloudy), and the two facts are what they
 * encode. Null for an unmodelled regime.
 */
export const describeConditionFacts = ({
  series,
  regime,
  tightness,
  riskAppetite,
}: {
  series: readonly TimeMachineRegimeEntry[];
  regime: string;
  tightness: number;
  riskAppetite: number;
}): string | null => {
  if (!isRegimeKey(regime)) return null;
  const sides = CONDITION_SIDES[regime];
  /* "since 2012" once: the second comparison is against the same record. */
  const pressure = describeScoreAgainstRecord({ series, metric: "tightness", value: tightness });
  const appetiteRecord = describeScoreAgainstRecord({ series, metric: "riskAppetite", value: riskAppetite });
  const appetite = pressure?.includes(" since ") ? appetiteRecord?.replace(/ since \d{4}$/, "") : appetiteRecord;
  return (
    `Money is ${sides.money}: funding pressure ${Math.round(tightness)}${pressure ? `, ${pressure}` : ""}. ` +
    `Investors are ${sides.investors}: risk appetite ${Math.round(riskAppetite)}${appetite ? `, ${appetite}` : ""}.`
  );
};

/* Months, as a colleague counts them (2026-10-28). Each is a month-end reading, and the
   sentences said "month-ends", which nobody says out loud about a stretch of weather. */
const monthEnds = (count: number) => (count === 1 ? "1 month" : `${count} months`);
const spellRange = (spell: Spell) =>
  `${formatMonthLabel(spell.start.year, spell.start.month)} to ${formatMonthLabel(spell.end.year, spell.end.month)}`;

/**
 * How long conditions like this week's lasted before, from the month-end walk.
 *
 * A headline says money is tight; what a plan needs to know is for how long,
 * and the record answers that without a forecast: the earlier spells of these
 * conditions and their length in month-ends. The record is short (seven spells
 * since 2012, one of them Freezing), so the sentence counts the spells it
 * found rather than averaging them, and says once that a count is not a
 * forecast.
 *
 * The spell the record ends in is left out of the earlier ones when it is this
 * week's conditions, since it has not ended. With a chosen runway band whose
 * top is shorter than every earlier spell, the sentence says so: that is the
 * comparison a reader with 12–24 months of cash is making in their head.
 */
export const describeSpellLengths = ({
  series,
  currentRegime,
  runwayBand,
}: {
  series: readonly TimeMachineRegimeEntry[];
  currentRegime: RegimeKey;
  /** The reader's own band; null when they have not chosen one. */
  runwayBand: RunwayBand | null;
}): { lead: string; rest: string } | null => {
  const spells = spellsOf(series);
  const firstYear = spells.at(0)?.start.year;
  if (spells.length < 2 || firstYear === undefined) return null;
  const ongoing = spells.at(-1)?.regime === currentRegime;
  const earlier = spells.filter((spell, index) => spell.regime === currentRegime && !(ongoing && index === spells.length - 1));
  const label = getRegimePublicLabel(currentRegime);
  const completed = spells.slice(0, -1);
  const shortest = completed.length > 0 ? Math.min(...completed.map((spell) => spell.months)) : null;

  /*
   * The lead sets this spell beside the earlier ones (2026-10-27): "how long will it
   * last" is the question the section exists for, and the earlier lengths alone left
   * a reader to work out how far into this one the record is. Only while the latest
   * month-end is still in these conditions; a spell that began this week has no
   * month-end yet, and the lead then names the earlier spells alone.
   */
  const current = ongoing ? spells.at(-1)?.months ?? null : null;
  const soFar = current !== null ? `It's been ${label} for ${monthEnds(current)} so far. ` : "";
  let lead = "";
  if (earlier.length === 0) {
    lead = current !== null
      ? `This is the first ${label} stretch since ${firstYear}, ${monthEnds(current)} so far.`
      : `There's no earlier ${label} stretch since ${firstYear}.`;
  } else if (earlier.length === 1) {
    const only = earlier.at(0);
    if (only) {
      lead = current !== null
        ? `${soFar}The last ${label} stretch lasted ${monthEnds(only.months)}, ${spellRange(only)}.`
        : `The only earlier ${label} stretch lasted ${monthEnds(only.months)}, ${spellRange(only)}.`;
    }
  } else {
    const lengths = earlier.map((spell) => spell.months);
    const listed = `${lengths.slice(0, -1).join(", ")} and ${monthEnds(lengths.at(-1) ?? 0)}`;
    lead = current !== null
      ? `${soFar}The ${earlier.length} earlier ones lasted ${listed}.`
      : `There have been ${earlier.length} earlier ${label} stretches, lasting ${listed}.`;
  }
  const parts: string[] = [];
  if (shortest !== null) parts.push(`Since ${firstYear}, every stretch of conditions has lasted at least ${monthEnds(shortest)}.`);

  const band = runwayBand ? RUNWAY_BAND_OPTIONS.find((option) => option.key === runwayBand) : undefined;
  const bandTop = band?.maxMonths ?? null;
  if (band && bandTop !== null && earlier.length > 0 && earlier.every((spell) => spell.months > bandTop)) {
    parts.push(
      `${earlier.length === 1 ? "That stretch" : "Each one"} lasted longer than ${band.phrase} of runway, the band you chose.`,
    );
  }
  parts.push("That's a count of what happened, not a forecast.");
  return { lead, rest: parts.join(" ") };
};

type HoldLine = { value: number; holdsAbove: boolean };

const isPast = (score: number, line: HoldLine) => (line.holdsAbove ? score > line.value : score < line.value);

/**
 * How long a hold has run, and how long the earlier ones at the same lines took to lift,
 * from the month-end walk (2026-11-03): "It rose above 76 in Sep 2026. The last time, in
 * Sep 2022, it took 39 months to fall below 66." "Restarts when funding pressure falls
 * below 66" says what lifts a hold and not when, and when is what a hiring plan needs.
 *
 * A hold starts at the first month-end past the pause line and lifts at the first one past
 * the restart line, as the rule does between them. Today's lines are read back over the
 * whole record, so this is what the score did, not what a published rule said at the time.
 * A hold already running in the record's first month is left out: its start is not on it.
 * Months, not weeks, because the record is month-ends: a hold that began this week has no
 * start to name yet. Counts, not a range or a median, while there are fewer than three.
 * Null when the two lines are on different scores.
 */
export const describePastHolds = ({
  series,
  metric,
  pause,
  restart,
}: {
  series: readonly TimeMachineRegimeEntry[];
  metric: "tightness" | "riskAppetite";
  pause: HoldLine;
  restart: HoldLine;
}): string | null => {
  const ordered = [...series].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
  const firstYear = ordered.at(0)?.year;
  if (ordered.length < 24 || firstYear === undefined) return null;
  const holds: { start: TimeMachineRegimeEntry; months: number }[] = [];
  let open: { start: TimeMachineRegimeEntry; index: number } | null = null;
  let censored = false;
  for (const [index, entry] of ordered.entries()) {
    if (!open && isPast(entry[metric], pause)) {
      open = { start: entry, index };
      censored = index === 0;
    } else if (open && isPast(entry[metric], restart)) {
      if (!censored) holds.push({ start: open.start, months: index - open.index });
      open = null;
    }
  }
  const rose = pause.holdsAbove ? "rose above" : "fell below";
  const lifted = restart.holdsAbove ? "rise above" : "fall below";
  const since = open && !censored ? `It ${rose} ${pause.value} in ${formatMonthLabel(open.start.year, open.start.month)}` : null;
  if (holds.length === 0) {
    return since
      ? `${since}, for the first time since the record began in ${firstYear}.`
      : `It had not ${pause.holdsAbove ? "risen above" : "fallen below"} ${pause.value} since the record began in ${firstYear}.`;
  }
  const lead = since ? `${since}. ` : "";
  const only = holds.length === 1 ? holds.at(0) : undefined;
  if (only) {
    return `${lead}The last time, in ${formatMonthLabel(only.start.year, only.start.month)}, it took ${monthEnds(only.months)} to ${lifted} ${restart.value}.`;
  }
  const lengths = holds.map((hold) => hold.months);
  if (holds.length === 2) {
    return `${lead}The 2 earlier times, it took ${lengths.join(" and ")} months to ${lifted} ${restart.value}.`;
  }
  const sorted = [...lengths].sort((a, b) => a - b);
  const median = sorted.at(Math.floor((sorted.length - 1) / 2)) ?? 0;
  return `${lead}The ${holds.length} earlier times, it took ${sorted.at(0)} to ${monthEnds(sorted.at(-1) ?? 0)} to ${lifted} ${restart.value}; half took ${monthEnds(median)} or fewer.`;
};
