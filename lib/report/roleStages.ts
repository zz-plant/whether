/**
 * What a company's stage changes for the people working there.
 *
 * The stage rules (`buildScopedVariantDecisionAdjustment`) are written for whoever sets the budget. Each
 * role says what its stage means for it (`CompanyRole.atStage`); this holds what is true of the stage
 * whatever the role: how a sentence names it, and the question it raises.
 */
import { isOperatorStage, OPERATOR_STAGE_OPTIONS, type OperatorStage } from "./operatorStage";

type StageForWorkers = {
  /** Mid-sentence: "for software engineers at Series A companies". */
  atCompanies: string;
  /** The question this stage raises for whoever runs the company. */
  leadershipQuestion: string;
};

const STAGES_FOR_WORKERS: Record<OperatorStage, StageForWorkers> = {
  seed: {
    atCompanies: "seed-stage companies",
    leadershipQuestion: "What do we need to hit before we can hire the next person?",
  },
  "series-a": {
    atCompanies: "Series A companies",
    leadershipQuestion: "Which numbers need to keep getting better before we spend more?",
  },
  "series-b": {
    atCompanies: "Series B+ companies",
    leadershipQuestion: "How much do margins need to improve before we add people?",
  },
  bootstrapped: {
    atCompanies: "bootstrapped companies",
    leadershipQuestion: "How much of this quarter's revenue can we put back into the business?",
  },
};

export const ROLE_STAGES: readonly OperatorStage[] = OPERATOR_STAGE_OPTIONS.map((option) => option.key);

export const findRoleStage = (slug: string): OperatorStage | null => (isOperatorStage(slug) ? slug : null);

export const stageForWorkers = (stage: OperatorStage): StageForWorkers => STAGES_FOR_WORKERS[stage];
