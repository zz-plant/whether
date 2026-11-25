import { formatMonthLabel } from "../timeMachine/monthFormatting";

/**
 * Where a tap on a small drawing lands, and where its words go (2026-11-25).
 *
 * The drawings of 2026-11-18 draw marks a few pixels wide on a phone: a grid cell is
 * about 25px across, a bar or a base-rate square under 10px. A finger is about 40px.
 * On touch the whole drawing is the target instead: a tap selects the mark nearest to
 * where it landed, and the words for that mark, with a link that opens it, sit above
 * the finger and the mark (`app/components/ui/markReadout.tsx`, and
 * `app/components/history/historyReadout.tsx` for /history's grid).
 *
 * Pure geometry on viewport boxes, so it is tested without a DOM, and the client
 * islands that read it ship nothing else.
 */

/** A box in viewport pixels, as `getBoundingClientRect` gives it. */
export type MarkBox = { left: number; top: number; right: number; bottom: number };

export type TapPoint = { x: number; y: number };

/** How far `value` lies outside `from`–`to`; 0 inside. */
const outside = (value: number, from: number, to: number) => (value < from ? from - value : value > to ? value - to : 0);

const isDrawn = (box: MarkBox) => box.right > box.left || box.bottom > box.top;

/**
 * The index of the mark a tap at `point` means, or null when no mark is drawn.
 *
 * Marks that share one row (every box crosses a common horizontal band: bars, a line of
 * squares) are told apart by horizontal distance alone, so a tap above or below the row
 * still picks the bar under its x. Anything else (dots on rows, a calendar grid) is
 * measured in both directions. A tap inside a box is that mark; between boxes, the
 * nearer edge wins, then the nearer centre, then the earlier mark in document order. A
 * box with no size (a mark not drawn at this width) is never picked.
 */
export const nearestMark = (point: TapPoint, boxes: readonly MarkBox[]): number | null => {
  const drawn = boxes.flatMap((box, index) => (isDrawn(box) ? [{ box, index }] : []));
  if (drawn.length === 0) return null;
  const oneRow = Math.max(...drawn.map(({ box }) => box.top)) < Math.min(...drawn.map(({ box }) => box.bottom));
  let best: { index: number; edge: number; centre: number } | null = null;
  for (const { box, index } of drawn) {
    const dx = outside(point.x, box.left, box.right);
    const dy = oneRow ? 0 : outside(point.y, box.top, box.bottom);
    const cx = point.x - (box.left + box.right) / 2;
    const cy = oneRow ? 0 : point.y - (box.top + box.bottom) / 2;
    const edge = Math.hypot(dx, dy);
    const centre = Math.hypot(cx, cy);
    if (!best || edge < best.edge || (edge === best.edge && centre < best.centre)) best = { index, edge, centre };
  }
  return best?.index ?? null;
};

/** The smallest box holding every drawn box, or null when none is drawn: a drawing's area. */
export const boxAround = (boxes: readonly MarkBox[]): MarkBox | null => {
  const drawn = boxes.filter(isDrawn);
  if (drawn.length === 0) return null;
  return {
    left: Math.min(...drawn.map((box) => box.left)),
    top: Math.min(...drawn.map((box) => box.top)),
    right: Math.max(...drawn.map((box) => box.right)),
    bottom: Math.max(...drawn.map((box) => box.bottom)),
  };
};

export const holdsPoint = (box: MarkBox, point: TapPoint) =>
  point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom;

/** About half a fingertip: the words keep this far from where the finger landed. */
const FINGER_REACH = 22;

/** The box the words must not cover: the chosen mark and the finger that chose it. */
export const clearOfFinger = (mark: MarkBox, point: TapPoint, reach = FINGER_REACH): MarkBox => ({
  left: Math.min(mark.left, point.x - reach),
  top: Math.min(mark.top, point.y - reach),
  right: Math.max(mark.right, point.x + reach),
  bottom: Math.max(mark.bottom, point.y + reach),
});

/**
 * The visible part of the window: its width and height, less the sticky chrome at the
 * top and the bottom (the page's `scroll-padding-top` and `-bottom`, which describe it).
 */
type ViewArea = { width: number; height: number; top: number; bottom: number };

/**
 * Where the words go, in viewport pixels, for a card at most `size.width` wide and
 * about `size.height` tall: above `keepClear`, the finger coming from below; under it
 * when the chrome leaves no room above; on whichever side has more room when neither
 * fits. Across, centred on what was chosen and held `gutter` inside the window's
 * edges, so it is never cut off, and narrowed to fit a window smaller than it.
 *
 * `edge` is the card's edge that faces the mark: its bottom when it sits above, its top
 * when below. Pinning that edge rather than the card's top keeps the gap to the mark
 * exact whatever the card's real height, so nothing is measured after it is drawn.
 */
export const placeMarkWords = (
  keepClear: MarkBox,
  size: { width: number; height: number },
  view: ViewArea,
  { gap = 8, gutter = 16 }: { gap?: number; gutter?: number } = {},
): { left: number; width: number; edge: number; side: "above" | "below" } => {
  const width = Math.max(0, Math.min(size.width, view.width - 2 * gutter));
  const centre = (keepClear.left + keepClear.right) / 2;
  const left = Math.max(gutter, Math.min(centre - width / 2, view.width - gutter - width));
  const above = keepClear.top - gap;
  const below = keepClear.bottom + gap;
  const floor = view.height - view.bottom;
  if (above - size.height >= view.top) return { left, width, edge: above, side: "above" };
  if (below + size.height <= floor) return { left, width, edge: below, side: "below" };
  return keepClear.top - view.top >= floor - keepClear.bottom
    ? { left, width, edge: Math.max(above, view.top + size.height), side: "above" }
    : { left, width, edge: Math.min(below, floor - size.height), side: "below" };
};

/**
 * What the link under a tapped mark says: "Open Sep 2022", the month in the short form
 * every mark's own label already uses ("Sep 2022: Stormy, held the next month"), or
 * "Open that month" for a mark that carries no month.
 */
export const openMarkLabel = (month: string | null) => {
  const [year, monthNumber] = (month ?? "").split("-").map(Number);
  return year && monthNumber ? `Open ${formatMonthLabel(year, monthNumber)}` : "Open that month";
};
