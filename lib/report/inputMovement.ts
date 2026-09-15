/**
 * Names how the two published inputs moved this week, for the hero's posture
 * line. That line used to read "<posture> posture with steady inputs" on every
 * week, which on 2026-09-15 sat under readings that had moved 14 points each.
 * The words are chosen from the same deltas the hero prints beside the scores,
 * so the sentence cannot contradict the numbers next to it.
 */

/** Points either input must move before the line stops calling it steady; matches the hero's "notable" cut. */
export const INPUT_MOVEMENT_NOTABLE_POINTS = 3;

export type InputMovement = "steady inputs" | "tightening inputs" | "easing inputs" | "mixed inputs";

export const describeInputMovement = (tightnessDelta: number, riskAppetiteDelta: number): InputMovement => {
  const tightnessMoved = Math.abs(tightnessDelta) >= INPUT_MOVEMENT_NOTABLE_POINTS;
  const riskMoved = Math.abs(riskAppetiteDelta) >= INPUT_MOVEMENT_NOTABLE_POINTS;
  if (!tightnessMoved && !riskMoved) return "steady inputs";

  // Funding pressure tightens as it rises; risk appetite tightens as it falls.
  const tightnessTightening = tightnessDelta > 0;
  const riskTightening = riskAppetiteDelta < 0;
  if (tightnessMoved && riskMoved && tightnessTightening !== riskTightening) return "mixed inputs";

  const tightening = tightnessMoved ? tightnessTightening : riskTightening;
  return tightening ? "tightening inputs" : "easing inputs";
};
