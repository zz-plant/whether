"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { TreasuryData } from "../../../lib/types";
import { evaluateRegime, type RegimeAssessment } from "../../../lib/regimeEngine";
import { getPlaybookGuidance } from "../../../lib/playbook";
import { getClipboardUiState, useClipboardCopy } from "../../components/useClipboardCopy";
import {
  SCENARIO_RATE_RANGE,
  SCENARIO_SLOPE_RANGE,
  buildScenarioBriefText,
  buildScenarioSearch,
  buildSimulatedTreasury,
  parseScenarioParam,
  type ScenarioPreset,
} from "../../../lib/report/scenarioStudio";
import { ScenarioDeltas } from "./scenarioDeltas";
import { ScenarioPresets } from "./scenarioPresets";
import { ScenarioSliders } from "./scenarioSliders";
import { RegimeRadar } from "../../components/home/RegimeRadar";

export function ScenarioStudioSimulator({
  liveTreasury,
  liveAssessment,
}: {
  liveTreasury: TreasuryData;
  liveAssessment: RegimeAssessment;
}) {
  const searchParams = useSearchParams();

  const liveBaseRate = liveAssessment.scores.baseRate ?? 4.5;
  const liveCurveSlope = liveAssessment.scores.curveSlope ?? -0.5;

  const [simulatedBaseRate, setSimulatedBaseRate] = useState<number>(
    () => parseScenarioParam(searchParams?.get("rate"), SCENARIO_RATE_RANGE) ?? liveBaseRate,
  );
  const [simulatedCurveSlope, setSimulatedCurveSlope] = useState<number>(
    () => parseScenarioParam(searchParams?.get("slope"), SCENARIO_SLOPE_RANGE) ?? liveCurveSlope,
  );

  const { status, error, activeTarget, copiedTarget, copyToClipboard } = useClipboardCopy({ commitment: "copied_brief" });

  /* The URL is written where the value changes, not mirrored back through an
     effect. `replaceState` rather than the router: a range input fires on
     every tick, and a router replace is a server round trip per tick for a
     page whose data does not change — the same call `UrlDetails` records. */
  const writeScenario = (rate: number, slope: number) => {
    const atLiveBaseline =
      Math.abs(rate - liveBaseRate) < 0.01 && Math.abs(slope - liveCurveSlope) < 0.01;
    const search = buildScenarioSearch(new URLSearchParams(window.location.search), {
      rate,
      slope,
      atLiveBaseline,
    });
    const nextHref = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", nextHref);
  };

  const setScenario = (rate: number, slope: number) => {
    setSimulatedBaseRate(rate);
    setSimulatedCurveSlope(slope);
    writeScenario(rate, slope);
  };

  const simulatedTreasury = useMemo(
    () => buildSimulatedTreasury(liveTreasury, simulatedBaseRate, simulatedCurveSlope),
    [liveTreasury, simulatedBaseRate, simulatedCurveSlope],
  );

  const simulatedAssessment = useMemo(() => evaluateRegime(simulatedTreasury), [simulatedTreasury]);

  const simulatedPlaybook = useMemo(
    () =>
      getPlaybookGuidance(simulatedAssessment.regime, {
        scores: simulatedAssessment.scores,
        thresholds: simulatedAssessment.thresholds,
      }),
    [simulatedAssessment],
  );

  // Deltas vs live baseline
  const baseRateDelta = simulatedBaseRate - liveBaseRate;
  const curveSlopeDelta = simulatedCurveSlope - liveCurveSlope;
  const tightnessDelta = simulatedAssessment.scores.tightness - liveAssessment.scores.tightness;
  const riskAppetiteDelta = simulatedAssessment.scores.riskAppetite - liveAssessment.scores.riskAppetite;
  const isAtLiveBaseline =
    Math.abs(baseRateDelta) < 0.01 && Math.abs(curveSlopeDelta) < 0.01;

  const applyPreset = (preset: ScenarioPreset) => setScenario(preset.rate, preset.slope);
  const resetToLive = () => setScenario(liveBaseRate, liveCurveSlope);

  const handleCopySimulatedBrief = () => {
    const briefText = buildScenarioBriefText({
      simulatedBaseRate,
      simulatedCurveSlope,
      baseRateDelta,
      curveSlopeDelta,
      tightnessDelta,
      riskAppetiteDelta,
      liveAssessment,
      simulatedAssessment,
      simulatedPlaybook,
      shareUrl: window.location.href,
    });
    void copyToClipboard(briefText, "simulated-brief");
  };

  const handleCopyShareableLink = () => {
    void copyToClipboard(window.location.href, "shareable-link");
  };

  const clipboard = { status, error, activeTarget, copiedTarget };

  return (
    <div className="space-y-6">
      <ScenarioPresets
        simulatedBaseRate={simulatedBaseRate}
        simulatedCurveSlope={simulatedCurveSlope}
        isAtLiveBaseline={isAtLiveBaseline}
        onApplyPreset={applyPreset}
        onResetToLive={resetToLive}
      />
      <ScenarioSliders
        simulatedBaseRate={simulatedBaseRate}
        simulatedCurveSlope={simulatedCurveSlope}
        baseRateDelta={baseRateDelta}
        curveSlopeDelta={curveSlopeDelta}
        onBaseRateChange={(value) => setScenario(value, simulatedCurveSlope)}
        onCurveSlopeChange={(value) => setScenario(simulatedBaseRate, value)}
        linkClipboardState={getClipboardUiState("shareable-link", clipboard)}
        briefClipboardState={getClipboardUiState("simulated-brief", clipboard)}
        onCopyShareableLink={handleCopyShareableLink}
        onCopySimulatedBrief={handleCopySimulatedBrief}
      />
      {/*
        * The sliders, drawn where the map is: the scenario's reading as the
        * filled dot, this week's as the hollow one — the same filled/hollow
        * pair the two ladders below draw, so one screen does not use opposite
        * encodings for its two points (2026-10-21). At the live baseline there
        * is one point, so the hollow marker and its legend drop out.
        */}
      <RegimeRadar
        tightness={simulatedAssessment.scores.tightness}
        riskAppetite={simulatedAssessment.scores.riskAppetite}
        previousTightness={isAtLiveBaseline ? null : liveAssessment.scores.tightness}
        previousRiskAppetite={isAtLiveBaseline ? null : liveAssessment.scores.riskAppetite}
        previousLabel={isAtLiveBaseline ? null : "This week"}
        primaryLabel="Simulated reading"
        tightnessThreshold={liveAssessment.thresholds.tightnessRegime}
        riskAppetiteThreshold={liveAssessment.thresholds.riskAppetiteRegime}
        currentRegime={simulatedAssessment.regime}
        footer={
          isAtLiveBaseline ? null : (
            <span>
              Filled dot: the simulated reading. Hollow: this week&apos;s reading, before the sliders.
            </span>
          )
        }
        className="mx-auto w-full max-w-[18rem]"
      />
      <ScenarioDeltas
        liveAssessment={liveAssessment}
        simulatedAssessment={simulatedAssessment}
        simulatedPlaybook={simulatedPlaybook}
        tightnessDelta={tightnessDelta}
        riskAppetiteDelta={riskAppetiteDelta}
      />
    </div>
  );
}
