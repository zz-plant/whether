import type { PremiseTestBacktestModel } from "../../lib/research/premiseBacktestModel";

/**
 * The question `/calibration`'s premise section asks, and its answer first
 * (docs/editorial-guardrails.md, "Questions and answers, as people say them"). The heading
 * read "What happened to venture fundraising when funding pressure was above 70" with no
 * question mark and no sentence under it, so the chart's two medians were the only answer
 * (2026-11-25). The answer reads the same medians the chart's key prints, and says what the
 * test registered in advance found: a null result is a finding, stated as one
 * (docs/editorial-guardrails.md, "Past and future claims").
 */
const PREMISE_QUESTION = "What happened to venture fundraising when funding pressure was above 70?";

const percentWords = (value: number) => `${Math.abs(Math.round(value * 100))}%`;
const moved = (value: number) => (value >= 0 ? `rose a median ${percentWords(value)}` : `fell a median ${percentWords(value)}`);

export const describePremiseAnswer = (
  model: Pick<PremiseTestBacktestModel, "tightDistribution" | "calmDistribution" | "verdict">,
): { question: string; answer: string } => {
  const tight = model.tightDistribution;
  const calm = model.calmDistribution;
  const slower = tight.medianForwardValue < calm.medianForwardValue;
  const lead = tight.medianForwardValue < 0 ? "It shrank" : slower ? "It grew more slowly" : "It grew at least as fast";
  const against = calm.medianForwardValue >= 0 ? percentWords(calm.medianForwardValue) : `a ${percentWords(calm.medianForwardValue)} fall`;
  const sentence = `${lead}: venture deal value ${moved(tight.medianForwardValue)} over the next four quarters in the ${tight.count} quarters above 70, against ${against} in the other ${calm.count}.`;
  const test =
    model.verdict === "supported"
      ? "That gap passed the test registered in advance."
      : "That gap did not pass the test registered in advance.";
  return { question: PREMISE_QUESTION, answer: `${sentence} ${test}` };
};
