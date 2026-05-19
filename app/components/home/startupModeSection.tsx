"use client";

import { useState } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { StartupModeSelector } from "../startupModeSelector";
import type { StartupModeContent } from "../startupModeSelector";
import type { StartupVariantMode } from "../../../lib/report/boundedDecisionRules";
import type { StartupVariantPolicy } from "../../../lib/report/homeBriefModel";
import { useLocalStorageState } from "../../../lib/hooks/useLocalStorageState";

const STORAGE_KEY = "whether_company_mode_open";

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
  const [stored, setStored] = useLocalStorageState<string>(STORAGE_KEY, "0");
  const [open, setOpen] = useState(stored === "1");

  const toggle = () => {
    const next = !open;
    setOpen(next);
    setStored(next ? "1" : "0");
  };

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
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <div className="weather-surface-secondary px-4 py-4 sm:px-5 sm:py-5">
        <Collapsible.Trigger className="flex w-full items-center justify-between gap-2 text-left mb-3">
          <span className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-300">Company mode</span>
          <span className={`text-fluid-micro text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </Collapsible.Trigger>
        <Collapsible.Panel>
          <StartupModeSelector
            options={options}
            selectedMode={selectedMode}
            contentByMode={contentByMode}
            onModeChange={setSelectedMode}
          />
        </Collapsible.Panel>
      </div>
    </Collapsible.Root>
  );
}
