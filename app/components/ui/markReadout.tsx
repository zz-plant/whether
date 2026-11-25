"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { markMonth } from "../../../lib/monthCursor";
import {
  boxAround,
  clearOfFinger,
  holdsPoint,
  nearestMark,
  openMarkLabel,
  placeMarkWords,
  type MarkBox,
  type TapPoint,
} from "../../../lib/ui/nearestMark";
import { setPageMonth } from "../monthCursor";
import { CloseIcon } from "../uiIcons";
import { PlainActionLink } from "./actionLink";
import { CLOSE_CONTROL_CLASS } from "./closeControl";

/**
 * One readout for the marks of a small drawing: hover, keyboard focus and a tap say
 * the same words (2026-11-18).
 *
 * A mark is any descendant carrying `data-mark`, whose value is what the readout
 * prints; the mark's own `aria-label` says the same to a screen reader, so the bubble
 * is `aria-hidden`. The drawing stays a server component: this island wraps the marks
 * it is handed and listens, so a page ships no chart code, only this listener.
 *
 * - Pointer: hovering a mark shows its words over it.
 * - Keyboard: the marks are one tab stop. The drawing renders its first mark with
 *   `tabIndex={0}` and the rest with -1; arrow keys step through them
 *   in document order, Home and End jump, Enter follows a mark that is a link, and
 *   Escape clears. Ten squares or a dozen dots as ten or twelve tab stops would bury
 *   the page's controls, as the record band's 177 months would have (§XXX).
 * - Touch and pen (2026-11-25): the whole drawing is the target. A mark is a few
 *   pixels wide and a finger about forty, so a tap anywhere in the drawing chooses the
 *   mark nearest to it (`nearestMark`) and never opens anything by itself. Its words
 *   show in a small card above the finger, with a 44px link that opens it ("Open Sep
 *   2022") and a close key; a tap outside the drawing, the close key or Escape puts it
 *   away. Until then a first tap showed the words and "Tap again to open", and the
 *   second tap had to find the same few pixels.
 *
 * A mark that stands for a month lights that month across the page while it is chosen
 * (`setPageMonth`), as pointing at it does.
 *
 * No motion: the bubble and the card appear and go, they do not travel (§XXIII).
 */
type Active = {
  element: Element;
  text: string;
  /** The mark's centre and top, in the wrapper's own box. */
  x: number;
  y: number;
  /** Which edge of the bubble the mark sits under, so a mark near a screen edge keeps its bubble on screen. */
  align: "start" | "center" | "end";
};

/** Half the bubble's widest, in px: a mark closer than this to a screen edge anchors its bubble to that edge. */
const EDGE_ROOM = 136;

const markOf = (target: EventTarget | null): Element | null =>
  target instanceof Element ? target.closest("[data-mark]") : null;

const ALIGN_TRANSFORM: Record<Active["align"], string> = {
  start: "translate(-0.75rem, calc(-100% - 6px))",
  center: "translate(-50%, calc(-100% - 6px))",
  end: "translate(calc(-100% + 0.75rem), calc(-100% - 6px))",
};

/* ---- A tap on touch or pen, shared with /history's grid (historyReadout.tsx) ---- */

/** Where the last finger or pen came down in a drawing, so its click is read as a tap and not as a keyboard's Enter. */
export type MarkTapDown = TapPoint & { time: number };

/** A tap's click arrives within this long of its pointerdown; anything later, or with none, is a key or an assistive tool. */
const TAP_WINDOW_MS = 1000;

/** The pointerdown this click finishes, if a finger or pen made it. */
export const tapOf = (down: MarkTapDown | null, clickTime: number): TapPoint | null =>
  down && clickTime - down.time >= 0 && clickTime - down.time < TAP_WINDOW_MS ? { x: down.x, y: down.y } : null;

/** A control in the drawing that is not a mark (a year's link beside the grid) keeps its own tap. */
export const isOtherControl = (target: EventTarget | null) => {
  const control = target instanceof Element ? target.closest("a[href],button,input,select,textarea,summary,label") : null;
  return Boolean(control && !control.matches("[data-mark],[data-readout-text]"));
};

const boxOf = (element: Element): MarkBox => {
  const { left, top, right, bottom } = element.getBoundingClientRect();
  return { left, top, right, bottom };
};

/**
 * The mark nearest a tap, among `marks`. `withinMarks` counts only a tap inside the box
 * the marks fill, for a drawing whose wrapper also holds words around it (/history's
 * figures hold their readout line and key).
 */
export const markNearest = <T extends Element>(marks: readonly T[], point: TapPoint, withinMarks = false): T | null => {
  const boxes = marks.map(boxOf);
  const area = boxAround(boxes);
  if (withinMarks && !(area && holdsPoint(area, point))) return null;
  const index = nearestMark(point, boxes);
  return index === null ? null : (marks[index] ?? null);
};

/** A mark a tap chose, as its card shows it, placed against the box the card is drawn in. */
export type TappedMark = {
  element: Element;
  text: string;
  href: string | null;
  /** "Open Sep 2022". */
  open: string;
  month: string | null;
  /** The card's left edge, its width and the edge that faces the mark, in the card's own box. */
  left: number;
  width: number;
  edge: number;
  side: "above" | "below";
};

/** The card's widest, and the height it is placed for: its words on up to three lines, the 44px link under them. */
const CARD = { width: 320, height: 128 };

const MONTH_MARKS = "[data-month],[data-month-from],[data-month-to]";

/**
 * Chooses `element` for a tap at `point`: places its card in `origin`'s box (the box the
 * card is positioned in, read before anything is written) and lights its month on the
 * page. Reads layout once, writes none.
 */
export const chooseTappedMark = (element: Element, text: string, point: TapPoint, origin: Element): TappedMark => {
  const html = document.documentElement;
  const chrome = getComputedStyle(html);
  const view = {
    width: html.clientWidth,
    height: window.innerHeight,
    top: Number.parseFloat(chrome.scrollPaddingTop) || 0,
    bottom: Number.parseFloat(chrome.scrollPaddingBottom) || 0,
  };
  const box = origin.getBoundingClientRect();
  const left = box.left + origin.clientLeft;
  const top = box.top + origin.clientTop;
  const place = placeMarkWords(clearOfFinger(boxOf(element), point), CARD, view);
  const month = markMonth({
    month: element.getAttribute("data-month"),
    monthFrom: element.getAttribute("data-month-from"),
    monthTo: element.getAttribute("data-month-to"),
  });
  if (month) setPageMonth(month);
  return {
    element,
    text,
    href: element.closest("a[href]")?.getAttribute("href") ?? null,
    open: openMarkLabel(month),
    month,
    left: place.left - left,
    width: place.width,
    edge: place.edge - top,
    side: place.side,
  };
};

/**
 * Lets go of a tapped mark's month, unless the tap that let go landed on another month's
 * mark (that mark sets its own) or something else has set the page's month since.
 */
export const releaseTappedMonth = (tapped: TappedMark, target: EventTarget | null) => {
  if (!tapped.month || document.documentElement.dataset.activeMonth !== tapped.month) return;
  if (target instanceof Element && target.closest(MONTH_MARKS)) return;
  setPageMonth(null);
};

/**
 * The card a tap opens: the mark's words, a link that opens the mark where it is one,
 * and a close key. `scope` is the drawing: a press outside it closes the card, and so
 * does Escape. Positioned by `chooseTappedMark`, so it measures nothing.
 */
export function TappedMarkCard({
  tapped,
  scope,
  onClose,
}: {
  tapped: TappedMark;
  scope: () => Element | null;
  onClose: (target: EventTarget | null) => void;
}) {
  const card = useRef<HTMLSpanElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  /* The chosen mark is ringed while its card is open (month-active.css), so a bar five pixels wide shows which one the words name. */
  useEffect(() => {
    const chosen = tapped.element;
    chosen.setAttribute("data-mark-chosen", "");
    return () => chosen.removeAttribute("data-mark-chosen");
  }, [tapped.element]);

  useEffect(() => {
    /* Capture, as monthCursor.tsx does, so a drawing that answers the same press sets its month after this lets go. */
    const onDown = (event: globalThis.PointerEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      if (target && (card.current?.contains(target) || scope()?.contains(target))) return;
      close.current(event.target);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close.current(null);
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [scope]);

  return (
    <span
      ref={card}
      data-mark-tap-card
      /* Over the page's content and under its sticky header, which a card scrolled up to it slides beneath. */
      className="absolute z-[var(--z-raised)] flex items-start gap-1 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-panel)] py-1 pl-3 pr-0 text-left text-fluid-sm leading-snug font-normal whitespace-normal text-slate-200 tabular-nums shadow-[var(--elev-3)]"
      style={{
        left: tapped.left,
        top: tapped.edge,
        width: tapped.width,
        transform: tapped.side === "above" ? "translateY(-100%)" : undefined,
      }}
    >
      <span className="block min-w-0 flex-1 space-y-1.5 py-2">
        {/* The mark's own name says these words to a screen reader. */}
        <span aria-hidden="true" className="block">
          {tapped.text}
        </span>
        {tapped.href ? (
          <PlainActionLink href={tapped.href} variant="pill" className="min-w-11">
            {tapped.open}
          </PlainActionLink>
        ) : null}
      </span>
      <button type="button" aria-label="Close" className={CLOSE_CONTROL_CLASS} onClick={() => close.current(null)}>
        <CloseIcon />
      </button>
    </span>
  );
}

export function MarkReadout({
  children,
  label,
  as: Tag = "div",
  className = "",
}: {
  children: ReactNode;
  /** What the marks are, read before them by a screen reader: "The 10 month-ends at this distance, oldest first". Leave it out where a caption beside the drawing says it. */
  label?: string;
  /** `span` where the drawing sits in a line of text. */
  as?: "div" | "span";
  className?: string;
}) {
  const root = useRef<HTMLElement | null>(null);
  const down = useRef<MarkTapDown | null>(null);
  const [active, setActive] = useState<Active | null>(null);
  const [tapped, setTapped] = useState<TappedMark | null>(null);

  const show = (element: Element) => {
    const box = root.current?.getBoundingClientRect();
    if (!box) return;
    const rect = element.getBoundingClientRect();
    const centre = rect.left + rect.width / 2;
    const viewport = document.documentElement.clientWidth;
    setActive({
      element,
      text: element.getAttribute("data-mark") ?? "",
      x: centre - box.left,
      y: rect.top - box.top,
      align: centre < EDGE_ROOM ? "start" : centre > viewport - EDGE_ROOM ? "end" : "center",
    });
  };

  const scope = useCallback(() => root.current, []);
  const closeTapped = (target: EventTarget | null) => {
    if (tapped) releaseTappedMonth(tapped, target);
    setTapped(null);
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    down.current = event.pointerType === "mouse" ? null : { x: event.clientX, y: event.clientY, time: event.timeStamp };
  };

  /* A finger that scrolled the page made no tap. */
  const onPointerCancel = () => {
    down.current = null;
  };

  const onPointerOver = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    const mark = markOf(event.target);
    if (mark) {
      if (active?.element !== mark) show(mark);
    } else if (active) {
      setActive(null);
    }
  };

  const onPointerLeave = (event: PointerEvent<HTMLElement>) => {
    /* A finger "leaves" when it lifts; only a mouse or a pen leaving clears the bubble. */
    if (event.pointerType !== "touch") setActive(null);
  };

  /* A finger or a pen: choose the mark nearest the tap. A mouse click and a keyboard's
     Enter carry no tap (no pointerdown from either just before), so a link mark opens as
     it always did. */
  const onClick = (event: MouseEvent<HTMLElement>) => {
    const point = tapOf(down.current, event.timeStamp);
    down.current = null;
    const node = root.current;
    if (!point || !node) return;
    if (event.target instanceof Element && event.target.closest("[data-mark-tap-card]")) return;
    if (isOtherControl(event.target)) return;
    const mark = markNearest([...node.querySelectorAll("[data-mark]")], point);
    if (!mark) return;
    event.preventDefault();
    setActive(null);
    setTapped(chooseTappedMark(mark, mark.getAttribute("data-mark") ?? "", point, node));
  };

  const onFocus = (event: FocusEvent<HTMLElement>) => {
    const mark = markOf(event.target);
    if (mark && active?.element !== mark) show(mark);
  };

  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (event.relatedTarget instanceof Node && root.current?.contains(event.relatedTarget)) return;
    setActive(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      setActive(null);
      return;
    }
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step && event.key !== "Home" && event.key !== "End") return;
    const mark = markOf(event.target);
    if (!mark || !root.current) return;
    const marks = [...root.current.querySelectorAll("[data-mark][tabindex]")];
    const index = marks.indexOf(mark);
    const next = event.key === "Home" ? 0 : event.key === "End" ? marks.length - 1 : index + step;
    const target = marks[next];
    if (index === -1 || !target || !(target instanceof HTMLElement || target instanceof SVGElement)) return;
    event.preventDefault();
    for (const each of marks) each.setAttribute("tabindex", each === target ? "0" : "-1");
    target.focus();
  };

  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        root.current = node;
      }}
      data-mark-readout
      className={`relative ${className}`.trim()}
      onPointerDown={onPointerDown}
      onPointerCancel={onPointerCancel}
      onPointerOver={onPointerOver}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    >
      {/* The marks' name, read before them: a group role on a span or div is not allowed to carry it. */}
      {label ? <span className="sr-only select-none">{label}</span> : null}
      {children}
      {active?.text && !tapped ? (
        <span
          aria-hidden="true"
          data-mark-readout-bubble
          className="pointer-events-none absolute z-[var(--z-menu)] block w-max select-none max-w-[16rem] rounded-md bg-[var(--app-text)] px-2 py-1 text-left text-xs font-normal leading-snug whitespace-normal text-[var(--bg-body)] tabular-nums"
          style={{ left: active.x, top: active.y, transform: ALIGN_TRANSFORM[active.align] }}
        >
          {active.text}
        </span>
      ) : null}
      {tapped ? <TappedMarkCard tapped={tapped} scope={scope} onClose={closeTapped} /> : null}
    </Tag>
  );
}
