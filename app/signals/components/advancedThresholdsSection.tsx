"use client";

import { useMemo } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import type { RegimeThresholds } from "../../../lib/regimeEngine";
import { THRESHOLD_PARAM_KEYS } from "../../../lib/thresholds";
import { ThresholdsPanel } from "./thresholdsPanel";

const hasThresholdParams = (params: URLSearchParams) => {
  return (
    params.has(THRESHOLD_PARAM_KEYS.baseRate) ||
    params.has(THRESHOLD_PARAM_KEYS.tightness) ||
    params.has(THRESHOLD_PARAM_KEYS.risk)
  );
};

/**
 * The line settings, behind one disclosure.
 *
 * A separate `SignalsAdvancedControlsSection` used to sit above this one, and
 * a "Show advanced filters" link gated this whole block behind a page reload;
 * both are gone (2026-09-22) and the block sits under "Deeper evidence" with the
 * other instruments. `#advanced-controls` is the anchor the focus filters and
 * older links target, and it resolves in both states.
 */
export const AdvancedThresholdsSection = ({
  currentThresholds,
}: {
  currentThresholds: RegimeThresholds;
}) => {
  const defaultOpen = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return hasThresholdParams(new URLSearchParams(window.location.search));
  }, []);

  return (
    <section id="advanced-controls" className="weather-panel space-y-4 p-5" aria-labelledby="advanced-controls-heading">
      <div>
        <p className="type-eyebrow">Advanced controls</p>
        <h3 id="advanced-controls-heading" className="mt-1 text-base font-semibold text-slate-100">
          Move the lines where conditions change.
        </h3>
      </div>
      {/* Kept as a JS collapsible rather than a native `<details>`, on
          purpose: `ThresholdsPanel` restores a saved draft into the URL from
          a mount effect, and a `<details>` mounts its content whether or not
          it is open. The panel has to stay unmounted until the reader opens
          it, or every visit with a saved draft rewrites the URL unasked. */}
      <Collapsible.Root defaultOpen={defaultOpen}>
        <Collapsible.Trigger
          type="button"
          className="weather-button inline-flex min-h-[44px] items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-sky-300/70 hover:text-slate-100"
        >
          Open the line settings
          <span className="text-fluid-micro text-slate-400">Show / hide</span>
        </Collapsible.Trigger>
        <Collapsible.Panel>
          <ThresholdsPanel currentThresholds={currentThresholds} />
        </Collapsible.Panel>
      </Collapsible.Root>
    </section>
  );
};
