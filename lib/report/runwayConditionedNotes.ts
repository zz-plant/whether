/**
 * Runway-conditioned notes: what the operator's own cash position implies about
 * acting on this week's call.
 *
 * Translation-only, under the same contract as the interpretation layers
 * (docs/one-screen-weekly-brief-spec.md): a note changes explanatory copy only.
 * It never restates a threshold number, never mutates a lane state, never
 * introduces an alternate action or re-open condition, and never issues a
 * directive — it states what the company's own cash position changes about the
 * urgency of the call, the one dimension the macro engine cannot see. Every
 * sentence below is a consequence of the corridor, not a second corridor.
 *
 * Blank means not given. A missing runway never reads like zero: without the
 * figure there is no note and the brief stays canonical.
 */
import type { DecisionArea } from "./boundedDecisionRules";
import type { RegimeKey } from "../regimeEngine";
import {
  RUNWAY_BAND_OPTIONS,
  monthsForRunwayBand,
  runwayBandForMonths,
  runwayBandLabel,
  runwayBandPhrase,
  type RunwayBand,
} from "./operatorRunway";

type RunwayConditionedNoteInput = {
  regime: RegimeKey;
  runwayMonths?: number;
  /**
   * How the runway reads in a sentence. An exact figure is "14 months"; a band
   * is its range ("12–24 months"), because a reader who picked a band did not
   * say 18 and the note must not say it for them. Defaults to the figure.
   */
  runwayPhrase?: string;
  /** False when `runwayMonths` stands for a band. The burn arithmetic needs a real figure. */
  runwayIsExact?: boolean;
  monthlyBurnUsd?: number;
};

type RunwayConditionedNote = {
  area: DecisionArea;
  note: string;
};

/*
 * The branch boundaries are the runway bands' own, so the band a reader picks
 * and the note it produces cannot disagree. They were 6 / 12 / 18 here and
 * 6 / 12 / 24 in the header, so "12–24 mo — Follow the guidance" wrote 18
 * months into the profile, and 18 landed on the long-runway note: "runway is
 * not what limits you this week".
 */
const bandCeiling = (band: RunwayBand) => RUNWAY_BAND_OPTIONS.find((option) => option.key === band)?.maxMonths ?? 0;
/** Below this, runway — not the corridor — is the binding constraint this week. */
const CRITICAL_RUNWAY_MONTHS = bandCeiling("critical");
const TIGHT_RUNWAY_MONTHS = bandCeiling("tight");
const LONG_RUNWAY_MONTHS = bandCeiling("balanced");

/**
 * What the notes read from: the exact figure when one was entered, else the
 * chosen band, else nothing. The band default the server calibrates to is not a
 * choice, so it produces no note — a missing runway never reads as a runway.
 */
export const resolveRunwayForNotes = ({
  exactMonths,
  band,
}: {
  exactMonths?: number;
  band: RunwayBand | null;
}): { runwayMonths: number; runwayPhrase: string; runwayIsExact: boolean } | null => {
  if (typeof exactMonths === "number" && Number.isFinite(exactMonths) && exactMonths > 0) {
    return { runwayMonths: exactMonths, runwayPhrase: `${exactMonths} months`, runwayIsExact: true };
  }
  if (band) {
    return { runwayMonths: monthsForRunwayBand(band), runwayPhrase: runwayBandPhrase(band), runwayIsExact: false };
  }
  return null;
};

const compactUsd = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 0 });

/**
 * Extending runway by cutting burn: cutting spend by a tenth stretches the
 * remaining runway by roughly a ninth of it (cash is unchanged, burn is 90%),
 * so the honest number comes from the operator's own months, not a flat claim.
 */
const monthsBoughtByTenPercentCut = (runwayMonths: number) =>
  (runwayMonths / 9).toFixed(1);

export const buildRunwayConditionedNotes = ({
  regime,
  runwayMonths,
  runwayPhrase,
  runwayIsExact = true,
  monthlyBurnUsd,
}: RunwayConditionedNoteInput): RunwayConditionedNote[] => {
  if (typeof runwayMonths !== "number" || !Number.isFinite(runwayMonths) || runwayMonths <= 0) {
    return [];
  }

  const isExpansion = regime === "EXPANSION";
  const isTightening = regime === "SCARCITY" || regime === "DEFENSIVE";
  const runway = runwayPhrase ?? `${runwayMonths} months`;
  const burn = runwayIsExact ? monthlyBurnUsd : undefined;

  if (runwayMonths < CRITICAL_RUNWAY_MONTHS) {
    const notes: RunwayConditionedNote[] = [
      {
        area: "burn-discipline",
        note: burn
          ? `With ${runway} of runway and $${compactUsd.format(burn)}/month, every 10% burn cut adds about ${monthsBoughtByTenPercentCut(runwayMonths)} months. Burn is the lever that moves runway fastest this week.`
          : `With ${runway} of runway, cash is what limits you this week, and burn is the lever that moves it fastest.`,
      },
      {
        area: "capital-raising",
        note: `With ${runway} of runway, a raise process started this quarter is what lands cash before runway ends — waiting compresses that margin.${isExpansion ? " A favorable window argues for starting earlier, not later." : ""}`,
      },
      {
        area: "hiring",
        note: `With ${runway} of runway, the hiring pause is what protects the runway every other rule assumes. Reversing it is what spends that runway.`,
      },
    ];
    return notes;
  }

  if (runwayMonths < TIGHT_RUNWAY_MONTHS) {
    const notes: RunwayConditionedNote[] = [
      {
        area: "capital-raising",
        note: `With ${runway} of runway, raise planning has the least slack: if you plan to raise, the process has to finish inside the runway you have${isExpansion ? ", and a favorable window widens it" : ""}.`,
      },
      {
        area: "hiring",
        note: `With ${runway} of runway, each net-new role commits fixed cost against months you cannot extend — its payback proof carries that weight.`,
      },
    ];
    if (burn) {
      notes.push({
        area: "burn-discipline",
        note: `At $${compactUsd.format(burn)}/month, a 10% cut adds about ${monthsBoughtByTenPercentCut(runwayMonths)} months of cushion.`,
      });
    }
    return notes;
  }

  if (runwayMonths < LONG_RUNWAY_MONTHS) {
    const notes: RunwayConditionedNote[] = [
      {
        area: "burn-discipline",
        note: `With ${runway} of runway you can act on the printed guidance — no emergency cuts while funding pressure stays this side of the pause line.`,
      },
    ];
    if (isExpansion) {
      notes.push({
        area: "expansion-bets",
        note: "With runway above a year, spare runway goes furthest into the reversible bets the guidance allows.",
      });
    }
    return notes;
  }

  const notes: RunwayConditionedNote[] = [
    {
      area: "burn-discipline",
      note: `With ${runway} of runway, runway is not what limits you this week. The pause and resume lines are.`,
    },
  ];
  if (isTightening) {
    notes.push({
      area: "capital-raising",
      note: "The exception: with money this expensive, the question is when to raise, not whether. Long runway lets you choose.",
    });
  }
  return notes;
};

type CommitmentImpact = {
  runwayBefore: number;
  runwayAfter: number;
  /** Set only when the commitment moves the runway into a different band. */
  bandChange: { from: string; to: string } | null;
  /** One sentence: what the commitment does to runway, in the reader's own figures. */
  summary: string;
  /** The note this week's guidance carries for the area at the runway after, if the band has one. */
  noteAfter: string | null;
};

const roundMonths = (months: number) => Math.round(months * 10) / 10;

/**
 * What one new monthly commitment does to the operator's runway, and what this
 * week's guidance says about the area at the runway it leaves them with.
 *
 * Same contract as the notes above: arithmetic on the operator's own figures
 * plus the note the band already carries. It adds no threshold, no action and
 * no directive — "the two hires take you under a year" is a fact about their
 * cash, and what the guidance says at under a year is already written above.
 * Cash is held constant, so runway after is runway × burn ÷ (burn + cost).
 * Anything missing or non-positive returns null rather than a guess.
 */
export const buildCommitmentImpact = ({
  regime,
  area,
  runwayMonths,
  monthlyBurnUsd,
  newMonthlyCostUsd,
}: {
  regime: RegimeKey;
  area: DecisionArea;
  runwayMonths?: number;
  monthlyBurnUsd?: number;
  newMonthlyCostUsd?: number;
}): CommitmentImpact | null => {
  const valid = (value: number | undefined): value is number =>
    typeof value === "number" && Number.isFinite(value) && value > 0;
  if (!valid(runwayMonths) || !valid(monthlyBurnUsd) || !valid(newMonthlyCostUsd)) return null;

  const runwayBefore = roundMonths(runwayMonths);
  const runwayAfter = roundMonths((runwayMonths * monthlyBurnUsd) / (monthlyBurnUsd + newMonthlyCostUsd));
  const bandBefore = runwayBandForMonths(runwayBefore);
  const bandAfter = runwayBandForMonths(runwayAfter);
  const bandChange = bandBefore && bandAfter && bandBefore !== bandAfter
    ? { from: runwayBandLabel(bandBefore), to: runwayBandLabel(bandAfter) }
    : null;

  const monthsSpent = roundMonths(runwayBefore - runwayAfter);
  const summary =
    `At $${compactUsd.format(newMonthlyCostUsd)} more a month, runway goes from ${runwayBefore} to ${runwayAfter} months ` +
    `(${monthsSpent} ${monthsSpent === 1 ? "month" : "months"} spent)` +
    (bandChange ? `, which moves you from ${bandChange.from} into ${bandChange.to}.` : ".");

  const noteAfter =
    buildRunwayConditionedNotes({ regime, runwayMonths: runwayAfter, monthlyBurnUsd: monthlyBurnUsd + newMonthlyCostUsd })
      .find((note) => note.area === area)?.note ?? null;

  return { runwayBefore, runwayAfter, bandChange, summary, noteAfter };
};
