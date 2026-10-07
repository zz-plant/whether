"use client";

import { useCallback, useEffect, useState } from "react";
import { isTypingTarget } from "./KeyboardShortcuts";
import { PresentationFrames } from "./presentationFrames";

/**
 * Whether a keydown toggles focus mode: ⌘⇧S or Ctrl+⇧S from anywhere, or F with
 * no ⌘, Ctrl or Alt held, from anywhere that does not take typing.
 *
 * F used to ignore the modifiers, so ⌘F and Ctrl+F — the browser's find-in-page —
 * opened the presentation and had their default prevented: on the brief, find
 * never opened. Alt+F is the browser's menu on Windows and Linux. Shift stays
 * allowed, as it does for the route keys; ⇧F is bound to nothing else.
 */
export const isFocusModeShortcut = (
  event: Pick<KeyboardEvent, "key" | "shiftKey" | "metaKey" | "ctrlKey" | "altKey">,
  typing: boolean,
): boolean => {
  const key = event.key.toLowerCase();
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && key === "s") return true;
  return key === "f" && !event.metaKey && !event.ctrlKey && !event.altKey && !typing;
};

export function FocusModeController() {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const exitFocusMode = useCallback(() => setIsFocusMode(false), []);

  /* The mode is one attribute on the document, read by a rule in
     layout-shells.css that narrows the brief's measure. This used to rewrite
     `className` on the `<main>` that `Shell` renders — one component owning
     another's DOM node, with the default class list copied here so it could be
     put back. An attribute is state the stylesheet reads; nothing is copied. */
  useEffect(() => {
    if (isFocusMode) {
      document.documentElement.setAttribute("data-focus-mode", "true");
    } else {
      document.documentElement.removeAttribute("data-focus-mode");
    }
    return () => document.documentElement.removeAttribute("data-focus-mode");
  }, [isFocusMode]);

  useEffect(() => {
    const handleToggle = () => setIsFocusMode((value) => !value);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isFocusModeShortcut(event, isTypingTarget(event.target))) {
        event.preventDefault();
        setIsFocusMode((value) => !value);
      } else if (event.key === "Escape") {
        setIsFocusMode(false);
      }
    };

    document.addEventListener("whether:toggle-focus-mode", handleToggle);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("whether:toggle-focus-mode", handleToggle);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!isFocusMode) return null;

  /* The mode has always been called presentation focus mode and has always
     only restyled the page. `PresentationFrames` is the presentation: the
     call, the decisions that reopen, and what would flip it, one frame at a
     time. It renders nothing on a route that publishes no brief, which
     leaves the narrowed measure as the reading mode it was. The frames carry
     their own exit, and Esc leaves either way; the fixed badge that used to
     announce the mode in its own name has gone with the class rewrite. */
  return <PresentationFrames onExit={exitFocusMode} />;
}
