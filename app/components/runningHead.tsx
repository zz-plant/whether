"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  isPastHero,
  readFrameFacts,
  runningHeadSection,
  sameFrameFacts,
  type FrameFacts,
} from "../../lib/navigation/runningHead";
import { siteUrl } from "../../lib/siteUrl";

export const MASTHEAD_SITE_HOST = new URL(siteUrl).host;

/** The date inside a phrase like "Week of Oct 19, 2026" or "Last completed month: Sep 30, 2026". */
export const MASTHEAD_DATE_IN_WORDS = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? \d{1,2}, \d{4}/;

type MastheadSectionTarget = {
  id: string;
  label: string;
};

type MastheadReadingState = {
  facts: FrameFacts | null;
  section: string | null;
  sections: readonly MastheadSectionTarget[];
  sectionStep: string | null;
  pastHero: boolean;
};

const sameSections = (
  a: readonly MastheadSectionTarget[],
  b: readonly MastheadSectionTarget[],
): boolean =>
  a.length === b.length && a.every((item, index) => item.id === b[index]?.id && item.label === b[index]?.label);

const resolveSectionId = (heading: HTMLElement): string | null => {
  if (heading.id && heading.id !== "main-content") return heading.id;
  const section = heading.closest<HTMLElement>("[id]");
  if (section?.id && section.id !== "main-content") return section.id;
  return null;
};

/**
 * Reads the current route's `[data-frame-facts]`, visible `main h2` sections,
 * J/K step count, and whether the intro/hero has scrolled past the masthead.
 *
 * Powers the single morphing sticky masthead (`GlobalHeaderRouteGate`), so the
 * header and the running head never stack as two separate sticky bars on scroll.
 */
export function useMastheadReading(pathname: string): MastheadReadingState {
  const [facts, setFacts] = useState<FrameFacts | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [sections, setSections] = useState<readonly MastheadSectionTarget[]>([]);
  const [sectionJump, setSectionJump] = useState<{ path: string | null; label: string } | null>(null);
  const [pastHero, setPastHero] = useState(false);

  const sectionStep = sectionJump && sectionJump.path === pathname ? sectionJump.label : null;

  useEffect(() => {
    const onSectionJump = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail = event.detail;
      if (
        detail &&
        typeof detail === "object" &&
        "index" in detail &&
        "total" in detail &&
        typeof detail.index === "number" &&
        typeof detail.total === "number"
      ) {
        setSectionJump({ path: pathname, label: `${detail.index}/${detail.total}` });
      }
    };
    document.addEventListener("whether-section-jump", onSectionJump);
    return () => document.removeEventListener("whether-section-jump", onSectionJump);
  }, [pathname]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const header = document.querySelector("header");
      const headerBottom = header ? Math.max(48, header.getBoundingClientRect().bottom) : 48;
      const source = document.querySelector<HTMLElement>("[data-frame-facts]");
      const title = document.querySelector("main h1")?.textContent?.trim() ?? null;

      const nextFacts = readFrameFacts(source, title);
      setFacts((previous) => (previous && sameFrameFacts(previous, nextFacts) ? previous : nextFacts));

      const anchor = source ?? document.querySelector("main h1");
      setPastHero(
        isPastHero({
          scrollY: window.scrollY,
          anchorTop: anchor ? anchor.getBoundingClientRect().top : null,
          headerBottom,
        }),
      );

      const visibleHeadings = [...document.querySelectorAll<HTMLElement>("main h2")].filter(
        (heading) =>
          heading.getClientRects().length > 0 &&
          !heading.closest(".sr-only, details:not([open]) > :not(summary)"),
      );

      const headingMetrics = visibleHeadings.map((heading) => ({
        label: heading.textContent?.trim() ?? "",
        top: heading.getBoundingClientRect().top,
      }));
      setSection(runningHeadSection(headingMetrics, headerBottom + 48));

      const seenIds = new Set<string>();
      const nextTargets: MastheadSectionTarget[] = [];
      for (const heading of visibleHeadings) {
        const label = heading.textContent?.trim() ?? "";
        const id = resolveSectionId(heading);
        if (!label || !id || seenIds.has(id)) continue;
        seenIds.add(id);
        nextTargets.push({ id, label });
      }
      setSections((previous) => (sameSections(previous, nextTargets) ? previous : nextTargets));
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    /* The brief streams its card in after hydration and the web fonts land after that,
       so the mount measurement can see a page that is not laid out yet. Re-measure when
       the document's box changes, and once the fonts are ready; both are equality-guarded
       upstream, so a settled page stops re-rendering. */
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(document.documentElement);
    void document.fonts?.ready.then(schedule);

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  return { facts, section, sections, sectionStep, pastHero };
}

/**
 * Compact in-masthead section jumper (popover="auto").
 * Replaces the sticky mobile horizontal chip scroller on report routes so phones
 * never stack two underline tab bars on top of each other.
 */
export function MastheadSectionJumper({
  currentLabel,
  sections,
}: {
  currentLabel: string;
  sections: readonly MastheadSectionTarget[];
}) {
  const reactId = useId();
  const popoverId = `masthead-sections-${reactId.replace(/:/g, "")}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const positionFallback = useCallback(() => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;
    if (typeof CSS !== "undefined" && CSS.supports("position-area", "block-end")) return;
    const triggerRect = trigger.getBoundingClientRect();
    const popRect = popover.getBoundingClientRect();
    const margin = 8;
    const top = Math.min(window.innerHeight - popRect.height - margin, triggerRect.bottom + 6);
    const left = Math.max(margin, Math.min(triggerRect.left, window.innerWidth - popRect.width - margin));
    popover.style.top = `${Math.max(margin, top)}px`;
    popover.style.left = `${left}px`;
  }, []);

  useEffect(() => {
    const popover = popoverRef.current;
    if (!popover) return;
    const onToggle = (event: Event) => {
      const isOpen = Reflect.get(event, "newState") === "open";
      setOpen(isOpen);
      if (isOpen) positionFallback();
    };
    popover.addEventListener("toggle", onToggle);
    return () => popover.removeEventListener("toggle", onToggle);
  }, [positionFallback]);

  const closePopover = useCallback(() => {
    const popover = popoverRef.current;
    if (!popover || typeof popover.hidePopover !== "function") return;
    try {
      if (popover.matches(":popover-open")) popover.hidePopover();
    } catch {
      // Ignore if already closed or unsupported.
    }
  }, []);

  if (sections.length < 2) {
    return <span className="min-w-0 truncate text-[var(--app-text-secondary)]">{currentLabel}</span>;
  }

  return (
    <span className="inline-flex min-w-0 items-center">
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={popoverId}
        aria-controls={popoverId}
        aria-expanded={open}
        aria-label={`Jump to section, current: ${currentLabel}`}
        className="weather-focus-ring inline-flex min-h-11 min-w-0 max-w-full items-center gap-1 rounded-md px-1.5 text-fluid-nano font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--bg-nested)] md:min-h-9"
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown
          aria-hidden="true"
          size={13}
          strokeWidth={2}
          className={`shrink-0 text-[var(--app-text-muted)] transition-transform duration-150 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        ref={popoverRef}
        id={popoverId}
        popover="auto"
        className="site-section-popover"
        data-masthead-section-menu
      >
        <p className="px-2.5 py-1 type-eyebrow">On this page</p>
        <nav aria-label="Jump to section" className="flex flex-col gap-0.5">
          {sections.map((item) => {
            const isCurrent = item.label === currentLabel;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                aria-current={isCurrent ? "location" : undefined}
                onClick={closePopover}
                className="site-nav-popover-link"
              >
                <span className="truncate">{item.label}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </span>
  );
}
