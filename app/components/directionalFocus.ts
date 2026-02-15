import type { KeyboardEvent as ReactKeyboardEvent } from "react";

export type DirectionalFocusOptions = {
  selector?: string;
};

const defaultSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

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

export const handleDirectionalFocus = (
  event: KeyboardEvent | ReactKeyboardEvent,
  container: HTMLElement,
  options: DirectionalFocusOptions = {},
) => {
  const key = event.key;
  const isBackward = key === "ArrowLeft" || key === "ArrowUp";
  const isForward = key === "ArrowRight" || key === "ArrowDown";

  if (!isBackward && !isForward) {
    return;
  }

  if (isTextInput(event.target as Element) && (key === "ArrowLeft" || key === "ArrowRight")) {
    return;
  }

  const selector = options.selector ?? defaultSelector;
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (item) => !item.hasAttribute("disabled") && item.getAttribute("aria-hidden") !== "true",
  );

  if (nodes.length === 0) {
    return;
  }

  const active = document.activeElement as HTMLElement | null;
  const currentIndex = active ? nodes.indexOf(active) : -1;

  if (currentIndex === -1) {
    if (isForward) {
      event.preventDefault();
      nodes[0]?.focus();
    }
    return;
  }

  const nextIndex = isForward
    ? Math.min(nodes.length - 1, currentIndex + 1)
    : Math.max(0, currentIndex - 1);

  if (nextIndex !== currentIndex) {
    event.preventDefault();
    nodes[nextIndex]?.focus();
  }
};
