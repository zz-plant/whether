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
  "Quick start": (
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
};

export const ReportPageNavigation = ({
  pageLinks,
  pageTitle,
  className,
}: {
  pageLinks: ReportPageLink[];
  pageTitle: string;
  className?: string;
}) => (
  <NavigationMenu.Root aria-label="Report paths" className={className}>
    <Tooltip.Provider delay={200} closeDelay={50}>
      <NavigationMenu.List className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
        {pageLinks.map((link) => {
          const isActive = link.label === pageTitle;
          return (
            <NavigationMenu.Item key={link.href} className="flex-shrink-0">
              <Tooltip.Root>
                <Tooltip.Trigger
                  render={(props) => {
                    const { type: _type, ...triggerProps } = props;
                    return (
                      <NavigationMenu.Link
                        {...triggerProps}
                        href={link.href}
                        active={isActive}
                        aria-current={isActive ? "page" : undefined}
                        className={`weather-tab inline-flex min-h-[44px] items-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors touch-manipulation ${
                          isActive
                            ? "border-sky-400/70 bg-sky-500/20 text-sky-100"
                            : "text-slate-300 hover:border-sky-400/70 hover:text-slate-100"
                        }`}
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
    </Tooltip.Provider>
  </NavigationMenu.Root>
);

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
}) => (
  <NavigationMenu.Root aria-label="Mobile report navigation" className={className}>
    <div className="weather-panel flex items-center justify-between gap-2 px-3 py-2">
      <NavigationMenu.List className="flex flex-1 items-center gap-2">
        {pageLinks.map((link) => {
          const isActive = link.label === pageTitle;
          return (
            <NavigationMenu.Item key={link.href} className="flex-1">
              <NavigationMenu.Link
                href={link.href}
                active={isActive}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1 text-[10px] font-semibold tracking-[0.2em] transition-colors touch-manipulation ${
                  isActive
                    ? "bg-sky-500/15 text-sky-100"
                    : "text-slate-300 hover:text-slate-100"
                }`}
              >
                <span className="text-slate-200">{pageLinkIcons[link.label]}</span>
                <span className="uppercase">{link.label}</span>
              </NavigationMenu.Link>
            </NavigationMenu.Item>
          );
        })}
      </NavigationMenu.List>
      {sectionLinks.length > 0 ? (
        <Collapsible.Root className="relative flex-1">
          <Collapsible.Trigger
            type="button"
            className="group flex min-h-[52px] w-full flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1 text-[10px] font-semibold tracking-[0.2em] text-slate-300 transition-colors hover:text-slate-100 touch-manipulation"
          >
            <span className="text-slate-200">
              <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                <path
                  d="M4 6.5h16M4 12h16M4 17.5h10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="uppercase">Sections</span>
          </Collapsible.Trigger>
          <Collapsible.Panel className="absolute bottom-full left-0 right-0 mb-3">
            <div className="weather-panel space-y-2 px-4 py-4">
              <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">
                Jump to section
              </p>
              <ul className="space-y-2">
                {sectionLinks.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="weather-pill inline-flex min-h-[44px] w-full items-center px-3 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </Collapsible.Panel>
        </Collapsible.Root>
      ) : null}
    </div>
  </NavigationMenu.Root>
);
