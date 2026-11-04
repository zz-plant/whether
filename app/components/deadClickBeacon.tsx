"use client";

import { useEffect } from "react";
import { trackDeadClick, type DeadClickKind } from "../../lib/deadClickTelemetry";
import { pageSectionOf } from "../../lib/telemetry/pageSection";

/*
 * Reports a click that did nothing on something that looked as if it would
 * (`lib/deadClickTelemetry.ts`). Mounted once, in the root layout.
 *
 * A click counts when nothing under the pointer is a control — no link, button,
 * summary, form field, ARIA widget, focusable element or React click handler — and
 * no popover or menu was open for the click to close. Of those, only clicks on
 * something with a look of its own are sent (a chart, a bordered stamp, a glyph, a
 * hover title, a heading, a table cell), once per section and kind; a click on anything
 * else only as part of a rapid burst on one spot, once per burst. At most a
 * handful per page view.
 */
const INTERACTIVE =
  'a[href],button,summary,label,input,select,textarea,[contenteditable="true"],[role="button"],[role="link"],[role="tab"],[role="menuitem"],[role="checkbox"],[role="radio"],[role="switch"],[role="option"],[tabindex]:not([tabindex="-1"])';

const MAX_EVENTS_PER_PAGE = 8;
const RAGE_WINDOW_MS = 1000;
const RAGE_RADIUS_PX = 30;
const RAGE_CLICKS = 3;

/* React attaches its handlers at the root, so a `div` with `onClick` looks inert to the DOM. */
const hasReactClickHandler = (element: Element): boolean => {
  for (let node: Element | null = element; node && node !== document.body; node = node.parentElement) {
    const key = Object.keys(node).find((candidate) => candidate.startsWith("__reactProps"));
    const props: unknown = key ? Reflect.get(node, key) : null;
    if (props && typeof props === "object" && ("onClick" in props || "onPointerDown" in props || "onMouseDown" in props)) return true;
  }
  return false;
};

const classify = (element: Element): DeadClickKind | null => {
  /* An icon-sized picture is a glyph; anything larger is a chart. */
  const picture = element.closest("svg");
  if (picture) {
    const box = picture.getBoundingClientRect();
    return box.width <= 32 && box.height <= 32 ? "glyph" : "chart";
  }
  if (element.closest("canvas, [data-month-strip]")) return "chart";
  if (element.closest("[title]")) return "hover-title";
  for (let node: Element | null = element, depth = 0; node && depth < 3; node = node.parentElement, depth += 1) {
    const style = getComputedStyle(node);
    const box = node.getBoundingClientRect();
    if (parseFloat(style.borderTopWidth) > 0 && parseFloat(style.borderTopLeftRadius) >= 2 && box.width < 260 && box.height <= 40) return "stamp";
  }
  if (element.closest("h1, h2, h3, h4")) return "heading";
  if (element.closest("td, th")) return "table-cell";
  return null;
};


const pointerOf = (event: MouseEvent) => {
  const type = event instanceof PointerEvent ? event.pointerType : "mouse";
  return type === "touch" || type === "pen" ? type : "mouse";
};

/* Something a click outside would close. Read at pointer-down: a popover closes on it,
   before the click arrives, and the click that closed it did what it was for. */
const somethingOpen = () => {
  try {
    return document.querySelector(":popover-open, dialog[open], [aria-expanded='true'][aria-haspopup]") !== null;
  } catch {
    return document.querySelector("dialog[open], [aria-expanded='true'][aria-haspopup]") !== null;
  }
};

export function DeadClickBeacon() {
  useEffect(() => {
    let sent = 0;
    const seen = new Set<string>();
    const recent: { x: number; y: number; at: number }[] = [];
    let rageReported = false;
    let openAtPointerDown = false;

    const onPointerDown = () => {
      openAtPointerDown = somethingOpen();
    };

    const onClick = (event: MouseEvent) => {
      /* Keyboard activation reports detail 0, and only reaches controls. */
      if (event.detail === 0 || sent >= MAX_EVENTS_PER_PAGE || openAtPointerDown) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest(INTERACTIVE) || hasReactClickHandler(target)) return;
      /* A selection drag did what it was for. */
      if ((window.getSelection()?.toString() ?? "") !== "") return;
      const path = window.location.pathname;
      if (!/^\/[\w\-/.]{0,200}$/.test(path)) return;

      const now = event.timeStamp;
      while (recent.length > 0 && now - (recent.at(0)?.at ?? now) > RAGE_WINDOW_MS) recent.shift();
      recent.push({ x: event.clientX, y: event.clientY, at: now });
      const rage = recent.filter((click) => Math.hypot(click.x - event.clientX, click.y - event.clientY) <= RAGE_RADIUS_PX).length >= RAGE_CLICKS;
      const section = pageSectionOf(target);
      const send = (kind: DeadClickKind) => {
        sent += 1;
        trackDeadClick({ type: "dead_click", path, section, kind, rage, pointer: pointerOf(event) });
      };

      if (rage) {
        if (!rageReported) send(classify(target) ?? "other");
        rageReported = true;
        return;
      }
      rageReported = false;
      const kind = classify(target);
      if (!kind || seen.has(`${section}|${kind}`)) return;
      seen.add(`${section}|${kind}`);
      send(kind);
    };

    document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
      document.removeEventListener("click", onClick);
    };
  }, []);

  return null;
}
