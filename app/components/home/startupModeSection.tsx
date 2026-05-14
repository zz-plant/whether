"use client";

import { useState } from "react";
import { StartupModeSelector } from "../startupModeSelector";
import type { StartupModeContent } from "../startupModeSelector";
import type { StartupVariantMode } from "../../../lib/report/boundedDecisionRules";
import type { StartupVariantPolicy } from "../../../lib/report/homeBriefModel";

const adaptAdjustment = (
  adjustment: {
    description: string;
    thresholdEmphasis: string;
    doNowAdjustments: string[];
    avoidAdjustments: string[];
    watchAdjustments: string[];
    reversalTriggerDiscipline: string;
  }
): StartupModeContent => ({
  description: adjustment.description,
  thresholdEmphasis: adjustment.thresholdEmphasis,
  doNowBullets: adjustment.doNowAdjustments,
  avoidBullets: adjustment.avoidAdjustments,
  watchBullets: adjustment.watchAdjustments,
  reversalTriggerDiscipline: adjustment.reversalTriggerDiscipline,
});

export function StartupModeSection({
  startupVariantPolicy,
}: {
  startupVariantPolicy: StartupVariantPolicy;
}) {
  const [selectedMode, setSelectedMode] = useState<StartupVariantMode>(startupVariantPolicy.selectedMode);

  const options = startupVariantPolicy.options.map((opt) => ({
    mode: opt.mode,
    label: opt.label,
  }));

  const contentByMode = Object.fromEntries(
    Object.entries(startupVariantPolicy.adjustmentsByMode).map(([mode, adjustment]) => [
      mode,
      adaptAdjustment(adjustment),
    ])
  ) as Partial<Record<StartupVariantMode, StartupModeContent>>;

  return (
    <div className="weather-panel px-4 py-4 sm:px-5 sm:py-5">
      <StartupModeSelector
        options={options}
        selectedMode={selectedMode}
        contentByMode={contentByMode}
        onModeChange={setSelectedMode}
      />
    </div>
  );
}
