"use client";

import { useMemo } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import type { RegimeThresholds } from "../../../lib/regimeEngine";
import { THRESHOLD_PARAM_KEYS } from "../../../lib/thresholds";
import { ThresholdsPanel } from "./thresholdsPanel";
import { InstrumentQuestion } from "./instrumentQuestion";
import { ChevronDownIcon } from "../../components/uiIcons";
import { formatChangeLines } from "../../../lib/report/evidenceInstrumentSummaries";

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
    /* A row in the instruments list like the others: the question is the
       control. It was an eyebrow, a heading and a separate "Open the line
       settings · Show / hide" button, three lines for one toggle. */
    <section id="advanced-controls" className="weather-panel p-5 max-sm:px-0" aria-label="Line settings">
      {/* Kept as a JS collapsible rather than a native `<details>`, on
          purpose: `ThresholdsPanel` restores a saved draft into the URL from
          a mount effect, and a `<details>` mounts its content whether or not
          it is open. The panel has to stay unmounted until the reader opens
          it, or every visit with a saved draft rewrites the URL unasked. */}
      <Collapsible.Root defaultOpen={defaultOpen}>
        <Collapsible.Trigger
          type="button"
          className="group weather-focus-ring flex min-h-[44px] w-full cursor-pointer select-none items-center justify-between gap-3 text-left text-base font-semibold text-slate-100"
        >
          {/* "Conditions", not "the call": the retired word did three jobs
              (lib/report/AGENTS.md). The answer is the lines in force, in the
              words the panel's own defaults line uses. */}
          <InstrumentQuestion
            question="What would conditions be with different lines?"
            answer={`Set at ${formatChangeLines(currentThresholds)}`}
          />
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-[color:var(--app-text-muted)] transition-transform group-data-[panel-open]:rotate-180 motion-reduce:transition-none" />
        </Collapsible.Trigger>
        <Collapsible.Panel className="mt-4">
          <ThresholdsPanel currentThresholds={currentThresholds} />
        </Collapsible.Panel>
      </Collapsible.Root>
    </section>
  );
};
