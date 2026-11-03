"use client";

import { Select } from "@base-ui/react/select";
import { ChevronDownIcon } from "./uiIcons";

type HeaderChoiceOption<Key extends string> = {
  key: Key;
  label: string;
  sublabel: string;
};

type HeaderChoicePillProps<Key extends string> = {
  /** Names the choice for assistive tech — "Stage", "Cash runway". */
  label: string;
  options: readonly HeaderChoiceOption<Key>[];
  value: Key;
  onSelect: (key: Key) => void;
  className?: string;
};

/**
 * The header's phone-width picker: one of a handful of named options, showing
 * the current one on its face.
 *
 * Two of these shipped as separate files — a stage pill and a runway pill —
 * identical but for the option list, each with its own copy of the
 * outside-click and Escape listeners, and each declaring `role="menu"` with
 * `menuitem` children over a control that picks a single value. A menu is a
 * list of commands; picking one of four is a select. Base UI's `Select` renders
 * the `listbox` and `option` roles, moves with the arrow keys, closes on Escape
 * and on an outside tap, and returns focus to the trigger, so there is no
 * handler here to drift between the two callers.
 */
export function HeaderChoicePill<Key extends string>({
  label,
  options,
  value,
  onSelect,
  className = "",
}: HeaderChoicePillProps<Key>) {
  const selected = options.find((option) => option.key === value) ?? options[0];

  return (
    /* A fixed id, not Base UI's generated one. The header is the one part of
       every page whose server and client ids disagreed: the server always
       rendered `base-ui-_R_5p6l6_` (production too, every load), and in about
       half of hydrations the client computed a path one level shallower, so
       React logged a mismatch on both pills and left the server's id in the
       DOM. `useId` derives from the tree path, and something above the header
       resolves at a different depth depending on when the streamed payload
       lands; ids inside the page never disagreed. Each pill appears once per
       page, so its label is a stable id, and the trigger and the hidden input
       both derive theirs from the root's. */
    <Select.Root
      id={`header-choice-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      value={value}
      onValueChange={(next) => {
        const option = options.find((candidate) => candidate.key === next);
        if (option) onSelect(option.key);
      }}
    >
      <Select.Trigger
        aria-label={`${label}: ${selected?.label ?? ""}`}
        className={`weather-button weather-focus-ring weather-press-scale inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold ${className}`}
      >
        {/* The face names the setting as well as its value. It showed the
            value alone — "Series A", "12–24 mo" — which on a first visit is
            the page asserting a stage and a runway nobody gave it. With the
            name above, it reads as a setting with a default, which is what it
            is. Two lines inside the same 44px target, so the header does not
            widen at phone width. */}
        <span className="flex flex-col items-start leading-none">
          <span aria-hidden="true" className="text-fluid-nano font-medium text-slate-400">{label}</span>
          <Select.Value className="mt-0.5">{selected?.label}</Select.Value>
        </span>
        <Select.Icon>
          <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner side="bottom" align="end" sideOffset={6} className="z-[var(--z-menu)]">
          <Select.Popup className="w-52 rounded-xl border border-slate-800/90 bg-slate-950 p-1.5 shadow-2xl">
            <Select.List>
              {options.map((option) => (
                <Select.Item
                  key={option.key}
                  value={option.key}
                  /* The same lamp as a segmented key (ui-ux-standards §XXVI): lit on the
                     chosen option. A check in the action ink over a 15% wash of it was a
                     second way of marking the same choice. */
                  className="weather-choice-item grid min-h-[44px] cursor-pointer grid-cols-[auto_1fr] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs text-slate-300 data-[highlighted]:bg-slate-900 data-[highlighted]:text-white data-[selected]:font-semibold data-[selected]:text-[color:var(--app-text)]"
                >
                  <span className="weather-segment-lamp" aria-hidden="true" />
                  <div>
                    <Select.ItemText>{option.label}</Select.ItemText>
                    <div className="text-fluid-nano font-normal text-slate-400">{option.sublabel}</div>
                  </div>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
