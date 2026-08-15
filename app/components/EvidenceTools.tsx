"use client";

import { DecisionSimulator } from "./home/DecisionSimulator";
import { RegimeTransitionProbability } from "./home/RegimeTransitionProbability";
import { CompanyMetricsPanel } from "./home/CompanyMetricsPanel";
import { TickerCompany } from "./home/TickerCompany";
import { SourceDisagreement } from "./evidence/SourceDisagreement";

type EvidenceToolsProps = {
  currentTightness: number;
  currentRiskAppetite: number;
  currentRegime: string;
  companyStage?: string;
  tightnessDelta: number;
  riskAppetiteDelta: number;
};

export function EvidenceTools({
  currentTightness,
  currentRiskAppetite,
  currentRegime,
  companyStage,
  tightnessDelta,
  riskAppetiteDelta,
}: EvidenceToolsProps) {
  return (
    <>
      <DecisionSimulator
        currentTightness={currentTightness}
        currentRiskAppetite={currentRiskAppetite}
        currentRegime={currentRegime}
      />
      <RegimeTransitionProbability currentRegime={currentRegime} />
      <CompanyMetricsPanel tightness={currentTightness} companyStage={companyStage} />
      <TickerCompany tightness={currentTightness} />
      <SourceDisagreement tightnessDelta={tightnessDelta} riskAppetiteDelta={riskAppetiteDelta} />
    </>
  );
}
