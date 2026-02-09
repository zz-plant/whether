"use client";

import type { ReactNode } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { NavigationMenu } from "@base-ui/react/navigation-menu";

export type ReportPageLink = {
  href: string;
  label: string;
  description: string;
};

export type ReportSectionLink = {
  href: string;
  label: string;
};

const getPageNavigationState = (pageLinks: ReportPageLink[], pageTitle: string) => {
  const currentIndex = pageLinks.findIndex((link) => link.label === pageTitle);
  const currentPosition = currentIndex >= 0 ? currentIndex + 1 : 1;
  const currentLink = currentIndex >= 0 ? pageLinks[currentIndex] : pageLinks[0];
  const prevLink = currentIndex > 0 ? pageLinks[currentIndex - 1] : null;
  const nextLink =
    currentIndex >= 0 && currentIndex < pageLinks.length - 1 ? pageLinks[currentIndex + 1] : null;

  return { currentIndex, currentPosition, currentLink, prevLink, nextLink };
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
  "Onboarding & glossary": (
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
  "Signal evidence": (
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
  "Action playbook": (
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
  Methodology: (
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
  variant = "full",
}: {
  pageLinks: ReportPageLink[];
  pageTitle: string;
  className?: string;
  variant?: "full" | "compact";
}) => {
  const { currentLink, currentPosition, prevLink, nextLink } = getPageNavigationState(
    pageLinks,
    pageTitle,
  );

  return (
    <NavigationMenu.Root aria-label="Report paths" className={className}>
      <div className="space-y-3">
        <div className="flex flex-col gap-2 text-[10px] font-semibold tracking-[0.16em] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Page {currentPosition} of {pageLinks.length}
            </span>
            <span className="hidden text-[10px] font-semibold tracking-[0.14em] text-slate-300 sm:inline">
              {currentLink.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {prevLink ? (
              <a
                href={prevLink.href}
                aria-label={`Previous page: ${prevLink.label}`}
                className="weather-pill inline-flex min-h-[44px] items-center gap-2 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
              >
                <span aria-hidden="true">←</span>
                Prev
              </a>
            ) : (
              <span className="weather-pill inline-flex min-h-[44px] items-center gap-2 border border-slate-800/50 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-slate-500/80">
                <span aria-hidden="true">←</span>
                Prev
              </span>
            )}
            {nextLink ? (
              <a
                href={nextLink.href}
                aria-label={`Next page: ${nextLink.label}`}
                className="weather-pill inline-flex min-h-[44px] items-center gap-2 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
              >
                Next
                <span aria-hidden="true">→</span>
              </a>
            ) : (
              <span className="weather-pill inline-flex min-h-[44px] items-center gap-2 border border-slate-800/50 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-slate-500/80">
                Next
                <span aria-hidden="true">→</span>
              </span>
            )}
          </div>
        </div>

        {variant === "full" ? (
          <>
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 px-3 py-2 text-left">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400">
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
                    <NavigationMenu.Link
                      href={link.href}
                      active={isActive}
                      aria-current={isActive ? "page" : undefined}
                      className={`weather-tab inline-flex min-h-[44px] w-full items-center justify-center px-3 py-2 text-center text-[9px] font-semibold tracking-[0.12em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation sm:w-auto sm:px-4 sm:text-xs ${
                        isActive
                          ? "border-sky-400/70 bg-sky-500/20 text-sky-100"
                          : "text-slate-300 hover:border-sky-400/70 hover:text-slate-100"
                      } ${isOddTail ? "mx-auto max-w-[240px]" : ""}`}
                    >
                      {link.label}
                    </NavigationMenu.Link>
                  </NavigationMenu.Item>
                );
              })}
            </NavigationMenu.List>
          </>
        ) : null}
      </div>
    </NavigationMenu.Root>
  );
};

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
  const { currentLink, currentPosition, prevLink, nextLink } = getPageNavigationState(
    pageLinks,
    pageTitle,
  );
  const sectionCountLabel =
    sectionLinks.length === 0
      ? "No sections"
      : sectionLinks.length === 1
        ? "1 section"
        : `${sectionLinks.length} sections`;

  return (
    <NavigationMenu.Root aria-label="Mobile report navigation" className={className}>
      <Collapsible.Root className="relative">
        <div className="weather-mobile-nav flex flex-col gap-3 px-3 py-3">
          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/70 px-3 py-2">
            <span className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-950/80 text-slate-100">
              {pageLinkIcons[currentLink.label]}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[0.08em] text-slate-100">
                {currentLink.label}
              </p>
              <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400">
                Page {currentPosition} of {pageLinks.length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {prevLink ? (
              <a
                href={prevLink.href}
                aria-label={`Previous page: ${prevLink.label}`}
                className="weather-pill inline-flex min-h-[48px] w-full flex-col items-center justify-center gap-1 rounded-2xl border border-slate-800/80 px-2 py-2 text-[11px] font-semibold tracking-[0.16em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
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
                className="weather-pill pointer-events-none inline-flex min-h-[48px] w-full flex-col items-center justify-center gap-1 rounded-2xl border border-slate-800/60 px-2 py-2 text-[11px] font-semibold tracking-[0.16em] text-slate-500/80 opacity-70"
              >
                <span aria-hidden="true" className="text-base leading-none">
                  ←
                </span>
                <span className="uppercase">Prev</span>
              </button>
            )}

            <Collapsible.Trigger
              type="button"
              className="group weather-pill flex min-h-[48px] w-full flex-col items-center justify-center gap-1 rounded-2xl border border-slate-800/80 px-2 py-2 text-[11px] font-semibold tracking-[0.18em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
            >
              <span className="inline-flex items-center gap-2 text-slate-100">
                <span className="transition-transform duration-200 group-data-[panel-open]:rotate-90">
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
              </span>
              <span className="text-[9px] font-medium tracking-[0.12em] text-slate-400">
                {sectionCountLabel}
              </span>
            </Collapsible.Trigger>

            {nextLink ? (
              <a
                href={nextLink.href}
                aria-label={`Next page: ${nextLink.label}`}
                className="weather-pill inline-flex min-h-[48px] w-full flex-col items-center justify-center gap-1 rounded-2xl border border-slate-800/80 px-2 py-2 text-[11px] font-semibold tracking-[0.16em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
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
                className="weather-pill pointer-events-none inline-flex min-h-[48px] w-full flex-col items-center justify-center gap-1 rounded-2xl border border-slate-800/60 px-2 py-2 text-[11px] font-semibold tracking-[0.16em] text-slate-500/80 opacity-70"
              >
                <span aria-hidden="true" className="text-base leading-none">
                  →
                </span>
                <span className="uppercase">Next</span>
              </button>
            )}
          </div>
        </div>

        <Collapsible.Panel className="absolute bottom-full left-0 right-0 mb-3">
          <div className="weather-mobile-panel weather-mobile-sheet space-y-4 overflow-auto px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold tracking-[0.2em] text-slate-400">
                  Navigation
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
