"use client";

import type { ReactNode } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { NavigationMenu } from "@base-ui/react/navigation-menu";
import { Tooltip } from "@base-ui/react/tooltip";

export type ReportPageLink = {
  href: string;
  label: string;
  description: string;
};

export type ReportSectionLink = {
  href: string;
  label: string;
};

const pageLinkIcons: Record<string, ReactNode> = {
  "Weekly briefing": (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        d="M12 4.5V2.75M12 21.25v-1.75M4.5 12H2.75M21.25 12h-1.75M6.75 6.75l-1.3-1.3M18.55 18.55l-1.3-1.3M6.75 17.25l-1.3 1.3M18.55 5.45l-1.3 1.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="4.25" fill="currentColor" />
    </svg>
  ),
  Onboarding: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        d="M4 5.5h16v13H4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 9h8M8 12h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="17" cy="15.5" r="2.5" fill="currentColor" />
    </svg>
  ),
  "Why we believe this": (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        d="M4 18c0-4.4 3.6-8 8-8s8 3.6 8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M7 18c0-2.8 2.2-5 5-5s5 2.2 5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="12" cy="18" r="1.8" fill="currentColor" />
    </svg>
  ),
  "What to do next": (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        d="M6 4.75h9.25a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M6 4.75v14.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M9.5 8.5h5M9.5 12h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  "Sensor formulas": (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        d="M7 5.5h10a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 17V7A1.5 1.5 0 0 1 7 5.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M8.5 9h7M8.5 12h4.5M8.5 15h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
};

export const ReportPageNavigation = ({
  pageLinks,
  pageTitle,
  className,
}: {
  pageLinks: ReportPageLink[];
  pageTitle: string;
  className?: string;
}) => {
  const currentIndex = pageLinks.findIndex((link) => link.label === pageTitle);
  const currentPosition = currentIndex >= 0 ? currentIndex + 1 : 1;
  const currentLink = currentIndex >= 0 ? pageLinks[currentIndex] : pageLinks[0];
  const prevLink = currentIndex > 0 ? pageLinks[currentIndex - 1] : null;
  const nextLink =
    currentIndex >= 0 && currentIndex < pageLinks.length - 1 ? pageLinks[currentIndex + 1] : null;

  return (
    <NavigationMenu.Root aria-label="Report paths" className={className}>
      <Tooltip.Provider delay={200} closeDelay={50}>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold tracking-[0.18em] text-slate-400">
            <span>
              Page {currentPosition} of {pageLinks.length}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {prevLink ? (
                <a
                  href={prevLink.href}
                  aria-label={`Previous page: ${prevLink.label}`}
                  className="weather-pill inline-flex min-h-[36px] items-center gap-2 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100"
                >
                  <span aria-hidden="true">←</span>
                  Prev
                </a>
              ) : (
                <span className="weather-pill inline-flex min-h-[36px] items-center gap-2 border border-slate-800/50 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-slate-500/80">
                  <span aria-hidden="true">←</span>
                  Prev
                </span>
              )}
              {nextLink ? (
                <a
                  href={nextLink.href}
                  aria-label={`Next page: ${nextLink.label}`}
                  className="weather-pill inline-flex min-h-[36px] items-center gap-2 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100"
                >
                  Next
                  <span aria-hidden="true">→</span>
                </a>
              ) : (
                <span className="weather-pill inline-flex min-h-[36px] items-center gap-2 border border-slate-800/50 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-slate-500/80">
                  Next
                  <span aria-hidden="true">→</span>
                </span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 px-3 py-2">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-400">
              Current page
            </p>
            <p className="text-sm font-semibold text-slate-100">{currentLink.label}</p>
            <p className="text-xs text-slate-300">{currentLink.description}</p>
          </div>

          <NavigationMenu.List className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
            {pageLinks.map((link, index) => {
              const isActive = link.label === pageTitle;
              const isOddTail = pageLinks.length % 2 === 1 && index === pageLinks.length - 1;
              return (
                <NavigationMenu.Item
                  key={link.href}
                  className={`flex ${isOddTail ? "col-span-2 sm:col-auto" : ""} sm:flex-shrink-0`}
                >
                  <Tooltip.Root>
                    <Tooltip.Trigger
                      render={(props) => {
                        const triggerProps = props;
                        return (
                          <NavigationMenu.Link
                            {...triggerProps}
                            href={link.href}
                            active={isActive}
                            aria-current={isActive ? "page" : undefined}
                            className={`weather-tab inline-flex min-h-[44px] w-full items-center justify-center gap-2 px-3 py-2 text-center text-[9px] font-semibold tracking-[0.14em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation sm:w-auto sm:px-4 sm:text-xs sm:tracking-[0.12em] ${
                              isActive
                                ? "border-sky-400/70 bg-sky-500/20 text-sky-100"
                                : "text-slate-300 hover:border-sky-400/70 hover:text-slate-100"
                            } ${isOddTail ? "mx-auto max-w-[240px]" : ""}`}
                          >
                            <span className="hidden sm:inline-flex">
                              {pageLinkIcons[link.label]}
                            </span>
                            {link.label}
                          </NavigationMenu.Link>
                        );
                      }}
                    />
                    <Tooltip.Portal>
                      <Tooltip.Positioner side="bottom" align="start" sideOffset={10}>
                        <Tooltip.Popup className="hidden max-w-xs rounded-2xl border border-slate-800/80 bg-slate-950/95 px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-200 shadow-xl sm:block">
                          {link.description}
                          <Tooltip.Arrow className="h-2 w-2 translate-y-[1px] rotate-45 rounded-[2px] bg-slate-950/95" />
                        </Tooltip.Popup>
                      </Tooltip.Positioner>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </NavigationMenu.Item>
              );
            })}
          </NavigationMenu.List>
        </div>
      </Tooltip.Provider>
    </NavigationMenu.Root>
  );
};

export const ReportDataTimestamps = ({
  recordDateLabel,
  fetchedAtLabel,
  treasurySource,
}: {
  recordDateLabel: string;
  fetchedAtLabel: string;
  treasurySource: string;
}) => (
  <Collapsible.Root className="weather-panel px-4 py-4">
    <Collapsible.Trigger
      type="button"
      className="group inline-flex min-h-[44px] w-full items-center justify-between gap-2 text-xs font-semibold tracking-[0.1em] text-slate-200 transition-colors hover:text-slate-100 touch-manipulation"
    >
      Data timestamps
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700/70 text-slate-300 transition-transform duration-200 group-data-[panel-open]:rotate-180">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
          <path
            d="M7 10l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </Collapsible.Trigger>
    <Collapsible.Panel className="mt-3 text-sm text-slate-300">
      <dl className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-400">Record date</dt>
          <dd className="mono text-slate-100">{recordDateLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-400">Fetched at</dt>
          <dd className="mono text-slate-100">{fetchedAtLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-400">Source</dt>
          <dd>
            <a
              href={treasurySource}
              target="_blank"
              rel="noreferrer"
              className="touch-target inline-flex min-h-[44px] items-center text-xs text-slate-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100 touch-manipulation"
            >
              US Treasury Fiscal Data API
            </a>
          </dd>
        </div>
      </dl>
    </Collapsible.Panel>
  </Collapsible.Root>
);

export const ReportInterpretationNotes = () => (
  <Collapsible.Root>
    <Collapsible.Trigger
      type="button"
      className="group inline-flex min-h-[44px] w-full items-center justify-between gap-2 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:text-slate-100 touch-manipulation"
    >
      <span>How to interpret this week</span>
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700/70 text-slate-300 transition-transform duration-200 group-data-[panel-open]:rotate-180">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
          <path
            d="M7 10l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </Collapsible.Trigger>
    <Collapsible.Panel className="mt-3 text-sm text-slate-300">
      <ul className="space-y-2">
        <li className="flex gap-2">
          <span className="text-slate-400">1</span>
          <span className="break-words">
            Start with user outcomes and ROI. If the idea still wins, keep it on the table.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-slate-400">2</span>
          <span className="break-words">
            Let the climate dictate pacing, staffing, and sequencing—not whether the idea matters.
          </span>
        </li>
      </ul>
    </Collapsible.Panel>
  </Collapsible.Root>
);

export const ReportMobileNavigation = ({
  pageLinks,
  pageTitle,
  sectionLinks,
  className,
}: {
  pageLinks: ReportPageLink[];
  pageTitle: string;
  sectionLinks: ReportSectionLink[];
  className?: string;
}) => {
  const currentIndex = pageLinks.findIndex((link) => link.label === pageTitle);
  const currentLink = currentIndex >= 0 ? pageLinks[currentIndex] : pageLinks[0];
  const prevLink = currentIndex > 0 ? pageLinks[currentIndex - 1] : null;
  const nextLink =
    currentIndex >= 0 && currentIndex < pageLinks.length - 1 ? pageLinks[currentIndex + 1] : null;
  const currentPosition = currentIndex >= 0 ? currentIndex + 1 : 1;
  const sectionCountLabel =
    sectionLinks.length === 0
      ? "No sections"
      : sectionLinks.length === 1
        ? "1 section"
        : `${sectionLinks.length} sections`;

  return (
    <NavigationMenu.Root aria-label="Mobile report navigation" className={className}>
      <Collapsible.Root className="relative">
        <div className="weather-mobile-nav flex items-stretch gap-2 px-3 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/70 px-3 py-2">
            <span className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-950/80 text-slate-100">
              {pageLinkIcons[currentLink.label]}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.22em] text-slate-400">
                Current page
              </p>
              <p className="truncate text-sm font-semibold tracking-[0.08em] text-slate-100">
                {currentLink.label}
              </p>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-400">
                Page {currentPosition} of {pageLinks.length}
              </p>
            </div>
          </div>

          <div className="grid w-[108px] flex-shrink-0 grid-cols-2 gap-1.5">
            {prevLink ? (
              <a
                href={prevLink.href}
                aria-label={`Previous page: ${prevLink.label}`}
                className="weather-pill inline-flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-2xl border border-slate-800/80 px-2 py-2 text-[10px] font-semibold tracking-[0.16em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                <span aria-hidden="true" className="text-base leading-none text-slate-300">
                  ←
                </span>
                <span className="uppercase">Prev</span>
              </a>
            ) : (
              <button
                type="button"
                aria-disabled="true"
                disabled
                className="weather-pill pointer-events-none inline-flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-2xl border border-slate-800/60 px-2 py-2 text-[10px] font-semibold tracking-[0.16em] text-slate-500/80 opacity-70"
              >
                <span aria-hidden="true" className="text-base leading-none">
                  ←
                </span>
                <span className="uppercase">Prev</span>
              </button>
            )}
            {nextLink ? (
              <a
                href={nextLink.href}
                aria-label={`Next page: ${nextLink.label}`}
                className="weather-pill inline-flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-2xl border border-slate-800/80 px-2 py-2 text-[10px] font-semibold tracking-[0.16em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                <span aria-hidden="true" className="text-base leading-none text-slate-300">
                  →
                </span>
                <span className="uppercase">Next</span>
              </a>
            ) : (
              <button
                type="button"
                aria-disabled="true"
                disabled
                className="weather-pill pointer-events-none inline-flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-2xl border border-slate-800/60 px-2 py-2 text-[10px] font-semibold tracking-[0.16em] text-slate-500/80 opacity-70"
              >
                <span aria-hidden="true" className="text-base leading-none">
                  →
                </span>
                <span className="uppercase">Next</span>
              </button>
            )}
          </div>

          <Collapsible.Trigger
            type="button"
            className="group weather-pill flex min-h-[44px] w-[92px] flex-shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-slate-800/80 px-2 py-2 text-[10px] font-semibold tracking-[0.18em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
          >
            <span className="text-slate-100 transition-transform duration-200 group-data-[panel-open]:rotate-90">
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path
                  d="M6.5 5.5h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M8.75 9.25h6.5M8.75 12h6.5M8.75 14.75h4"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                />
              </svg>
            </span>
            <span className="uppercase">Menu</span>
            <span className="text-[9px] font-medium tracking-[0.12em] text-slate-400">
              {sectionCountLabel}
            </span>
          </Collapsible.Trigger>
        </div>

        <Collapsible.Panel className="absolute bottom-full left-0 right-0 mb-3">
          <div className="weather-mobile-panel max-h-[70vh] space-y-4 overflow-auto px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">
                  Navigate report
                </p>
                <p className="text-base font-semibold text-slate-100">{currentLink.label}</p>
                <p className="text-xs text-slate-300">{currentLink.description}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="weather-chip inline-flex min-h-[44px] items-center px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-slate-200">
                  {sectionCountLabel}
                </span>
                <span className="rounded-full border border-slate-800/70 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-slate-400">
                  Page {currentPosition} of {pageLinks.length}
                </span>
              </div>
            </div>

            {nextLink ? (
              <div className="weather-panel space-y-2 px-3 py-3">
                <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-400">
                  Up next
                </p>
                <p className="text-sm font-semibold text-slate-100">{nextLink.label}</p>
                <p className="text-xs text-slate-300">{nextLink.description}</p>
                <a
                  href={nextLink.href}
                  className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-[10px] font-semibold tracking-[0.18em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100"
                >
                  Go to next page
                </a>
              </div>
            ) : null}

            <NavigationMenu.List className="grid gap-2">
              {pageLinks.map((link) => {
                const isActive = link.label === pageTitle;
                return (
                  <NavigationMenu.Item key={link.href}>
                    <NavigationMenu.Link
                      href={link.href}
                      active={isActive}
                      aria-current={isActive ? "page" : undefined}
                      className={`weather-pill flex min-h-[56px] items-start gap-3 rounded-2xl border px-3 py-3 text-left text-sm font-semibold tracking-[0.08em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation ${
                        isActive
                          ? "border-sky-400/70 bg-sky-500/15 text-sky-100"
                          : "border-slate-800/80 text-slate-100 hover:border-sky-400/70 hover:text-sky-100"
                      }`}
                    >
                      <span
                        className={`inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border ${
                          isActive
                            ? "border-sky-300/70 bg-sky-500/20 text-sky-100"
                            : "border-slate-800/80 bg-slate-950/70 text-slate-200"
                        }`}
                      >
                        {pageLinkIcons[link.label]}
                      </span>
                      <span className="space-y-1">
                        <span className="block text-xs uppercase tracking-[0.2em] text-slate-400">
                          Report page
                        </span>
                        <span className="block text-sm font-semibold text-current">
                          {link.label}
                        </span>
                        <span className="block text-xs font-medium tracking-[0.12em] text-slate-300">
                          {link.description}
                        </span>
                      </span>
                    </NavigationMenu.Link>
                  </NavigationMenu.Item>
                );
              })}
            </NavigationMenu.List>

            {sectionLinks.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-[0.2em] text-slate-400">
                  Jump to section
                </p>
                <ul className="space-y-2">
                  {sectionLinks.map((item) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        className="weather-pill inline-flex min-h-[44px] w-full items-center px-3 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Collapsible.Panel>
      </Collapsible.Root>
    </NavigationMenu.Root>
  );
};
