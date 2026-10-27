import { revisitDecisionPhrase } from "../../lib/report/decisionTransmissionCopy";
import { comparisonBasis } from "../../lib/report/comparisonBasis";
import { describeScoresMovement } from "../../lib/report/evidenceReaderModel";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";

/* This week's conditions and direction in one sentence, for a page that is not
   the brief: the articles' live-guidance block, the pillars' header and the
   standalone resource pages all print it, so a reader arriving from search
   meets the current posture before the essay (AGENTS.md, "Thin SEO page"). */
export const loadPostureLine = async (route: string) => {
  const { reportData, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route });
  const { homeBriefModel, displayRegime } = snapshot;
  /* The answer pages' direction and basis (app/answers/decisionAnswerCopy.ts):
     this printed the engine's `directionLabel` "this week", which on Oct 5 was
     "and mixed this week; revisit last week's decisions" for two scores that
     had both worsened since Aug 31. */
  const movement = describeScoresMovement(reportData.reportDynamics);
  const basis = comparisonBasis(reportData.reportDynamics.comparedWith);
  const direction =
    movement === null ? ", with no comparison to last week available" : ` and ${movement} ${basis.since}`;
  return {
    reportData,
    snapshot,
    postureSummary: `Conditions are ${displayRegime.label}${direction}; ${revisitDecisionPhrase(homeBriefModel.revisitDecisions, basis)}.`,
  };
};
