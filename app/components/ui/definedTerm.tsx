import type { ReactNode } from "react";
import { TERM_DEFINITIONS } from "../../../lib/report/reportCopy";
import { CloseIcon } from "../uiIcons";
import { CLOSE_CONTROL_CLASS } from "./closeControl";

/*
 * Tap-to-define for the site's coined terms (2026-11-03). A reader without the macro
 * background met "funding pressure", "risk appetite" and "room before a change" with
 * nothing to say what they were; a hover title never shows on a phone. A term is a
 * button that opens its definition in a native popover: no script, keyboard and touch
 * both work, and Escape or a tap outside closes it.
 *
 * The definitions are `TERM_DEFINITIONS`, the one source the llms corpus reads too. They
 * render once, outside `<main>` (`TermDefinitionLayer`, mounted by both shells), so a
 * closed definition is not part of the page a reader scrolls and two uses of a term
 * open the same card.
 */
const DEFINED_TERMS = ["tightness", "risk-appetite", "confidence"] as const;
type DefinedTermKey = (typeof DEFINED_TERMS)[number];

const popoverId = (value: DefinedTermKey) => `term-${value}`;

export function DefinedTerm({ term, children }: { term: DefinedTermKey; children: ReactNode }) {
  return (
    <button
      type="button"
      popoverTarget={popoverId(term)}
      className="weather-hit inline cursor-help rounded-sm p-0 text-inherit underline decoration-slate-500 decoration-dotted underline-offset-4 hover:decoration-slate-300"
    >
      {children}
    </button>
  );
}

export function TermDefinitionLayer() {
  return (
    <>
      {DEFINED_TERMS.map((value) => {
        const entry = TERM_DEFINITIONS.find((candidate) => candidate.value === value);
        if (!entry) return null;
        return (
          <dialog
            key={value}
            id={popoverId(value)}
            popover="auto"
            aria-label={entry.term}
            className="relative m-auto max-w-sm rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-panel)] p-4 pr-12 text-left text-sm leading-relaxed text-slate-200 shadow-xl"
          >
            {/* A card over the page says how to close it (2026-11-03): Escape and a tap
                outside both did, and nothing on the card told a reader so. The popover
                closes itself, so this needs no script either. */}
            <button
              type="button"
              popoverTarget={popoverId(value)}
              popoverTargetAction="hide"
              aria-label={`Close ${entry.term}`}
              className={`${CLOSE_CONTROL_CLASS} absolute right-1 top-1`}
            >
              <CloseIcon />
            </button>
            <p className="font-semibold text-slate-100">{entry.term}</p>
            <p className="mt-1">{entry.summary}</p>
          </dialog>
        );
      })}
    </>
  );
}
