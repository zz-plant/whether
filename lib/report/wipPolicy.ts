/**
 * WIP guidance derived from the regime, as numeric pull-policy language.
 *
 * The bounded rules already say "avoid parallel expansion programs"
 * (`boundedDecisionRules.ts`); this makes it numeric. A kanban team adjusts
 * one thing continuously — how much it pulls — so the regime arrives here as
 * a per-regime cap on parallel bets, scaled by runway the same way the stage
 * rules are (`scaleAdjustmentToRunway`): a tight cash band lowers every cap,
 * an abundant band raises it.
 *
 * Guidance, not measurement: this module tracks no board and no flow. It says
 * what the cap would be; the team's own board says what it is.
 */
import type { RegimeKey } from "../regimeEngine";
import type { RunwayBand } from "./operatorRunway";
import { runwayBandLabel } from "./operatorRunway";

/**
 * Parallel bets a team can carry per regime, before runway scaling.
 *
 * Two regimes can share a cap when they carry the same risk posture: DEFENSIVE
 * and SCARCITY are both contraction calls, VOLATILE is expansion-with-chop,
 * EXPANSION is full pull. The numbers are deliberately small — the unit is
 * "parallel bets" (initiatives, epics, speculative lanes), not tickets, and a
 * cap the team can actually hold beats a precise one it cannot.
 */
const WIP_CAPS_BY_REGIME: Record<RegimeKey, number> = {
  SCARCITY: 1,
  DEFENSIVE: 1,
  VOLATILE: 2,
  EXPANSION: 3,
};

/**
 * Runway scaling, following the stage rules' bands: critical halves the cap,
 * tight keeps it, balanced keeps it, abundant buys one more parallel bet.
 * Zero is a real value — under six months of cash the guidance is one bet,
 * finish it, then pull the next.
 */
const RUNWAY_WIP_DELTA: Record<RunwayBand, number> = {
  critical: -1,
  tight: 0,
  balanced: 0,
  abundant: 1,
};

export type WipGuidance = {
  regime: RegimeKey;
  runwayBand: RunwayBand | null;
  /** The numeric cap after runway scaling; floored at 1. */
  cap: number;
  /** One sentence: the cap, in a pull system's terms. */
  sentence: string;
  /** Copy-ready block for a board header. */
  markdown: string;
};

export const buildWipGuidance = ({
  regime,
  runwayBand = null,
}: {
  regime: RegimeKey;
  runwayBand?: RunwayBand | null;
}): WipGuidance => {
  const base = WIP_CAPS_BY_REGIME[regime];
  const delta = runwayBand ? RUNWAY_WIP_DELTA[runwayBand] : 0;
  // A cap of zero would read as "pull nothing", which is a freeze, not a WIP
  // cap — the runway rules already put that gate in front of every commitment.
  const cap = Math.max(1, base + delta);

  const runwayClause = runwayBand && runwayBand !== "balanced"
    ? `, given ${runwayBandLabel(runwayBand).toLowerCase()} runway`
    : "";
  const sentence = `Cap parallel bets at ${cap}${runwayClause}; finish one before pulling the next.`;

  const markdown = [
    `**WIP policy — ${regime}**`,
    `Parallel bets: ${cap}${runwayClause}`,
    `Rule: finish one before pulling the next.`,
  ].join("\n");

  return { regime, runwayBand, cap, sentence, markdown };
};