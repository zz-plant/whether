import { getRegimePublicLabel } from "../../lib/regimePresentation";
import type { RegimeKey } from "../../lib/regimeEngine";

export const buildDecisionAnswerContextSummary = ({
  displayLabel,
  canonicalRegime,
  momentumLabel,
  revisitDecisions,
}: {
  displayLabel: string;
  canonicalRegime: RegimeKey;
  momentumLabel: string;
  revisitDecisions: boolean;
}) => {
  const canonicalLabel = getRegimePublicLabel(canonicalRegime);
  const classificationLine = canonicalLabel !== displayLabel
    ? `Underlying regime classification: ${canonicalLabel}.`
    : null;

  return {
    summaryLine: `Operating posture: ${displayLabel} · Weekly momentum: ${momentumLabel} · Revisit decisions: ${revisitDecisions ? "YES" : "NO"}`,
    classificationLine,
  };
};
