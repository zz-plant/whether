/**
 * What a worker can ask whoever runs the company, and what the answer means under the rules.
 *
 * Most tech workers are at private companies with nothing filed, so the one way to learn a company's
 * position is to ask. The meanings are the runway bands' own consequences (`scaleAdjustmentToRunway`),
 * stated as what the rules would have a company do, since no one here knows what this one will.
 */
import { TIGHT_RUNWAY_PAYBACK_BAR_MONTHS } from "./boundedDecisionRules";
import type { CompanyRole } from "./companyRoles";
import { RUNWAY_BAND_OPTIONS, runwayBandPhrase, type RunwayBand } from "./operatorRunway";

const BAND_MEANINGS: Record<RunwayBand, string> = {
  critical: "the rules put cash first and hold new commitments, whatever this week's guidance says.",
  tight: `the rules want every new hire and campaign to pay back inside ${TIGHT_RUNWAY_PAYBACK_BAR_MONTHS} months.`,
  balanced: "the rules follow this week's guidance.",
  abundant: "the rules leave room to move against the cycle, at the same payback bar.",
};

export const RUNWAY_QUESTION = "How many months of runway do we have, or does revenue cover our spending?";

/** One line per band, from the band table, so a moved boundary moves these too. */
export const runwayAnswers = (): string[] => [
  ...RUNWAY_BAND_OPTIONS.map((band) => {
    const phrase = runwayBandPhrase(band.key);
    return `${phrase.charAt(0).toUpperCase()}${phrase.slice(1)}: ${BAND_MEANINGS[band.key]}`;
  }),
  "Revenue covers spending: no runway is counting down, so budgets and priorities matter more than cash.",
];

const SHARED_QUESTIONS = [
  "When is next year's budget set, and when do proposals need to be in?",
  "What would make us pause hiring or spending, and what would restart it?",
];

/** The questions in the order a page prints them, the runway question first because others hang on it. */
export const leadershipQuestions = (role: CompanyRole): string[] => [RUNWAY_QUESTION, ...SHARED_QUESTIONS, role.leadershipQuestion];

/** The questions as a message someone can paste to a manager or into a meeting doc. */
export const buildLeadershipQuestionsCopy = (role: CompanyRole): string =>
  ["Questions for our next all-hands:", ...leadershipQuestions(role).map((question) => `- ${question}`)].join("\n");
