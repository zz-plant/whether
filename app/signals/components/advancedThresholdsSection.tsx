"use client";

import { useMemo } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import type { RegimeThresholds } from "../../../lib/regimeEngine";
import { THRESHOLD_PARAM_KEYS } from "../../../lib/thresholds";
import { DataProvenanceStrip, type DataProvenance } from "../../components/dataProvenanceStrip";
import { ThresholdsPanel } from "./thresholdsPanel";

const hasThresholdParams = (params: URLSearchParams) => {
  return (
    params.has(THRESHOLD_PARAM_KEYS.baseRate) ||
    params.has(THRESHOLD_PARAM_KEYS.tightness) ||
    params.has(THRESHOLD_PARAM_KEYS.risk)
  );
};

export const AdvancedThresholdsSection = ({
  currentThresholds,
  provenance,
}: {
  currentThresholds: RegimeThresholds;
  provenance: DataProvenance;
}) => {
  const defaultOpen = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return hasThresholdParams(new URLSearchParams(window.location.search));
  }, []);

  return (
    <section id="thresholds" className="mt-10">
      <div className="weather-panel space-y-4 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">Advanced controls</p>
            <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
              Threshold and audit controls are hidden by default.
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Start with focus presets and ranked signals. Open this panel only when you need to tune
              thresholds or inspect audit history.
            </p>
          </div>
          <DataProvenanceStrip provenance={provenance} />
        </div>

        <Collapsible.Root defaultOpen={defaultOpen}>
          <Collapsible.Trigger
            type="button"
            className="weather-button inline-flex min-h-[44px] items-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.14em] text-slate-300 transition-colors hover:border-sky-300/70 hover:text-slate-100 touch-manipulation"
          >
            Open advanced threshold controls
            <span className="text-[10px] text-slate-500">Show / hide</span>
          </Collapsible.Trigger>
          <Collapsible.Panel>
            <ThresholdsPanel currentThresholds={currentThresholds} provenance={provenance} />
          </Collapsible.Panel>
        </Collapsible.Root>
      </div>
    </section>
  );
};
