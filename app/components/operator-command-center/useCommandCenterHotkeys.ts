"use client";

import { useEffect, type MutableRefObject } from "react";

const isTextInputTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
};

export function useCommandCenterHotkeys({
  commandCenterRef,
  searchInputRef,
  queryRef,
  isExpanded,
  isExpandedRef,
  expand,
  collapse,
  setQuery,
}: {
  commandCenterRef: MutableRefObject<HTMLElement | null>;
  searchInputRef: MutableRefObject<HTMLInputElement | null>;
  queryRef: MutableRefObject<string>;
  isExpanded: boolean;
  isExpandedRef: MutableRefObject<boolean>;
  expand: () => void;
  collapse: () => void;
  setQuery: (value: string) => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (isTextInputTarget(event.target)) {
          return;
        }

        event.preventDefault();
        if (!isExpandedRef.current) {
          expand();
        }
        searchInputRef.current?.focus();
      }

      if (event.key === "Escape" && document.activeElement === searchInputRef.current) {
        setQuery("");
      }

      if (event.key === "Backspace" && document.activeElement === searchInputRef.current && queryRef.current.length === 0) {
        collapse();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [collapse, expand, isExpandedRef, queryRef, searchInputRef, setQuery]);

  useEffect(() => {
    if (!isExpanded || !commandCenterRef.current) {
      return;
    }

    const isTvMode = document.documentElement.dataset.displayMode === "tv";
    if (!isTvMode) {
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement && commandCenterRef.current.contains(activeElement)) {
      return;
    }

    const firstFocusable = commandCenterRef.current.querySelector<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    firstFocusable?.focus();
  }, [commandCenterRef, isExpanded]);
}
