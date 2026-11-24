/**
 * Where a nav popover goes, beside the control that opened it and inside the screen.
 *
 * The phone's section jumper and bottom-bar group switcher were placed with CSS anchor
 * positioning alone. When neither the base area nor `flip-inline` fit, which is every
 * time the trigger sits mid-screen and the popover is wider than either side, each engine
 * kept a different wrong answer: on a 390px phone the section list ran from x=188 to 476
 * in Chromium and WebKit, and the History tab's list ran from 158 to 430 in WebKit while
 * Chromium pinned it to the left edge (measured 2026-11-24). Every one of these popovers
 * opens from fixed or sticky chrome, so a fixed position clamped here is exact in every
 * engine and needs no scroll tracking.
 */

type PlacementRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
};

type PopoverPlacementOptions = {
  /** Open below the trigger (masthead) or above it (bottom tab bar). */
  side: "below" | "above";
  /** Line the popover's start up with the trigger's start, or centre it on the trigger. */
  align?: "start" | "center";
  /** Space between the trigger and the popover. */
  gap?: number;
  /** The closest the popover comes to any screen edge. */
  margin?: number;
};

export const placePopover = (
  trigger: PlacementRect,
  popover: { width: number; height: number },
  viewport: { width: number; height: number },
  { side, align = "start", gap = 6, margin = 8 }: PopoverPlacementOptions,
): { top: number; left: number } => {
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

  const preferredLeft =
    align === "center" ? (trigger.left + trigger.right) / 2 - popover.width / 2 : trigger.left;
  const left = clamp(preferredLeft, margin, Math.max(margin, viewport.width - popover.width - margin));

  const below = trigger.bottom + gap;
  const above = trigger.top - gap - popover.height;
  const fitsBelow = below + popover.height <= viewport.height - margin;
  const fitsAbove = above >= margin;
  const preferred = side === "below" ? (fitsBelow || !fitsAbove ? below : above) : fitsAbove || !fitsBelow ? above : below;
  const top = clamp(preferred, margin, Math.max(margin, viewport.height - popover.height - margin));

  return { top: Math.round(top), left: Math.round(left) };
};

/** Places an open `[popover]` element beside its trigger (see `placePopover`). */
export const placePopoverElement = (
  trigger: Element,
  popover: HTMLElement,
  options: PopoverPlacementOptions,
): void => {
  const triggerRect = trigger.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const { top, left } = placePopover(
    triggerRect,
    { width: popoverRect.width, height: popoverRect.height },
    { width: document.documentElement.clientWidth, height: window.innerHeight },
    options,
  );
  /* The stylesheet's first-frame spot may pin the far edges (the tab bar's list sits on
     `bottom`); clear them so `top` and `left` alone place the box and it keeps its size. */
  popover.style.inset = `${top}px auto auto ${left}px`;
};
