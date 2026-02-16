import type { KeyboardEvent as ReactKeyboardEvent } from "react";

export type DirectionalFocusOptions = {
  selector?: string;
  strategy?: "linear" | "spatial";
  wrap?: boolean;
};

type FocusDirection = "up" | "down" | "left" | "right";

type FocusRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
};

const defaultSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

const directionMap: Record<string, FocusDirection | null> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const centerX = (rect: FocusRect) => (rect.left + rect.right) / 2;
const centerY = (rect: FocusRect) => (rect.top + rect.bottom) / 2;

const isVisible = (element: HTMLElement) => {
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden";
};

const isTextInput = (element: Element | null) => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.isContentEditable
  );
};

const getDirectionalScore = (current: FocusRect, candidate: FocusRect, direction: FocusDirection) => {
  const dx = centerX(candidate) - centerX(current);
  const dy = centerY(candidate) - centerY(current);
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (direction === "up") {
    if (dy >= 0) {
      return Number.POSITIVE_INFINITY;
    }

    return absDy * 2 + absDx;
  }

  if (direction === "down") {
    if (dy <= 0) {
      return Number.POSITIVE_INFINITY;
    }

    return absDy * 2 + absDx;
  }

  if (direction === "left") {
    if (dx >= 0) {
      return Number.POSITIVE_INFINITY;
    }

    return absDx * 2 + absDy;
  }

  if (dx <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  return absDx * 2 + absDy;
};

export const getNextDirectionalIndex = ({
  currentIndex,
  rects,
  direction,
  wrap = false,
}: {
  currentIndex: number;
  rects: FocusRect[];
  direction: FocusDirection;
  wrap?: boolean;
}) => {
  if (rects.length === 0 || currentIndex < 0 || currentIndex >= rects.length) {
    return -1;
  }

  const currentRect = rects[currentIndex];
  let bestIndex = -1;
  let bestScore = Number.POSITIVE_INFINITY;

  rects.forEach((rect, index) => {
    if (index === currentIndex) {
      return;
    }

    const score = getDirectionalScore(currentRect, rect, direction);
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  if (bestIndex >= 0 || !wrap) {
    return bestIndex;
  }

  if (direction === "up") {
    return rects.reduce((selected, rect, index) => (rect.top < rects[selected].top ? index : selected), 0);
  }

  if (direction === "down") {
    return rects.reduce((selected, rect, index) => (rect.bottom > rects[selected].bottom ? index : selected), 0);
  }

  if (direction === "left") {
    return rects.reduce((selected, rect, index) => (rect.left < rects[selected].left ? index : selected), 0);
  }

  return rects.reduce((selected, rect, index) => (rect.right > rects[selected].right ? index : selected), 0);
};

export const handleDirectionalFocus = (
  event: KeyboardEvent | ReactKeyboardEvent,
  container: HTMLElement,
  options: DirectionalFocusOptions = {},
) => {
  const key = event.key;
  const direction = directionMap[key];
  const isBackward = key === "ArrowLeft" || key === "ArrowUp";
  const isForward = key === "ArrowRight" || key === "ArrowDown";

  if (!direction) {
    return;
  }

  if (isTextInput(event.target as Element) && (key === "ArrowLeft" || key === "ArrowRight")) {
    return;
  }

  const selector = options.selector ?? defaultSelector;
  const strategy = options.strategy ?? "spatial";
  const wrap = options.wrap ?? false;
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (item) =>
      !item.hasAttribute("disabled") &&
      item.getAttribute("aria-hidden") !== "true" &&
      isVisible(item),
  );

  if (nodes.length === 0) {
    return;
  }

  const active = document.activeElement as HTMLElement | null;
  const currentIndex = active ? nodes.indexOf(active) : -1;

  if (currentIndex === -1) {
    if (isForward || wrap) {
      event.preventDefault();
      const fallbackIndex = direction === "up" || direction === "left" ? nodes.length - 1 : 0;
      nodes[fallbackIndex]?.focus();
    }
    return;
  }

  const nextIndex =
    strategy === "linear"
      ? isForward
        ? Math.min(nodes.length - 1, currentIndex + 1)
        : Math.max(0, currentIndex - 1)
      : getNextDirectionalIndex({
          currentIndex,
          direction,
          wrap,
          rects: nodes.map((node) => node.getBoundingClientRect()),
        });

  if (nextIndex >= 0 && nextIndex !== currentIndex) {
    event.preventDefault();
    nodes[nextIndex]?.focus();
  }
};
