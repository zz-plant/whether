/**
 * View model for the homepage's non-weekly cadence lead.
 *
 * The cadence selector used to change nothing an operator could see. The card it drove
 * pulled the whole agent-interface payload — posture-state repository reads, the full
 * macro series, the agent handoff prompt — to render four strings, and the call site
 * swallowed the failure with `.catch(() => null)`, so weekly, monthly and quarterly
 * served a byte-identical page. This model is built from the report data the page has
 * already loaded, so the horizon renders under fallback too.
 *
 * It carries the call-level bounded triad, not a per-lever ledger: §VIII assigns
 * operating guardrails to /operate, and 69221739 moved them there. The brief keeps the
 * call, its guardrail and its reversal, which is what this is.
 */
import type { RegimeAssessment, RegimeKey } from "../regimeEngine";
import { getRegimePublicLabel } from "../regimePresentation";
import { getMonthlyActionGuidance } from "../summary/monthlySummary";
import { getQuarterlyActionGuidance } from "../summary/quarterlySummary";
import {
  buildHorizonOperatingRule,
  buildHorizonSignalBands,
  type HorizonOperatingRule,
  type HorizonSignalBand,
} from "../summary/horizonOperatingRules";
import { formatQuarterLabel } from "../summary/summaryFormatting";
import { formatMonthYearShortFromValue } from "../formatters";
import { DECISION_CONTRACT_LABELS } from "./reportCopy";
import { describePolicyHold } from "./regimeDescription";

/** The two horizons the selector offers beside the weekly default. */
export type CadenceCallHorizon = "monthly" | "quarterly";

type CadenceHistoryPoint = {
  label: string;
  regime: RegimeKey;
  regimeLabel: string;
  isCurrent: boolean;
};

export type CadenceCallModel = {
  horizon: CadenceCallHorizon;
  cadenceLabel: string;
  periodLabel: string | null;
  /** The horizon's job, as the sentence that leads the card. */
  headline: string;
  regime: RegimeKey;
  regimeLabel: string;
  description: string;
  boundedRule: HorizonOperatingRule;
  /**
   * The same rule as numbers, for the rails beside it. Empty under a refusal, where the
   * hold's thresholds are horizon-neutral and the card suppresses the triad anyway.
   */
  boundedBands: HorizonSignalBand[];
  /** Set when the policy engine refuses to support a posture change, in which case the
   *  call above is the hold, not the regime's guidance. */
  overrideReason: string | null;
  history: CadenceHistoryPoint[];
  historyLabel: string;
  /** What the run of periods says — how long this call has held, or what it replaced. */
  historyDelta: string | null;
  /** Names the weekly hero below this card, so the two do not read as competing calls. */
  weeklyBridge: string;
  planHref: string;
  planLabel: string;
  shareTitle: string;
  /** Distinct from the hero's "Copy Brief". Both controls sit on `/` under a non-weekly
   *  cadence and copy different artifacts, so each has to name the one it copies. */
  shareLabel: string;
  shareCopiedLabel: string;
  shareLines: string[];
};

const HORIZON_COPY: Record<
  CadenceCallHorizon,
  {
    cadenceLabel: string;
    periodNoun: string;
    periodNounPlural: string;
    historyLabel: string;
    weeklyBridge: string;
    planLabel: string;
    shareTitle: string;
    shareLabel: string;
    historyLength: number;
  }
> = {
  monthly: {
    cadenceLabel: "Monthly guidance",
    periodNoun: "month",
    periodNounPlural: "months",
    historyLabel: "Conditions by month",
    weeklyBridge: "The weekly read behind this month's guidance",
    planLabel: "Build this month's plan →",
    shareTitle: "Whether Monthly Guidance",
    shareLabel: "Copy monthly guidance",
    historyLength: 6,
  },
  quarterly: {
    cadenceLabel: "Quarterly guidance",
    periodNoun: "quarter",
    periodNounPlural: "quarters",
    historyLabel: "Conditions by quarter",
    weeklyBridge: "The weekly read behind this quarter's guidance",
    planLabel: "Build this quarter's plan →",
    shareTitle: "Whether Quarterly Guidance",
    shareLabel: "Copy quarterly guidance",
    historyLength: 4,
  },
};

const formatScore = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);

const formatSignedScore = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 1, signDisplay: "always" }).format(
    value,
  );

/**
 * The two distances a rail carries, as points from the pause line and from the
 * restart line — the two names the rest of the page uses for the pair. An
 * earlier version chipped the edges with the contract labels ("5 to Pause if ·
 * Change course if short by 3"), which read as a sentence with its verbs
 * missing.
 *
 * A tripped edge is stated rather than measured — zero distance to a line is
 * not the same thing to act on as a condition that already fires.
 */
export const formatBandHeadroom = (band: HorizonSignalBand): string => {
  if (band.pauseTripped) {
    return "Past the pause line";
  }

  const toPause = `${formatScore(band.toPause)} points from the pause line`;

  return band.resumeHolds
    ? `${toPause} · ${formatScore(band.toResume)} from the restart line`
    : `${toPause} · ${formatScore(band.toResume)} short of the restart line`;
};

/** The reading itself, and the move that produced it. Null movement stays null rather
 *  than rendering a zero — "unchanged" and "we have no prior read" are different. */
export const formatBandReading = (band: HorizonSignalBand) => ({
  score: formatScore(band.current),
  delta: band.previous === null ? null : formatSignedScore(band.current - band.previous),
  /** True when the move is toward the guardrail, whichever direction that is. */
  towardGuardrail:
    band.previous === null
      ? false
      : band.pauseWhen === "above"
        ? band.current > band.previous
        : band.current < band.previous,
});

/** The guidance maps are written as mid-sentence clauses ("scale proven bets, …")
 *  because every other consumer embeds them. The lead needs the same clause as a
 *  standalone imperative, which is a capital and a period — not new copy. */
const asImperative = (guidance: string) =>
  `${guidance.charAt(0).toUpperCase()}${guidance.slice(1)}.`;

type RegimeHistoryEntry = { record_date: string; regime: RegimeKey };

/**
 * Sortable period key. The comparison has to be by period rather than by date: the
 * history entries are month-end stamps and the report's record date is whatever day the
 * source last published, so a plain `<=` on dates drops the current month and leaves the
 * strip ending one period before the one the card is titled after.
 */
const periodKeyFor = (horizon: CadenceCallHorizon, recordDate: string) => {
  if (horizon === "monthly") return recordDate.slice(0, 7);
  const date = new Date(recordDate);
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${date.getUTCFullYear()}-Q${quarter}`;
};

/** One point per quarter, keeping the latest month in each — the series is monthly, and
 *  a quarter drawn from three separate months would repeat itself three times. */
const reduceToQuarters = (history: readonly RegimeHistoryEntry[]) => {
  const byQuarter = new Map<string, RegimeHistoryEntry>();

  for (const entry of history) {
    const label = formatQuarterLabel(entry.record_date);
    if (label) {
      byQuarter.set(label, entry);
    }
  }

  return [...byQuarter.entries()].map(([label, entry]) => ({ label, entry }));
};

const buildHistory = ({
  horizon,
  history,
  length,
  recordDate,
}: {
  horizon: CadenceCallHorizon;
  history: readonly RegimeHistoryEntry[];
  length: number;
  recordDate: string;
}): CadenceHistoryPoint[] => {
  const currentKey = periodKeyFor(horizon, recordDate);
  const upToNow = history.filter(
    (entry) => periodKeyFor(horizon, entry.record_date) <= currentKey,
  );
  const points =
    horizon === "quarterly"
      ? reduceToQuarters(upToNow)
      : upToNow.map((entry) => ({
          label: formatMonthYearShortFromValue(entry.record_date),
          entry,
        }));

  // Matched on the period, not on "is it last". The month in progress reaches the
  // series only once the cron writes it, so the strip often ends a period behind the
  // record date — highlighting that trailing chip would label July as where we are.
  return points.slice(-length).map(({ label, entry }) => ({
    label,
    regime: entry.regime,
    regimeLabel: getRegimePublicLabel(entry.regime),
    isCurrent: periodKeyFor(horizon, entry.record_date) === currentKey,
  }));
};

/**
 * The delta the chips imply, stated. A run of identical chips and a run that just
 * changed look alike at a glance, and which one it is decides whether the operator
 * should re-plan. Counted over the rendered window only, so "6 months" means "every
 * month shown", never a claim about history the card is not displaying.
 */
const buildHistoryDelta = ({
  history,
  periodNoun,
  periodNounPlural,
}: {
  history: CadenceHistoryPoint[];
  periodNoun: string;
  periodNounPlural: string;
}) => {
  const current = history.at(-1);
  if (!current) return null;

  let run = 0;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index].regime !== current.regime) break;
    run += 1;
  }

  const previous = history[history.length - run - 1];
  if (previous) {
    return `Moved to ${current.regimeLabel} from ${previous.regimeLabel} in ${history[history.length - run].label}.`;
  }

  const noun = run === 1 ? periodNoun : periodNounPlural;
  return `${current.regimeLabel} for every ${periodNoun} shown — ${run} ${noun}.`;
};

export const buildCadenceCallModel = ({
  horizon,
  assessment,
  recordDate,
  recordDateLabel,
  regimeHistory,
  planHref = "/operate",
  previousScores = null,
}: {
  horizon: CadenceCallHorizon;
  assessment: RegimeAssessment;
  recordDate: string;
  recordDateLabel?: string | null;
  regimeHistory: readonly RegimeHistoryEntry[];
  planHref?: string;
  /**
   * The prior read's composite scores, when the caller has them. Optional because the
   * rails are readable without it — the movement leg is the only part that needs it,
   * and a rail that cannot say which way the signal is heading is still a rail that
   * says where it sits.
   */
  previousScores?: { tightness?: number | null; riskAppetite?: number | null } | null;
}): CadenceCallModel => {
  const copy = HORIZON_COPY[horizon];
  const guidance =
    horizon === "monthly"
      ? getMonthlyActionGuidance(assessment.regime, {
          financingSaturated: assessment.regime === "EXPANSION" && assessment.scores.tightnessSaturated === true,
        })
      : getQuarterlyActionGuidance(assessment.regime);


  const periodLabel =
    (horizon === "monthly"
      ? formatMonthYearShortFromValue(recordDate)
      : formatQuarterLabel(recordDate)) || recordDateLabel || null;

  const history = buildHistory({
    horizon,
    history: regimeHistory,
    length: copy.historyLength,
    recordDate,
  });

  const { refusal } = assessment.policyAssessment;
  /* The held guidance for the reason this month is held. The reason line fell
     back to "The two scores disagree." whatever the reason; it falls back to the
     hold's own sentence now, which a refusal never needs since it stores one. */
  const hold = refusal.refused ? describePolicyHold(refusal) : null;
  const overrideReason = hold ? refusal.reasons[0] ?? hold.currentCall : null;

  // `currentCall` up top, `actionNow` in the rule. The weekly hero directly below
  // already leads with `actionNow` under a refusal, and leading with it here too put
  // the identical sentence on screen twice. `currentCall` is the posture-level form of
  // the same hold, which is the right altitude for a horizon card anyway.
  const boundedRule: HorizonOperatingRule = hold
    ? {
        action: hold.actionNow,
        threshold: hold.pauseIf,
        reversal: hold.callChangesIf,
      }
    : buildHorizonOperatingRule({
        assessment,
        guidance,
        horizon: horizon === "monthly" ? "month" : "quarter",
      });

  return {
    horizon,
    cadenceLabel: copy.cadenceLabel,
    periodLabel,
    headline: hold ? hold.currentCall : asImperative(guidance),
    regime: assessment.regime,
    regimeLabel: getRegimePublicLabel(assessment.regime),
    description: assessment.description,
    boundedRule,
    boundedBands: hold ? [] : buildHorizonSignalBands({ assessment, previousScores }),
    overrideReason,
    history,
    historyLabel: copy.historyLabel,
    historyDelta: buildHistoryDelta({
      history,
      periodNoun: copy.periodNoun,
      periodNounPlural: copy.periodNounPlural,
    }),
    weeklyBridge: copy.weeklyBridge,
    planHref,
    planLabel: copy.planLabel,
    shareTitle: copy.shareTitle,
    shareLabel: copy.shareLabel,
    shareCopiedLabel: "Guidance copied",
    shareLines: [
      `${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${boundedRule.threshold}`,
      `${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: ${boundedRule.reversal}`,
    ],
  };
};
