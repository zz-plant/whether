import type { PolicyPosture } from "../regimeEngineCore";

/**
 * The reader's name for the policy assessment's stance.
 *
 * `PolicyPosture` is a second axis from the regime, not a rename of it: the
 * regime says what conditions are, the stance says how fast the rules let a
 * company move inside them. The toolkits and the Decision Shield rendered its
 * engine names — "Risk-On", "Safety Mode", "Transition" — which a reader met
 * as a third vocabulary beside the weather labels and, on the runway memo,
 * the raw regime keys. It is one word here, "pace", with three values a
 * reader can act on, and every surface reads this table rather than spelling
 * its own.
 */
const PACE_LABELS: Record<PolicyPosture, string> = {
  RISK_ON: "Speed up",
  TRANSITION: "Hold",
  SAFETY_MODE: "Slow down",
};

export const paceLabel = (posture: PolicyPosture): string => PACE_LABELS[posture];
