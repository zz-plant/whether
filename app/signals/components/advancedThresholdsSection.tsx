"use client";

import { useMemo } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import type { RegimeThresholds } from "../../../lib/regimeEngine";
import { THRESHOLD_PARAM_KEYS } from "../../../lib/thresholds";
import { DataProvenanceStrip, type DataProvenance } from "../../components/dataProvenanceStrip";
import { ActionLink } from "../../components/ui/actionLink";
import { toRoute } from "../../../lib/navigation/routeType";
import { buildSignalsAdvancedHref } from "../evidenceQueryState";
import { ThresholdsPanel } from "./thresholdsPanel";

const hasThresholdParams = (params: URLSearchParams) => {
  return (
    params.has(THRESHOLD_PARAM_KEYS.baseRate) ||
    params.has(THRESHOLD_PARAM_KEYS.tightness) ||
    params.has(THRESHOLD_PARAM_KEYS.risk)
  );
};

/**
 * The advanced-controls gateway and, when open, the line settings.
 *
 * A separate `SignalsAdvancedControlsSection` used to sit above this one: a
 * `ReportSection` with an empty body whose header carried a pill reading
 * "Open" / "Closed" beside the two links — a section that existed to hold a
 * toggle for the section under it. The links live in this header now, so the
 * closed state is one header rather than one header and one empty section.
 * `#advanced-controls` is the anchor the section rail and the delta strip
 * target, and it resolves in both states.
 */
export const AdvancedThresholdsSection = ({
  currentThresholds,
  provenance,
  showAdvanced,
  searchParams,
}: {
  currentThresholds: RegimeThresholds;
  provenance: DataProvenance;
  showAdvanced: boolean;
  searchParams?: Record<string, string | undefined>;
}) => {
  const defaultOpen = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return hasThresholdParams(new URLSearchParams(window.location.search));
  }, []);

  return (
    <section id="advanced-controls" className="mt-10">
      <div className="weather-panel space-y-4 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="type-eyebrow type-eyebrow-section">Advanced controls</p>
            <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
              Move the lines the call is judged against.
            </h2>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!showAdvanced ? (
              <ActionLink
                variant="ghost"
                href={toRoute(`${buildSignalsAdvancedHref(searchParams, true)}#time-machine`)}
              >
                Open the month picker
              </ActionLink>
            ) : null}
            <ActionLink
              variant="ghost"
              href={toRoute(buildSignalsAdvancedHref(searchParams, !showAdvanced))}
            >
              {showAdvanced ? "Hide advanced filters" : "Show advanced filters"}
            </ActionLink>
          </div>
        </div>

        {showAdvanced ? (
        <>
        <DataProvenanceStrip provenance={provenance} />
        {/* Kept as a JS collapsible rather than a native `<details>`, on
            purpose: `ThresholdsPanel` restores a saved draft into the URL from
            a mount effect, and a `<details>` mounts its content whether or not
            it is open. The panel has to stay unmounted until the reader opens
            it, or every visit with a saved draft rewrites the URL unasked. */}
        <Collapsible.Root defaultOpen={defaultOpen}>
          <Collapsible.Trigger
            type="button"
            className="weather-button inline-flex min-h-[44px] items-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.14em] text-slate-300 transition-colors hover:border-sky-300/70 hover:text-slate-100"
          >
            Open the line settings
            <span className="text-fluid-micro text-slate-400">Show / hide</span>
          </Collapsible.Trigger>
          <Collapsible.Panel>
            <ThresholdsPanel currentThresholds={currentThresholds} provenance={provenance} />
          </Collapsible.Panel>
        </Collapsible.Root>
        </>
        ) : null}
      </div>
    </section>
  );
};
