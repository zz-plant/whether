/**
 * Scrolling a horizontal row without scrolling the page under it.
 *
 * Three sticky rows keep their current item in view: the brief's section outline, the
 * phone section chips, and the timeline's year rail. Two of them did it with
 * `scrollIntoView`, which scrolls every scrollable ancestor to satisfy `block` — and a
 * row stuck to the top of the window has the window as its ancestor. Whenever the global
 * header slid back over the row, "nearest" meant nudging the whole page to uncover it
 * (measured at 71px on both viewports on 2026-09-15), so an anchor jump the reader had
 * just made was cut short by its own outline updating, and a smooth scroll in progress
 * was cancelled mid-flight. `scrollTo` on the row moves the row and nothing else, which
 * is what the year rail already did by hand.
 */

/** The box either side of the calculation needs; every HTMLElement satisfies it. */
type Boxed = { getBoundingClientRect(): { left: number; width: number } };

type ScrollRow = Boxed & {
  scrollLeft: number;
  clientWidth: number;
  scrollTo?: (options: { left: number; behavior: ScrollBehavior }) => void;
};

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined"
  && typeof window.matchMedia === "function"
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** `smooth` requests animation; reduced motion turns it into a jump either way. */
export const scrollBehaviorFor = (smooth: boolean): ScrollBehavior =>
  smooth && !prefersReducedMotion() ? "smooth" : "auto";

/** The scrollLeft that centres `item` in `row`, clamped at the row's start. */
export const centredScrollLeft = (row: ScrollRow, item: Boxed): number => {
  const rowRect = row.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  return Math.max(0, itemRect.left - rowRect.left + row.scrollLeft - (row.clientWidth - itemRect.width) / 2);
};

/** Centres `item` in `row`'s own scroll range. Measured from rects, so it does not depend on which ancestor is `offsetParent`. */
export const scrollRowToItem = (row: ScrollRow, item: Boxed, options: { smooth?: boolean } = {}): void => {
  const left = centredScrollLeft(row, item);
  if (typeof row.scrollTo === "function") {
    row.scrollTo({ left, behavior: scrollBehaviorFor(options.smooth ?? false) });
  } else {
    row.scrollLeft = left;
  }
};
