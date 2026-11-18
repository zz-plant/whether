"use client";

import { useState } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import type { RegimeThresholds } from "../../../lib/regimeEngine";
import type { InputChoiceModel } from "../../../lib/report/countedInputs";
import { ThresholdsPanel } from "./thresholdsPanel";
import { InstrumentQuestion } from "./instrumentQuestion";
import { ChevronDownIcon } from "../../components/uiIcons";

/**
 * The line settings and the inputs that count, behind one disclosure.
 *
 * A separate `SignalsAdvancedControlsSection` used to sit above this one, and
 * a "Show advanced filters" link gated this whole block behind a page reload;
 * both are gone (2026-09-22) and the block sits under "Deeper evidence" with the
 * other instruments. `#advanced-controls` is the anchor the focus filters and
 * older links target, and it resolves in both states.
 *
 * Since 2026-11-18 it also holds which inputs count (`buildInputChoiceModel`), so the
 * question names both. A reading the engine cannot rebuild offers no inputs, and the
 * question asks about lines alone, as it did before.
 */
export const AdvancedThresholdsSection = ({
  currentThresholds,
  defaultOpen = false,
  answer,
  inputChoice = null,
}: {
  currentThresholds: RegimeThresholds;
  /** Open when the URL names lines or inputs, decided from the request so the server and the browser agree. */
  defaultOpen?: boolean;
  /** The closed row's answer (`describeLinesAndInputsAnswer`). */
  answer: string;
  inputChoice?: InputChoiceModel | null;
}) => {
  /* The first render's answer, kept: a box or a line the reader changes is a navigation,
     and the page that comes back says "open" where the one before said "closed". The
     disclosure is uncontrolled, so a new default after it mounted is ignored and warned
     about; it stays as the reader left it. */
  const [initiallyOpen] = useState(defaultOpen);
  return (
    /* A row in the instruments list like the others: the question is the
       control. It was an eyebrow, a heading and a separate "Open the line
       settings · Show / hide" button, three lines for one toggle. */
    <section id="advanced-controls" className="weather-panel px-0 py-5" aria-label="Line settings">
      {/* Kept as a JS collapsible rather than a native `<details>`, on
          purpose: `ThresholdsPanel` restores a saved draft into the URL from
          a mount effect, and a `<details>` mounts its content whether or not
          it is open. The panel has to stay unmounted until the reader opens
          it, or every visit with a saved draft rewrites the URL unasked. */}
      <Collapsible.Root defaultOpen={initiallyOpen}>
        <Collapsible.Trigger
          type="button"
          className="group weather-focus-ring flex min-h-[44px] w-full cursor-pointer select-none items-center justify-between gap-3 text-left text-base font-semibold text-slate-100"
        >
          {/* "Conditions", not "the call": the retired word did three jobs
              (lib/report/AGENTS.md). The question names the inputs only where the panel
              offers them. The answer is the lines in force, or, with a choice of inputs,
              what that choice gives, conditions first. */}
          <InstrumentQuestion
            question={
              inputChoice
                ? "What would conditions be with different lines or inputs?"
                : "What would conditions be with different lines?"
            }
            answer={answer}
          />
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-[color:var(--app-text-muted)] transition-transform group-data-[panel-open]:rotate-180 motion-reduce:transition-none" />
        </Collapsible.Trigger>
        <Collapsible.Panel className="mt-4">
          <ThresholdsPanel currentThresholds={currentThresholds} inputChoice={inputChoice} />
        </Collapsible.Panel>
      </Collapsible.Root>
    </section>
  );
};
