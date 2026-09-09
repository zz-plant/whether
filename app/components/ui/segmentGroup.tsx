"use client";

import { useRef } from "react";

export type SegmentGroupOption = {
  key: string;
  label: string;
  /** Optional qualifier, shown at sm+ only. Never the thing the option means. */
  sublabel?: string;
  title?: string;
};

export type SegmentGroupProps = {
  options: readonly SegmentGroupOption[];
  activeKey: string;
  onSelect: (key: string) => void;
  ariaLabel: string;
  /** Fired on hover and focus, for callers that can prefetch the destination. */
  onIntent?: (key: string) => void;
  className?: string;
};

/**
 * The one exclusive-choice control.
 *
 * Three chip vocabularies used to state the same idea — pick one of these — in
 * three visual languages on one screen: the cadence segment (a hairline track
 * with a tinted active cell), the stage tabs (rounded pills in a bordered box
 * with a sky border on the active one), and the first-run stage buttons (bare
 * outlined rectangles). A reader learning one of them learned nothing about the
 * next two. This is the segment: a track, cells inside it, the active cell
 * tinted. Everything that picks one of several now looks like this, and
 * anything that is not an exclusive choice — an example to load, a place to go —
 * is a text link instead, so shape carries meaning again.
 *
 * Left/right arrows move along the group, which is what a reader who has met a
 * segmented control anywhere else already expects.
 */
export function SegmentGroup({
  options,
  activeKey,
  onSelect,
  ariaLabel,
  onIntent,
  className = "",
}: SegmentGroupProps) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = Math.max(
    options.findIndex((option) => option.key === activeKey),
    0,
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const delta = event.key === "ArrowLeft" ? -1 : 1;
    const nextIndex = (activeIndex + delta + options.length) % options.length;
    buttonsRef.current[nextIndex]?.focus();
    const nextKey = options[nextIndex]?.key;
    if (nextKey) onSelect(nextKey);
  };

  return (
    <fieldset
      aria-label={ariaLabel}
      className={`m-0 flex min-w-0 items-center gap-0.5 rounded-sm border border-white/[0.10] bg-[var(--bg-nested)] p-0.5 ${className}`}
    >
      {options.map((option, index) => {
        const isActive = option.key === activeKey;
        return (
          <button
            key={option.key}
            ref={(el) => {
              buttonsRef.current[index] = el;
            }}
            type="button"
            aria-current={isActive ? "true" : undefined}
            title={option.title}
            onKeyDown={handleKeyDown}
            onClick={() => onSelect(option.key)}
            onMouseEnter={onIntent ? () => onIntent(option.key) : undefined}
            onFocus={onIntent ? () => onIntent(option.key) : undefined}
            // 44px stays on touch; sm: drops to the 36px pointer size the header
            // already uses for its primary action.
            className={`min-h-[44px] min-w-[2.75rem] rounded-sm px-3 py-1.5 text-fluid-micro font-semibold transition-colors active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 sm:min-h-9 ${
              isActive ? "bg-sky-500/14 text-sky-100" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {option.label}
            {option.sublabel ? (
              <span className="ml-1 hidden font-normal text-white/40 sm:inline">{option.sublabel}</span>
            ) : null}
          </button>
        );
      })}
    </fieldset>
  );
}
