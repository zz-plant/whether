"use client";

import { useId, type ReactNode } from "react";
import { cn } from "../../../lib/utils";

/**
 * The one segmented control.
 *
 * Three of these shipped, drawn to look the same and built three different
 * ways. On the home brief a reader met all three within one scroll:
 *
 * | Control | Container | ARIA | Keyboard | History |
 * | --- | --- | --- | --- | --- |
 * | Cadence  | `fieldset` | `aria-current` | arrows | `router.replace` |
 * | Stage    | `div`      | `role="tablist"` + `aria-selected` | arrows, Home/End | `router.push` |
 * | Runway   | `fieldset` | `aria-pressed` | none | local only |
 *
 * So two controls that look identical disagreed about what Back means, one of
 * them promised a tab relationship it has no panel for, and the third offered
 * no keyboard movement at all. Each choice had a comment defending it in
 * isolation and none of them could see the other two.
 *
 * What they all are is "pick one of these, and the page shows you that one" —
 * a radio group. Not a tablist: that pattern promises `tabpanel` children, and
 * a screen reader announcing "tab, 1 of 4" over a control that re-renders a
 * page is describing something that is not there. Not `aria-current` either,
 * which marks the current item *within a set of links*.
 *
 * **Real `<input type="radio">`, not `role="radio"` on a button.** Two of the
 * three hand-rolled their own roving tabindex and arrow keys, and the third
 * simply had none. A native radio group is already the whole pattern — arrows
 * move and select, Home and End reach the ends, the group is one tab stop,
 * and it survives a stylesheet failing to load — so the keyboard handler these
 * controls kept reimplementing, inconsistently, is deleted rather than shared.
 * The input carries the semantics and the `<span>` beside it carries the paint.
 *
 * Selection is a callback. The URL, the cookie and the local-state variants
 * differ in what they do with a choice, not in how a choice is made, and
 * pushing that difference down here is what let the three drift.
 */

export type SegmentedOption<Key extends string> = {
  key: Key;
  label: string;
  /**
   * Secondary text. In the "segmented" strip it follows the label above `sm`
   * and hides on a phone; in "choices" it is the option's second line at every
   * width, because there it carries the answer rather than a gloss — on the
   * decision picker, the area's state badge, which brings its own ink.
   */
  sublabel?: ReactNode;
  /** A decorative glyph before the label (`aria-hidden`; the label still names the option). */
  icon?: ReactNode;
  /** Native tooltip for the option. */
  title?: string;
};

type SegmentedControlProps<Key extends string> = {
  options: readonly SegmentedOption<Key>[];
  /** The selected key. `undefined` renders the group with nothing selected. */
  value: Key | undefined;
  onSelect: (key: Key) => void;
  /** Names the group for assistive tech. Required — an unlabelled radio group
   *  announces four choices and no question. */
  ariaLabel: string;
  /** Called on hover and focus, for a control whose selection navigates. */
  onPrefetch?: (key: Key) => void;
  /**
   * "segmented" (default): one strip, for two to four short options.
   * "choices": each option framed on its own, for a longer list that wraps.
   * Five decisions in one strip wrapped onto two rows inside a single box, and
   * with nothing selected the row read as a line of plain text, not as five
   * things to press.
   */
  layout?: "segmented" | "choices";
  className?: string;
};

const CONTAINER = {
  segmented:
    "inline-flex flex-wrap items-center gap-0.5 rounded-sm border border-[color:var(--border-subtle)] bg-[color:var(--bg-nested)] p-0.5",
  /* A grid that fills the row: every option the same width, five across where
     they fit, two on a phone with an odd last one spanning the row. As a
     wrapping flex row the cards stopped two-thirds of the way across and left
     a one-card orphan under the pair. */
  choices:
    "grid grid-cols-2 gap-2 sm:[grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr))] max-sm:[&>*:nth-child(odd):last-child]:col-span-2",
} as const;

/* 44px on touch, dropping to 36px only for a fine pointer (controls.css).
   The focus ring is drawn on the painted span from the input's own
   `:focus-visible`, so keyboard focus stays visible with the input clipped.

   Hover is `peer-hover`: the radio is stretched over the option, so the
   pointer is always over the input and a plain `hover:` on this span never
   matched. Every segmented control on the site had no hover state at all. */
const OPTION_BASE =
  "weather-segment-option flex min-h-[44px] min-w-[2.75rem] cursor-pointer items-center justify-center px-3 py-1.5 text-fluid-micro font-semibold transition-colors active:scale-[0.97] peer-hover:text-slate-200 peer-checked:bg-sky-500/15 peer-checked:text-[color:var(--app-text)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky-400";

const OPTION = {
  segmented: `${OPTION_BASE} rounded-sm text-slate-400 peer-hover:bg-slate-800/50`,
  choices: cn(
    OPTION_BASE,
    "w-full justify-start rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-nested)] text-slate-300 peer-hover:border-[color:var(--border-strong)] peer-checked:border-sky-500/50",
  ),
} as const;

export function SegmentedControl<Key extends string>({
  options,
  value,
  onSelect,
  ariaLabel,
  onPrefetch,
  layout = "segmented",
  className,
}: SegmentedControlProps<Key>) {
  /* One name per rendered group. The home brief mounts three of these, and a
     shared name would make twelve options into one group — picking a stage
     would clear the cadence. */
  const groupName = useId();

  return (
    <fieldset className={className ? `${CONTAINER[layout]} ${className}` : CONTAINER[layout]}>
      <legend className="sr-only">{ariaLabel}</legend>
      {options.map((option) => (
        <label
          key={option.key}
          title={option.title}
          className="relative inline-flex"
        >
          <input
            type="radio"
            name={groupName}
            value={option.key}
            checked={option.key === value}
            onChange={() => onSelect(option.key)}
            onFocus={onPrefetch ? () => onPrefetch(option.key) : undefined}
            /* The input is stretched over the whole option, so hover and focus
               both land on it and the prefetch hooks stay on the interactive
               element rather than on the label wrapping it. */
            onMouseEnter={onPrefetch ? () => onPrefetch(option.key) : undefined}
            className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
          />
          <span className={OPTION[layout]}>
            {layout === "choices" && option.sublabel ? (
              <span className="flex flex-col items-start text-left leading-tight">
                <span className="inline-flex items-center gap-1.5">
                  {option.icon}
                  {option.label}
                </span>
                <span className="mt-0.5 text-fluid-nano font-normal text-slate-400">{option.sublabel}</span>
              </span>
            ) : (
              <>
                {option.icon ? <span className="mr-1.5 inline-flex">{option.icon}</span> : null}
                <span>{option.label}</span>
                {option.sublabel ? (
                  <span className="ml-1 hidden font-normal opacity-60 sm:inline">· {option.sublabel}</span>
                ) : null}
              </>
            )}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
