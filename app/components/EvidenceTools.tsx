"use client";

import { DecisionSimulator } from "../../components/home/DecisionSimulator";
import { RegimeTransitionProbability } from "../../components/home/RegimeTransitionProbability";
import { DecisionTrendline } from "../../components/home/DecisionTrendline";
import { CompanyMetricsPanel } from "../../components/home/CompanyMetricsPanel";
import { TickerCompany } from "../../components/home/TickerCompany";
import { SourceDisagreement } from "../../components/evidence/SourceDisagreement";

type EvidenceToolsProps = {
  currentTightness: number;
  currentRiskAppetite: number;
  currentRegime: string;
  regimes: Array<{ record_date: string; regime: string }>;
  companyStage?: string;
  tightnessDelta: number;
  riskAppetiteDelta: number;
};

export function EvidenceTools({
  currentTightness,
  currentRiskAppetite,
  currentRegime,
  regimes,
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
      <DecisionTrendline regimes={regimes} />
      <CompanyMetricsPanel tightness={currentTightness} companyStage={companyStage} />
      <TickerCompany tightness={currentTightness} />
      <SourceDisagreement tightnessDelta={tightnessDelta} riskAppetiteDelta={riskAppetiteDelta} />
    </>
  );
}
