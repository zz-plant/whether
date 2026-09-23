"use client";

import { Select } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon } from "./uiIcons";

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
    <Select.Root
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
          <span aria-hidden="true" className="text-[10px] font-medium text-slate-400">{label}</span>
          <Select.Value className="mt-0.5">{selected?.label}</Select.Value>
        </span>
        <Select.Icon>
          <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner side="bottom" align="end" sideOffset={6} className="z-50">
          <Select.Popup className="w-52 rounded-xl border border-slate-800/90 bg-slate-950/95 p-1.5 shadow-2xl">
            <Select.List>
              {options.map((option) => (
                <Select.Item
                  key={option.key}
                  value={option.key}
                  className="grid min-h-[44px] cursor-pointer grid-cols-[1fr_auto] items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-300 data-[highlighted]:bg-slate-900 data-[highlighted]:text-white data-[selected]:bg-sky-500/15 data-[selected]:font-semibold data-[selected]:text-sky-300"
                >
                  <div>
                    <Select.ItemText>{option.label}</Select.ItemText>
                    <div className="text-[10px] font-normal text-slate-400">{option.sublabel}</div>
                  </div>
                  <Select.ItemIndicator>
                    <CheckIcon className="h-3.5 w-3.5 text-sky-400" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
