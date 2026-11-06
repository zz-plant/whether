/**
 * The × that closes a dialog, sheet, popover, toast or notice: one key everywhere.
 *
 * Ten of them were written by hand (2026-11-06), all 44px but on three radii (the 4px
 * data radius on six, against the 6px control radius §XIV gives a control), with three
 * hover fills or none, three icon sizes, and a focus ring on some. The help modal's,
 * from the shadcn dialog, was 28px. A caller adds only where the key sits (`-mr-2`,
 * `absolute right-1 top-1`) and passes `<CloseIcon />` at its default size.
 *
 * A class rather than a component, because half of them are Base UI parts
 * (`Dialog.Close`, `Toast.Close`) that render their own button.
 */
export const CLOSE_CONTROL_CLASS =
  "weather-focus-ring inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-100";
