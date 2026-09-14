/**
 * Runway-conditioned notes: what the operator's own cash position implies about
 * acting on this week's call.
 *
 * Translation-only, under the same contract as the interpretation layers
 * (docs/one-screen-weekly-brief-spec.md): a note changes explanatory copy only.
 * It never restates a threshold number, never mutates a lane state, and never
 * changes the canonical call. The one dimension it adds is the one the macro
 * engine cannot see — how much cash the reader has to act with.
 *
 * Blank means not given. A missing runway never reads as zero: without the
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
          ? `At ${runwayMonths} months of runway and $${compactUsd.format(monthlyBurnUsd)}/month, every 10% burn cut adds about ${monthsBoughtByTenPercentCut(runwayMonths)} months — the burn lane is the one to act on first.`
          : `At ${runwayMonths} months of runway, cash durability is this week's binding constraint — the burn lane is the one to act on first.`,
      },
      {
        area: "capital-raising",
        note: `At ${runwayMonths} months, the raise is not a background task — a process started this quarter is what lands cash before the corridor matters.${isExpansion ? " A favorable window argues for starting earlier, not later." : ""}`,
      },
      {
        area: "hiring",
        note: `At ${runwayMonths} months, the hiring pause is what protects the runway every other lane assumes — check it first.`,
      },
    ];
    return notes;
  }

  if (runwayMonths < TIGHT_RUNWAY_MONTHS) {
    const notes: RunwayConditionedNote[] = [
      {
        area: "capital-raising",
        note: `At ${runwayMonths} months, raise planning belongs on this quarter's calendar${isExpansion ? ", and a favorable window argues for starting it early" : ""}.`,
      },
      {
        area: "hiring",
        note: `At ${runwayMonths} months, keep new roles tied to revenue or delivery risk until runway clears a year.`,
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
        note: `At ${runwayMonths} months of runway you can act on the call as printed — no emergency cuts while funding pressure stays this side of the pause line.`,
      },
    ];
    if (isExpansion) {
      notes.push({
        area: "expansion-bets",
        note: "With runway above a year, this is the window to spend on reversible bets the call allows.",
      });
    }
    return notes;
  }

  const notes: RunwayConditionedNote[] = [
    {
      area: "burn-discipline",
      note: `At ${runwayMonths} months, runway is not this week's binding constraint — the corridor is. Spend attention on the levers, not the cash line.`,
    },
  ];
  if (isTightening) {
    notes.push({
      area: "capital-raising",
      note: "The exception: keep raise discipline active anyway — long runway is cheapest to preserve when windows are poor.",
    });
  }
  return notes;
};
