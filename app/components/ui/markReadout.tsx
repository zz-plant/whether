"use client";

import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

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
 * - Touch: a mark is a few pixels wide, so the first tap on a linked mark shows its
 *   words and says a second tap opens it; a tap anywhere else clears. A tap that
 *   navigated at once would open a month the reader could not see they had hit.
 *
 * No motion: the bubble appears and goes, it does not travel (§XXIII).
 */
type Active = {
  element: Element;
  text: string;
  /** The mark's centre and top, in the wrapper's own box. */
  x: number;
  y: number;
  /** Which edge of the bubble the mark sits under, so a mark near a screen edge keeps its bubble on screen. */
  align: "start" | "center" | "end";
  /** Shown by a tap: a second tap on the same linked mark follows it. */
  touch: boolean;
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
  const pointerType = useRef<string>("mouse");
  const [active, setActive] = useState<Active | null>(null);

  const show = (element: Element, touch: boolean) => {
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
      touch,
    });
  };

  /* A tap outside the drawing clears what a tap showed. Mouse and keyboard clear on leaving. */
  useEffect(() => {
    if (!active?.touch) return undefined;
    const clear = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && root.current?.contains(event.target)) return;
      setActive(null);
    };
    document.addEventListener("pointerdown", clear);
    return () => document.removeEventListener("pointerdown", clear);
  }, [active?.touch]);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    pointerType.current = event.pointerType;
  };

  const onPointerOver = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    const mark = markOf(event.target);
    if (mark) {
      if (active?.element !== mark) show(mark, false);
    } else if (active && !active.touch) {
      setActive(null);
    }
  };

  const onPointerLeave = (event: PointerEvent<HTMLElement>) => {
    /* A finger "leaves" when it lifts; only a mouse leaving clears. */
    if (event.pointerType !== "touch" && !active?.touch) setActive(null);
  };

  const onClick = (event: MouseEvent<HTMLElement>) => {
    if (pointerType.current !== "touch") return;
    const mark = markOf(event.target);
    if (!mark) return;
    if (active?.element === mark && active.touch) return;
    if (mark.closest("a")) event.preventDefault();
    show(mark, true);
  };

  const onFocus = (event: FocusEvent<HTMLElement>) => {
    const mark = markOf(event.target);
    if (mark && active?.element !== mark) show(mark, false);
  };

  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (event.relatedTarget instanceof Node && root.current?.contains(event.relatedTarget)) return;
    if (!active?.touch) setActive(null);
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

  const linked = active ? Boolean(active.element.closest("a")) : false;
  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        root.current = node;
      }}
      data-mark-readout
      className={`relative ${className}`.trim()}
      onPointerDown={onPointerDown}
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
      {active?.text ? (
        <span
          aria-hidden="true"
          data-mark-readout-bubble
          className="pointer-events-none absolute z-[var(--z-menu)] block w-max select-none max-w-[16rem] rounded-md bg-[var(--app-text)] px-2 py-1 text-left text-xs font-normal leading-snug whitespace-normal text-[var(--bg-body)] tabular-nums"
          style={{ left: active.x, top: active.y, transform: ALIGN_TRANSFORM[active.align] }}
        >
          {active.text}
          {active.touch && linked ? <span className="block opacity-80">Tap again to open</span> : null}
        </span>
      ) : null}
    </Tag>
  );
}
