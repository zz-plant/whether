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

export type RunwayConditionedNoteInput = {
  regime: RegimeKey;
  runwayMonths?: number;
  monthlyBurnUsd?: number;
};

export type RunwayConditionedNote = {
  area: DecisionArea;
  note: string;
};

/** Below this, runway — not the corridor — is the binding constraint this week. */
const CRITICAL_RUNWAY_MONTHS = 6;
const TIGHT_RUNWAY_MONTHS = 12;
const LONG_RUNWAY_MONTHS = 18;

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
  monthlyBurnUsd,
}: RunwayConditionedNoteInput): RunwayConditionedNote[] => {
  if (typeof runwayMonths !== "number" || !Number.isFinite(runwayMonths) || runwayMonths <= 0) {
    return [];
  }

  const isExpansion = regime === "EXPANSION";
  const isTightening = regime === "SCARCITY" || regime === "DEFENSIVE";

  if (runwayMonths < CRITICAL_RUNWAY_MONTHS) {
    const notes: RunwayConditionedNote[] = [
      {
        area: "burn-discipline",
        note: monthlyBurnUsd
          ? `At ${runwayMonths} months of runway and $${compactUsd.format(monthlyBurnUsd)}/month, every 10% burn cut adds about ${monthsBoughtByTenPercentCut(runwayMonths)} months — burn is the lane where the printed call moves runway fastest.`
          : `At ${runwayMonths} months of runway, cash durability is this week's binding constraint, and burn is the lane where the printed call moves it fastest.`,
      },
      {
        area: "capital-raising",
        note: `At ${runwayMonths} months, a raise process started this quarter is what lands cash before runway ends — waiting compresses that margin.${isExpansion ? " A favorable window argues for starting earlier, not later." : ""}`,
      },
      {
        area: "hiring",
        note: `At ${runwayMonths} months, the runway every other lane assumes is protected most by the hiring lane — reversing that pause is what spends it.`,
      },
    ];
    return notes;
  }

  if (runwayMonths < TIGHT_RUNWAY_MONTHS) {
    const notes: RunwayConditionedNote[] = [
      {
        area: "capital-raising",
        note: `At ${runwayMonths} months, raise planning is the lane with the least slack — the corridor's window has to fit inside the runway you have${isExpansion ? ", and a favorable window widens it" : ""}.`,
      },
      {
        area: "hiring",
        note: `At ${runwayMonths} months, each net-new role commits fixed cost against months you cannot extend — its payback proof carries that weight.`,
      },
    ];
    if (monthlyBurnUsd) {
      notes.push({
        area: "burn-discipline",
        note: `At $${compactUsd.format(monthlyBurnUsd)}/month, a 10% cut adds about ${monthsBoughtByTenPercentCut(runwayMonths)} months of cushion.`,
      });
    }
    return notes;
  }

  if (runwayMonths < LONG_RUNWAY_MONTHS) {
    const notes: RunwayConditionedNote[] = [
      {
        area: "burn-discipline",
        note: `At ${runwayMonths} months of runway you can act on the printed call — no emergency cuts while funding pressure stays this side of the pause line.`,
      },
    ];
    if (isExpansion) {
      notes.push({
        area: "expansion-bets",
        note: "With runway above a year, spare runway goes furthest into the reversible bets the call allows.",
      });
    }
    return notes;
  }

  const notes: RunwayConditionedNote[] = [
    {
      area: "burn-discipline",
      note: `At ${runwayMonths} months, runway is not this week's binding constraint — the corridor is.`,
    },
  ];
  if (isTightening) {
    notes.push({
      area: "capital-raising",
      note: "The exception: in a tightening window, raise discipline is where long runway earns its keep.",
    });
  }
  return notes;
};
