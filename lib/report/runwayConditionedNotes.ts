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
import type { ProfileRunway } from "../operatorProfile";
import { formatCommitmentUsd } from "../planCommitment";
import { formatMonthAfter } from "../timeMachine/monthFormatting";
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
  /** Spend less revenue (`netMonthlyBurnUsd`): what the runway is counted against. */
  netMonthlyBurnUsd?: number;
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

/*
 * Past ten years a runway is no planning horizon, and a month count there reads
 * as noise: a $1.4k commitment against a $1k monthly surplus left $500k lasting
 * "about 1250 months", and one leaving 40 cents of burn printed "$0 a month"
 * and 1,250,000 months. Cash divided by burn has no ceiling, so the words do.
 */
const DECADE_MONTHS = 120;
const BEYOND_A_DECADE = "more than 10 years";
const runwayInWords = (months: number) => (months > DECADE_MONTHS ? BEYOND_A_DECADE : `${months} months`);

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
    return { runwayMonths: exactMonths, runwayPhrase: runwayInWords(exactMonths), runwayIsExact: true };
  }
  if (band) {
    return { runwayMonths: monthsForRunwayBand(band), runwayPhrase: runwayBandPhrase(band), runwayIsExact: false };
  }
  return null;
};

/**
 * Extending runway by cutting net burn: cutting it by a tenth stretches the
 * remaining runway by a ninth of it (cash is unchanged, net burn is 90%), so
 * the honest number comes from the operator's own months, not a flat claim. It
 * is net burn, not spend: with revenue coming in, a tenth off spend is more
 * than a tenth off net burn, and the sentence names the dollars it means.
 */
const monthsBoughtByTenPercentCut = (runwayMonths: number) =>
  (runwayMonths / 9).toFixed(1);

export const buildRunwayConditionedNotes = ({
  regime,
  runwayMonths,
  runwayPhrase,
  runwayIsExact = true,
  netMonthlyBurnUsd,
}: RunwayConditionedNoteInput): RunwayConditionedNote[] => {
  if (typeof runwayMonths !== "number" || !Number.isFinite(runwayMonths) || runwayMonths <= 0) {
    return [];
  }

  const isExpansion = regime === "EXPANSION";
  const isTightening = regime === "SCARCITY" || regime === "DEFENSIVE";
  const runway = runwayPhrase ?? `${runwayMonths} months`;
  const burn = runwayIsExact && typeof netMonthlyBurnUsd === "number" && netMonthlyBurnUsd > 0 ? netMonthlyBurnUsd : undefined;
  const burnCut = (netBurn: number) =>
    `every 10% cut in net burn (${formatCommitmentUsd(netBurn / 10)}/month) adds about ${monthsBoughtByTenPercentCut(runwayMonths)} months`;

  if (runwayMonths < CRITICAL_RUNWAY_MONTHS) {
    const notes: RunwayConditionedNote[] = [
      {
        area: "burn-discipline",
        note: burn
          ? `With ${runway} of runway and ${formatCommitmentUsd(burn)}/month of net burn, ${burnCut(burn)}. Burn is the lever that moves runway fastest this week.`
          : `With ${runway} of runway, cash is what limits you this week, and burn is the lever that moves it fastest.`,
      },
      {
        area: "capital-raising",
        note: `With ${runway} of runway, a raise process started this quarter is what lands cash before runway ends. Waiting compresses that margin.${isExpansion ? " A favorable window argues for starting earlier, not later." : ""}`,
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
        note: `With ${runway} of runway, each net-new role commits fixed cost against months you cannot extend, so its payback proof carries that weight.`,
      },
    ];
    if (burn) {
      notes.push({
        area: "burn-discipline",
        note: `At ${formatCommitmentUsd(burn)}/month of net burn, ${burnCut(burn)} of cushion.`,
      });
    }
    return notes;
  }

  if (runwayMonths < LONG_RUNWAY_MONTHS) {
    const notes: RunwayConditionedNote[] = [
      {
        area: "burn-discipline",
        note: `With ${runway} of runway you can act on the printed guidance. No emergency cuts are needed while funding pressure stays this side of the pause line.`,
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
  /** Null when revenue covers spending, so there is no runway to count down. */
  runwayBefore: number | null;
  /** Null when revenue still covers spending with the commitment added. */
  runwayAfter: number | null;
  /** Set only when the commitment moves the runway into a different band. */
  bandChange: { from: string; to: string } | null;
  /** One sentence: what the commitment does to runway, in the reader's own figures. */
  summary: string;
  /** The note this week's guidance carries for the area at the runway after, if the band has one. */
  noteAfter: string | null;
};

const roundMonths = (months: number) => Math.round(months * 10) / 10;

const valid = (value: number | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/**
 * What one new monthly commitment does to the operator's runway, and what this
 * week's guidance says about the area at the runway it leaves them with.
 *
 * Same contract as the notes above: arithmetic on the operator's own figures
 * plus the note the band already carries. It adds no threshold, no action and
 * no directive — "the two hires take you under a year" is a fact about their
 * cash, and what the guidance says at under a year is already written above.
 * Cash is held constant, so runway after is runway × net burn ÷ (net burn +
 * cost). Net burn, not spend: dividing by spend overstated the runway left
 * whenever revenue was coming in (`netMonthlyBurnUsd`).
 *
 * A company whose revenue covers its spending has no runway to divide, and is
 * the one asking this most often — so with its cash it gets the answer too:
 * whether the commitment still leaves it covered, and if not, how long the
 * cash lasts at the burn it starts. Anything missing or non-positive returns
 * null rather than a guess.
 */
export const buildCommitmentImpact = ({
  regime,
  area,
  runwayMonths,
  netMonthlyBurnUsd,
  cashUsd,
  newMonthlyCostUsd,
}: {
  regime: RegimeKey;
  area: DecisionArea;
  runwayMonths?: number;
  netMonthlyBurnUsd?: number;
  /** Read only when revenue covers spending, where runway cannot carry the balance. */
  cashUsd?: number;
  newMonthlyCostUsd?: number;
}): CommitmentImpact | null => {
  if (!valid(newMonthlyCostUsd)) return null;
  const cost = formatCommitmentUsd(newMonthlyCostUsd);

  if (typeof netMonthlyBurnUsd === "number" && Number.isFinite(netMonthlyBurnUsd) && netMonthlyBurnUsd <= 0 && valid(cashUsd)) {
    const netBurnAfter = netMonthlyBurnUsd + newMonthlyCostUsd;
    // Under a dollar a month either way is holding level, not a burn to divide cash by.
    if (netBurnAfter < 1) {
      const surplus = -netBurnAfter;
      return {
        runwayBefore: null,
        runwayAfter: null,
        bandChange: null,
        summary: surplus >= 1
          ? `Revenue still covers spending at ${cost} more a month: cash keeps growing, by about ${formatCommitmentUsd(surplus)} a month.`
          : `Revenue still covers spending at ${cost} more a month, with nothing left over: cash holds level.`,
        noteAfter: null,
      };
    }
    const runwayAfter = roundMonths(cashUsd / netBurnAfter);
    return {
      runwayBefore: null,
      runwayAfter,
      bandChange: null,
      summary:
        `Revenue covers spending today. At ${cost} more a month you would burn ${formatCommitmentUsd(netBurnAfter)} a month, ` +
        `and ${formatCommitmentUsd(cashUsd)} of cash lasts ${runwayAfter > DECADE_MONTHS ? BEYOND_A_DECADE : `about ${runwayAfter} months`}.`,
      noteAfter:
        buildRunwayConditionedNotes({ regime, runwayMonths: runwayAfter, runwayPhrase: runwayInWords(runwayAfter), netMonthlyBurnUsd: netBurnAfter })
          .find((note) => note.area === area)?.note ?? null,
    };
  }

  if (!valid(runwayMonths) || !valid(netMonthlyBurnUsd)) return null;

  const runwayBefore = roundMonths(runwayMonths);
  const runwayAfter = roundMonths((runwayMonths * netMonthlyBurnUsd) / (netMonthlyBurnUsd + newMonthlyCostUsd));
  const bandBefore = runwayBandForMonths(runwayBefore);
  const bandAfter = runwayBandForMonths(runwayAfter);
  const bandChange = bandBefore && bandAfter && bandBefore !== bandAfter
    ? { from: runwayBandLabel(bandBefore), to: runwayBandLabel(bandAfter) }
    : null;

  const monthsSpent = roundMonths(runwayBefore - runwayAfter);
  const movement = runwayAfter > DECADE_MONTHS
    ? `runway stays ${BEYOND_A_DECADE}`
    : runwayBefore > DECADE_MONTHS
      ? `runway goes from ${BEYOND_A_DECADE} to ${runwayAfter} months`
      : `runway goes from ${runwayBefore} to ${runwayAfter} months (${monthsSpent} ${monthsSpent === 1 ? "month" : "months"} spent)`;
  const summary =
    `At ${cost} more a month, ${movement}` +
    (bandChange ? `, and you move from ${bandChange.from} into ${bandChange.to}.` : ".");

  const noteAfter =
    buildRunwayConditionedNotes({
      regime,
      runwayMonths: runwayAfter,
      runwayPhrase: runwayInWords(runwayAfter),
      netMonthlyBurnUsd: netMonthlyBurnUsd + newMonthlyCostUsd,
    })
      .find((note) => note.area === area)?.note ?? null;

  return { runwayBefore, runwayAfter, bandChange, summary, noteAfter };
};

/**
 * The runway in one sentence, as a finance lead would say it: what cash falls
 * by each month, how long it lasts, and the month it runs out. The month needs
 * today's date, so the caller passes one it can render without a hydration
 * mismatch. Arithmetic only — no verdict on whether the runway is enough; the
 * guidance and the notes above carry that.
 */
export const describeProfileRunway = (runway: ProfileRunway, now: Date): string => {
  if (runway.basis === "cash-flow-positive") {
    return runway.surplusUsd > 0
      ? `Revenue covers spending, with ${formatCommitmentUsd(runway.surplusUsd)} a month left over: cash is not running down.`
      : "Revenue covers spending exactly: cash is holding level, not running down.";
  }
  const runsOut = formatMonthAfter(now, runway.months);
  if (runway.basis === "entered") {
    return `${runway.months} months of runway lasts to about ${runsOut}.`;
  }
  const lasts = runway.months > DECADE_MONTHS ? `lasts ${BEYOND_A_DECADE}.` : `lasts about ${runway.months} months: to about ${runsOut}.`;
  return `Net burn is ${formatCommitmentUsd(runway.netBurnUsd)} a month (spend less revenue), so ${formatCommitmentUsd(runway.cashUsd)} ${lasts}`;
};
