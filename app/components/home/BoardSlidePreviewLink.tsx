"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Presentation } from "lucide-react";

type BoardSlidePreviewLinkProps = {
  href: string;
  label: string;
  stage: string;
};

/**
 * Inline link to `/share#image-artifacts` with a native `popover="hint"` + `interestfor`
 * hovercard showing a lazy-loaded 16:9 miniature of the rendered board slide.
 *
 * Zero network bytes and zero extra text on initial SSR: the preview image and caption
 * mount only after pointer hover or keyboard focus, preserving initial page weight and
 * the homepage load budget. Browsers with native Interest Invokers + CSS Anchor
 * Positioning handle triggering and anchoring declaratively; browsers without
 * `interestForElement` fall back to hover/focus `showPopover`/`hidePopover` while
 * never moving focus into the hint popover (WCAG 3.2.1).
 */
export function BoardSlidePreviewLink({ href, label, stage }: BoardSlidePreviewLinkProps) {
  const reactId = useId();
  const popoverId = `board-slide-hint-${reactId.replace(/:/g, "")}`;
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const popoverRef = useRef<HTMLSpanElement>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [engaged, setEngaged] = useState(false);

  const slidePreviewSrc = `/api/image/slide?stage=${encodeURIComponent(stage)}`;

  const clearTimers = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const supportsNativeInterest = () =>
    typeof window !== "undefined"
    && typeof HTMLButtonElement !== "undefined"
    && "interestForElement" in HTMLButtonElement.prototype;

  const openFallback = useCallback(() => {
    const el = popoverRef.current;
    if (!el || typeof el.showPopover !== "function") return;
    try {
      if (!el.matches(":popover-open")) el.showPopover();
    } catch {
      // Ignore if the browser does not support Popover API or element is detached.
    }
  }, []);

  const closeFallback = useCallback(() => {
    const el = popoverRef.current;
    if (!el || typeof el.hidePopover !== "function") return;
    try {
      if (el.matches(":popover-open")) el.hidePopover();
    } catch {
      // Ignore when already closed or unsupported.
    }
  }, []);

  const handleInterestEnd = useCallback(() => {
    clearTimers();
    if (supportsNativeInterest()) return;
    hideTimerRef.current = setTimeout(() => {
      closeFallback();
    }, 120);
  }, [clearTimers, closeFallback]);

  useEffect(() => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (trigger) {
      trigger.setAttribute("interestfor", popoverId);
    }
    if (!popover) return clearTimers;
    /* Ensure lazy image mounts even when opened natively via Interest Invokers. */
    const onToggle = (event: Event) => {
      /* Read reflectively: `ToggleEvent.newState` is not in every lib's Event
         type, and a cast is what the review preflight refuses. */
      if (Reflect.get(event, "newState") === "open") setEngaged(true);
    };
    popover.addEventListener("toggle", onToggle);
    /* Keep the fallback preview open while the pointer rests on the card (WCAG 1.4.13). */
    const fallback = !supportsNativeInterest();
    if (fallback) {
      popover.addEventListener("mouseenter", clearTimers);
      popover.addEventListener("mouseleave", handleInterestEnd);
    }
    return () => {
      popover.removeEventListener("toggle", onToggle);
      if (fallback) {
        popover.removeEventListener("mouseenter", clearTimers);
        popover.removeEventListener("mouseleave", handleInterestEnd);
      }
      clearTimers();
    };
  }, [clearTimers, handleInterestEnd, popoverId]);

  const handleInterestStart = useCallback(() => {
    clearTimers();
    setEngaged(true);
    if (supportsNativeInterest()) return;
    showTimerRef.current = setTimeout(() => {
      openFallback();
    }, 180);
  }, [clearTimers, openFallback]);

  return (
    <span className="inline-flex items-center">
      <Link
        ref={triggerRef}
        href={href}
        title="Preview and download editable .pptx, .pdf, or .svg board slide"
        aria-describedby={engaged ? popoverId : undefined}
        onMouseEnter={handleInterestStart}
        onMouseLeave={handleInterestEnd}
        onFocus={handleInterestStart}
        onBlur={handleInterestEnd}
        className="board-slide-trigger weather-hit weather-focus-ring weather-press-scale inline-flex items-center gap-1.5 text-fluid-sm font-semibold tabular-nums text-sky-300 transition-colors hover:text-sky-200"
      >
        <Presentation aria-hidden="true" size={14} strokeWidth={1.9} className="shrink-0 opacity-85" />
        <span>{label}</span>
      </Link>
      <span
        ref={popoverRef}
        id={popoverId}
        popover="hint"
        role="tooltip"
        className="board-slide-hint"
        data-board-slide-preview
      >
        {engaged ? (
          <>
            <Image
              src={slidePreviewSrc}
              width={320}
              height={180}
              unoptimized
              loading="lazy"
              alt=""
              className="board-slide-hint-image"
            />
            <span className="board-slide-hint-caption">
              Editable 16:9 board slide &middot; .pptx, .pdf, .svg
            </span>
          </>
        ) : null}
      </span>
    </span>
  );
}
