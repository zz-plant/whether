"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { readFrameFacts, runningHeadSection, type FrameFacts } from "../../lib/navigation/runningHead";
import { useScrollDirection } from "./useScrollDirection";

/**
 * The running head: one line at the top of the screen, once a page's own intro has
 * scrolled away, naming the site, the conditions, the date and the section on screen.
 *
 * Why it exists (2026-10-27): a phone screenshot is the whole screen at wherever the
 * reader stopped, and that picture is what reaches Slack. The header hides on scroll
 * down, so a frame audit of eleven routes found 7 of 83 frames past the first screen
 * naming the site, a date and the conditions; the rest were a page with no source and
 * no week. A printed page solves this with a running head. This is that.
 *
 * It reads its facts from the page rather than taking props, because the layout mounts
 * it beside the header and the pages that know the week are three different shells: an
 * element marked `data-frame-facts` (the report intro, the brief's card, a reading
 * page's header) carries them, and its leaving the screen is when this appears. A page
 * that marks nothing still gets the site and its own h1.
 *
 * It follows the header: under it while the header shows, in its place once the header
 * slides away, by transform on the header's curve. `--running-head-height` on the root
 * tells the sticky rows below it (section chips, the report rail) where to stop.
 */
export function RunningHead() {
  const pathname = usePathname();
  const [facts, setFacts] = useState<FrameFacts | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const { direction, isPastThreshold } = useScrollDirection();
  const headerHidden = isPastThreshold && direction === "down";

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const header = document.querySelector("header");
      const headerBottom = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
      const source = document.querySelector<HTMLElement>("[data-frame-facts]");
      const title = document.querySelector("main h1")?.textContent?.trim() ?? null;
      setFacts(readFrameFacts(source, title));
      setHeaderHeight(header?.getBoundingClientRect().height ?? 0);
      // The intro, or failing that the page's h1, has left the screen.
      const anchor = source ?? document.querySelector("main h1");
      setShown(anchor ? anchor.getBoundingClientRect().bottom < headerBottom : window.scrollY > 240);
      const headings = [...document.querySelectorAll<HTMLElement>("main h2")]
        .filter((heading) => heading.getClientRects().length > 0 && !heading.closest(".sr-only, details:not([open]) > :not(summary)"))
        .map((heading) => ({ label: heading.textContent?.trim() ?? "", top: heading.getBoundingClientRect().top }));
      setSection(runningHeadSection(headings, headerBottom + 48));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  const visible = shown && facts !== null;
  const twoLines = Boolean(facts?.call);
  useEffect(() => {
    // The bar is 2rem tall, a second line on a phone brief adds 1.75rem.
    const height = !visible ? "0px" : twoLines && window.innerWidth < 768 ? "3.75rem" : "2rem";
    document.documentElement.style.setProperty("--running-head-height", height);
  }, [visible, twoLines]);

  if (!visible || !facts) return null;

  const offset = headerHidden ? 0 : headerHeight;
  const place = section ?? facts.title;
  return (
    <div
      data-running-head
      data-regime={facts.regime ?? undefined}
      className="fixed inset-x-0 top-0 z-40 border-b border-[color:var(--border-subtle)] bg-[var(--bg-body)]/95 backdrop-blur transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none print:hidden"
      style={{ transform: `translateY(${offset}px)` }}
    >
      <div className="mx-auto flex h-8 max-w-[96rem] items-center gap-2 px-7 text-fluid-nano leading-none text-slate-400">
        <p aria-hidden="true" className="flex min-w-0 flex-1 items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-300">
            <path d="M2 14c3-5 6-5 9 0s6 5 9 0" />
          </svg>
          <span className="shrink-0 font-semibold text-slate-100">Whether</span>
          {facts.condition ? (
            <span className="type-stamp shrink-0 font-semibold" style={{ color: "var(--regime-ink)" }}>
              {facts.condition}
            </span>
          ) : null}
          {facts.date ? <span className="shrink-0 tabular-nums">{facts.date}</span> : null}
          {place ? (
            <span className="min-w-0 truncate text-slate-300">
              {/* From md the brief leads with its call, which the strip at the foot no longer prints. */}
              {facts.call ? (
                <span className="font-medium text-slate-100 max-md:hidden">{facts.call} · </span>
              ) : facts.title && place !== facts.title ? (
                <span className="max-md:hidden">{facts.title} · </span>
              ) : null}
              {place}
            </span>
          ) : null}
        </p>
        <span aria-hidden="true" className="shrink-0 max-sm:hidden">whether.work</span>
      </div>
      {facts.call ? (
        /* The brief's own line on a phone: the call, which is what a screenshot of the
           brief is for, and the jump to what it changes. The desktop brief keeps its
           floating strip for both. */
        <div className="mx-auto flex h-7 max-w-[96rem] items-center gap-2 px-7 pb-1 text-fluid-xs md:hidden">
          <span aria-hidden="true" className="min-w-0 flex-1 truncate font-medium text-slate-50">
            {facts.call}
          </span>
          {facts.jump ? (
            <a
              href={facts.jump.href}
              className="weather-focus-ring weather-hit inline-flex shrink-0 items-center text-sky-300 underline decoration-sky-700 underline-offset-4"
            >
              {facts.jump.label}
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
