"use client";

import type { ReactNode } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { NavigationMenu } from "@base-ui/react/navigation-menu";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";

export type ReportPageLink = {
  href: string;
  label: string;
  description: string;
};

export type ReportSectionLink = {
  href: string;
  label: string;
};

const getPageNavigationState = (
  pageLinks: ReportPageLink[],
  pageTitle: string,
  currentPath?: string,
) => {
  const currentIndexByPath = currentPath
    ? pageLinks.findIndex((link) => pathMatchesLink(link.href, currentPath))
    : -1;
  const currentIndexByLabel = pageLinks.findIndex((link) => link.label === pageTitle);
  const currentIndex = currentIndexByPath >= 0 ? currentIndexByPath : currentIndexByLabel;
  const currentLink = currentIndex >= 0 ? pageLinks[currentIndex] : pageLinks[0];
  const adjacentLinks = pageLinks.filter((link) => link.href !== currentLink.href).slice(0, 2);

  return { currentLink, adjacentLinks };
};

const isLinkActiveForPath = (linkHref: string, currentPath?: string) => {
  if (!currentPath) {
    return false;
  }

  return pathMatchesLink(linkHref, currentPath);
};

const pageLinkIcons: Record<string, ReactNode> = {
  "Command Center": (
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
  Signals: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        d="M4 16.5 8.5 12l3 2.75L16 9l4 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="12" r="1.4" fill="currentColor" />
      <circle cx="16" cy="9" r="1.4" fill="currentColor" />
      <path
        d="M4 19.25h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  Operations: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <rect
        x="4.75"
        y="5"
        width="14.5"
        height="14"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 9h8M8 12h5M8 15h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="16.5" cy="12" r="1.6" fill="currentColor" />
    </svg>
  ),
  "Decide": (
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
  Plan: (
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
  Learn: (
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
  Method: (
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
  currentPath,
  className,
  variant = "full",
}: {
  pageLinks: ReportPageLink[];
  pageTitle: string;
  currentPath?: string;
  className?: string;
  variant?: "full" | "compact";
}) => {
  const coreReportHrefs = new Set(["/start", "/signals", "/operations"]);
  const primaryLinks = pageLinks.filter((link) => coreReportHrefs.has(link.href));
  const secondaryLinks = pageLinks.filter((link) => !coreReportHrefs.has(link.href));
  const visibleLinks = primaryLinks.length > 0 ? primaryLinks : pageLinks;
  const shouldShowSecondaryLinks = variant === "full" && secondaryLinks.length > 0;

  return (
    <NavigationMenu.Root aria-label="Report paths" className={className}>
      <div className="space-y-2">
        <NavigationMenu.List className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/45 p-2 sm:flex sm:flex-wrap sm:gap-2">
          {visibleLinks.map((link, index) => {
            const isActive = currentPath
              ? isLinkActiveForPath(link.href, currentPath)
              : link.label === pageTitle;
            const isOddTail =
              visibleLinks.length % 2 === 1 && index === visibleLinks.length - 1;
            return (
              <NavigationMenu.Item
                key={link.href}
                className={`flex ${isOddTail ? "col-span-2 sm:col-auto" : ""} sm:flex-shrink-0`}
              >
                <NavigationMenu.Link
                  href={link.href}
                  active={isActive}
                  aria-current={isActive ? "page" : undefined}
                  className={`weather-tab inline-flex min-h-[46px] w-full items-center justify-center rounded-xl border px-4 py-2 text-center text-sm font-semibold tracking-[0.08em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation sm:w-auto sm:px-4 sm:text-xs ${
                    isActive
                      ? "border-sky-300/90 bg-sky-500/25 text-sky-50 shadow-sm shadow-sky-900/40"
                  : link.label === "Command Center"
                        ? "border-slate-600/90 bg-slate-900/70 text-slate-100 hover:border-sky-400/70 hover:text-slate-100"
                        : "border-slate-700/80 bg-slate-900/45 text-slate-200 hover:border-sky-400/70 hover:text-slate-100"
                  } ${isOddTail ? "mx-auto max-w-[240px]" : ""}`}
                >
                  {link.label}
                </NavigationMenu.Link>
              </NavigationMenu.Item>
            );
          })}
        </NavigationMenu.List>

        {shouldShowSecondaryLinks ? (
          <Collapsible.Root>
            <Collapsible.Trigger
              type="button"
              className="group inline-flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border border-slate-800/70 bg-slate-950/20 px-3 py-2 text-left text-xs font-semibold tracking-[0.08em] text-slate-300 transition-colors hover:border-sky-400/50 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
            >
              <span>More destinations ({secondaryLinks.length})</span>
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
            <Collapsible.Panel className="pt-2">
              <NavigationMenu.List className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-800/70 bg-slate-950/35 p-2 sm:flex sm:flex-wrap sm:gap-2">
                {secondaryLinks.map((link) => {
                  const isActive = currentPath
                    ? isLinkActiveForPath(link.href, currentPath)
                    : link.label === pageTitle;
                  return (
                    <NavigationMenu.Item key={link.href} className="flex sm:flex-shrink-0">
                      <NavigationMenu.Link
                        href={link.href}
                        active={isActive}
                        aria-current={isActive ? "page" : undefined}
                        className={`weather-tab inline-flex min-h-[46px] w-full items-center justify-center rounded-xl border px-4 py-2 text-center text-sm font-semibold tracking-[0.08em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation sm:w-auto sm:px-4 sm:text-xs ${
                          isActive
                            ? "border-sky-300/90 bg-sky-500/25 text-sky-50 shadow-sm shadow-sky-900/40"
                            : "border-slate-700/80 bg-slate-900/45 text-slate-200 hover:border-sky-400/70 hover:text-slate-100"
                        }`}
                      >
                        {link.label}
                      </NavigationMenu.Link>
                    </NavigationMenu.Item>
                  );
                })}
              </NavigationMenu.List>
            </Collapsible.Panel>
          </Collapsible.Root>
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
  currentPath,
  className,
}: {
  pageLinks: ReportPageLink[];
  pageTitle: string;
  currentPath?: string;
  className?: string;
}) => {
  const { currentLink, adjacentLinks } = getPageNavigationState(
    pageLinks,
    pageTitle,
    currentPath,
  );
  const pageCountLabel =
    pageLinks.length === 1 ? "1 page" : `${pageLinks.length} pages`;

  return (
    <NavigationMenu.Root aria-label="Mobile report navigation" className={className}>
      <div className="relative">
        <div className="weather-mobile-nav flex flex-col gap-2 px-3 py-3">
          <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/70 px-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-950/80 text-slate-100">
              {pageLinkIcons[currentLink.label] ?? pageLinkIcons.Method}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[0.08em] text-slate-100">
                {currentLink.label}
              </p>
              <p className="mt-1 truncate text-xs text-slate-300">{pageCountLabel}</p>
            </div>
            </div>
            {adjacentLinks[0] ? (
              <a
                href={adjacentLinks[0].href}
                className="weather-pill inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-700/80 px-3 py-2 text-[11px] font-semibold tracking-[0.12em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                {adjacentLinks[0].label}
              </a>
            ) : null}
          </div>

          {adjacentLinks.slice(1).length > 0 ? (
            <NavigationMenu.List aria-label="Suggested destinations" className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
              {adjacentLinks.slice(1).map((link) => (
                <NavigationMenu.Item key={link.href}>
                  <NavigationMenu.Link
                    href={link.href}
                    className="weather-pill inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-slate-800/80 px-3 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                  >
                    {link.label}
                  </NavigationMenu.Link>
                </NavigationMenu.Item>
              ))}
            </NavigationMenu.List>
          ) : null}
        </div>
      </div>
    </NavigationMenu.Root>
  );
};
