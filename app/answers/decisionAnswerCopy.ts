import { getRegimePublicLabel } from "../../lib/regimePresentation";
import type { RegimeKey } from "../../lib/regimeEngine";
import { revisitDecisionPhrase } from "../../lib/report/decisionTransmissionCopy";

/*
 * This used to render as a key:value line — "Operating posture: Cloudy ·
 * Weekly momentum: improving · Revisit decisions: NO" — three engine labels a
 * first-time reader had to decode. It is one sentence now, and a week with no
 * comparison says so rather than reading as "stable" (the fifth direction,
 * see tests/noComparisonHonesty.test.ts).
 */
const MOVEMENT_PHRASES: Record<string, string> = {
  improving: "improving",
  deteriorating: "worsening",
  mixed: "mixed",
  stable: "holding",
};

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
    ? `Underneath, the scores read ${canonicalLabel}.`
    : null;
  const movement = MOVEMENT_PHRASES[momentumLabel] ?? "";
  const standing = `${revisitDecisionPhrase(revisitDecisions)}.`;

  return {
    summaryLine: movement
      ? `Conditions are ${displayLabel} and ${movement}; ${standing}`
      : `Conditions are ${displayLabel}; no comparison with last week is available, so ${standing}`,
    classificationLine,
  };
};
