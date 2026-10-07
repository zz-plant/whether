import { getRegimePublicLabel } from "../../lib/regimePresentation";
import type { RegimeKey } from "../../lib/regimeEngine";
import { comparisonBasis } from "../../lib/report/comparisonBasis";
import { revisitDecisionPhrase } from "../../lib/report/decisionTransmissionCopy";
import { describeScoresMovement, type SignalDynamicsSource } from "../../lib/report/evidenceReaderModel";

/*
 * This used to render as a key:value line — "Operating posture: Cloudy ·
 * Weekly momentum: improving · Revisit decisions: NO" — three engine labels a
 * first-time reader had to decode. It is one sentence now, and a week with no
 * comparison says so rather than reading as "stable" (the fifth direction,
 * see tests/noComparisonHonesty.test.ts).
 *
 * The direction is the two scores' (`describeScoresMovement`), named against
 * the reading they were compared with. It read `directionLabel` and no date,
 * so Oct 5 printed "Conditions are Freezing and mixed; revisit last week's
 * decisions." — "mixed" because the recession warning gauge steepened 0.06pp
 * while both scores worsened, and "last week" for a comparison with Aug 31.
 */
export const buildDecisionAnswerContextSummary = ({
  displayLabel,
  canonicalRegime,
  reportDynamics,
  revisitDecisions,
}: {
  displayLabel: string;
  canonicalRegime: RegimeKey;
  reportDynamics: SignalDynamicsSource;
  revisitDecisions: boolean;
}) => {
  const canonicalLabel = getRegimePublicLabel(canonicalRegime);
  const classificationLine = canonicalLabel !== displayLabel
    ? `Underneath, the scores read ${canonicalLabel}.`
    : null;
  const movement = describeScoresMovement(reportDynamics);
  const basis = comparisonBasis(reportDynamics.comparedWith);
  const standing = `${revisitDecisionPhrase(revisitDecisions, basis)}.`;

  return {
    summaryLine: movement
      ? `Conditions are ${displayLabel} and ${movement} ${basis.since}; ${standing}`
      : `Conditions are ${displayLabel}; no comparison with last week is available, so ${standing}`,
    classificationLine,
  };
};
