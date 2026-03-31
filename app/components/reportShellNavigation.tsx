import Link from "next/link";
import type { Route } from "../../lib/navigation/routeType";
import {
  resolveNavigationRouteCue,
  resolvePrimaryNavigationSurfaceCue,
} from "../../lib/navigation/informationArchitecture";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";
import { getCompactSectionLabel } from "../../lib/report/homeSections";
import { defaultPageLinkIcon, pageLinkIcons } from "./reportShellPageIcons";

export type ReportPageLink = {
  id: string;
  href: Route;
  label: string;
  description: string;
  group: "core" | "workflow" | "reference";
};

export type ReportSectionLink = {
  href: string;
  label: string;
};

const resolveCompactSectionLabel = (sectionLink: ReportSectionLink) =>
  getCompactSectionLabel(sectionLink.href, sectionLink.label);

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
  const anchorLink = pageLinks.find((link) => link.href === "/") ?? pageLinks[0];
  const supportLinks = pageLinks.filter((link) => link.href !== anchorLink.href);

  return {
    currentLink,
    currentIndex,
    currentPosition: currentIndex >= 0 ? currentIndex + 1 : 1,
    anchorLink,
    supportLinks,
    totalCount: pageLinks.length,
  };
};

const basePageLinkClassName =
  "weather-tab inline-flex min-h-[46px] w-full items-center justify-center rounded-xl border px-4 py-2 text-center text-sm font-semibold tracking-[0.08em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation sm:w-auto sm:px-4 sm:text-xs";

const getPageLinkStateClassName = (isActive: boolean) =>
  isActive
    ? "border-sky-300/90 bg-sky-500/25 text-sky-50 shadow-sm shadow-sky-900/40"
    : "border-slate-700/80 bg-slate-900/45 text-slate-200 hover:border-sky-400/70 hover:text-slate-100";

const routeSwitcherIntro = "Start from Weekly Brief. Open a support path only if you need proof, planning depth, an edge-case answer, or a trust check.";

const renderPageLink = ({
  link,
  isActive,
}: {
  link: ReportPageLink;
  isActive: boolean;
}) => (
  <Link
    key={link.href}
    href={link.href}
    aria-current={isActive ? "page" : undefined}
    className={`${basePageLinkClassName} h-full flex-col items-start justify-start gap-1 text-left sm:w-full sm:text-left ${getPageLinkStateClassName(isActive)}`}
  >
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex h-5 w-5 items-center justify-center [&_svg]:h-4 [&_svg]:w-4" aria-hidden="true">
        {pageLinkIcons[link.id] ?? defaultPageLinkIcon}
      </span>
      <span>{link.label}</span>
    </span>
    <span className="flex flex-wrap items-center gap-2 text-[11px] font-medium normal-case tracking-normal text-slate-300">
      <span>{link.description}</span>
      <span className="rounded-full border border-slate-700/80 bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
        Route {resolveNavigationRouteCue(link.href)}
      </span>
    </span>
  </Link>
);

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
  const { currentLink, currentIndex, currentPosition, anchorLink, supportLinks, totalCount } = getPageNavigationState(
    pageLinks,
    pageTitle,
    currentPath,
  );
  const isAnchorRoute = currentLink.href === anchorLink.href;
  const supportGridClassName = variant === "compact"
    ? "grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4"
    : "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <nav aria-label="Report paths" className={className}>
      <div className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-950/45 p-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2.05fr)]">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/55 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {isAnchorRoute ? "Anchor route" : "Return to anchor"}
            </p>
            <Link
              href={anchorLink.href}
              aria-current={isAnchorRoute ? "page" : undefined}
              className={`mt-2 inline-flex min-h-[44px] items-center rounded-xl border px-3 py-2 text-sm font-semibold tracking-[0.08em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${
                isAnchorRoute
                  ? "border-amber-300/65 bg-amber-400/10 text-amber-50"
                  : "border-slate-700/80 bg-slate-950/70 text-slate-100 hover:border-amber-300/55 hover:text-amber-50"
              }`}
            >
              {anchorLink.label}
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-700/80 bg-slate-950/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                {resolvePrimaryNavigationSurfaceCue(anchorLink.href)}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {resolveNavigationRouteCue(anchorLink.href)}
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-300">
              {routeSwitcherIntro}
            </p>
          </div>

          <div className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-950/55 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {isAnchorRoute ? "Support paths" : `Current support path · ${currentLink.label}`}
            </p>
            <p className="text-xs leading-relaxed text-slate-300">
              {isAnchorRoute
                ? "Each path below exists to help the Weekly Brief, not replace it."
                : `Use ${currentLink.label} only while you need this help: ${currentLink.description}`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-700/80 bg-slate-950/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                {currentPosition} of {totalCount}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {resolveNavigationRouteCue(currentLink.href)}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5" aria-hidden="true">
              {pageLinks.map((link, index) => (
                <span
                  key={link.href}
                  className={`h-1.5 rounded-full ${index === currentIndex ? "bg-sky-300" : "bg-slate-800/80"}`}
                  title={`${index + 1}. ${link.label}`}
                />
              ))}
            </div>
            <div className={supportGridClassName}>
              {supportLinks.map((link) => renderPageLink({
                link,
                isActive: currentPath ? pathMatchesLink(link.href, currentPath) : link.label === pageTitle,
              }))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export const ReportInterpretationNotes = () => (
  <details className="weather-auto-chevron rounded-2xl border border-slate-800/80 bg-slate-950/45 p-3">
    <summary className="cursor-pointer text-xs font-semibold tracking-[0.12em] text-slate-200">
      How to interpret this week
    </summary>
    <ul className="mt-3 space-y-2 text-sm text-slate-300">
      <li className="flex gap-2">
        <span className="text-slate-400">1</span>
        <span className="break-words">
          Start with user outcomes and ROI. If the idea still wins, keep it on the table.
        </span>
      </li>
      <li className="flex gap-2">
        <span className="text-slate-400">2</span>
        <span className="break-words">
          Let the climate dictate pacing, staffing, and sequencing, not whether the idea matters.
        </span>
      </li>
    </ul>
  </details>
);

export const ReportSectionNavigation = ({
  sectionLinks,
  className,
  maxItems,
}: {
  sectionLinks: ReportSectionLink[];
  className?: string;
  maxItems?: number;
}) => {
  if (!sectionLinks.length) {
    return null;
  }
  const visibleSectionLinks = sectionLinks.slice(0, Math.max(1, maxItems ?? sectionLinks.length));
  const hiddenSectionCount = Math.max(sectionLinks.length - visibleSectionLinks.length, 0);

  return (
    <nav aria-label="Section index" className={className}>
      <ol className="space-y-2 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-3">
        {visibleSectionLinks.map((section, index) => (
          <li key={section.href}>
            <a
              href={section.href}
              className="inline-flex min-h-[42px] w-full items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/50 px-3 py-2 text-left text-xs font-semibold tracking-[0.12em] text-slate-300 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
            >
              <span>{resolveCompactSectionLabel(section)}</span>
              <span className="text-[10px] text-slate-400">{index + 1}</span>
            </a>
          </li>
        ))}
      </ol>
      {hiddenSectionCount > 0 ? (
        <p className="px-3 pb-3 pt-2 text-[11px] text-slate-400">
          {hiddenSectionCount} more section{hiddenSectionCount === 1 ? "" : "s"} below.
        </p>
      ) : null}
    </nav>
  );
};

export const ReportMobileNavigation = ({
  pageLinks,
  pageTitle,
  currentPath,
  className,
  sectionLinks = [],
  maxItems,
}: {
  pageLinks: ReportPageLink[];
  pageTitle: string;
  currentPath?: string;
  className?: string;
  sectionLinks?: ReportSectionLink[];
  maxItems?: number;
}) => {
  const { currentLink, currentIndex, currentPosition, anchorLink, supportLinks, totalCount } = getPageNavigationState(
    pageLinks,
    pageTitle,
    currentPath,
  );
  const isAnchorRoute = currentLink.href === anchorLink.href;
  const mobileSectionLinkLimit = Math.max(1, maxItems ?? 4);
  const mobileSectionLinks = sectionLinks.slice(0, mobileSectionLinkLimit);
  const hiddenSectionCount = Math.max(sectionLinks.length - mobileSectionLinks.length, 0);
  const visibleSupportLinks = supportLinks.slice(0, 3);
  const hiddenSupportCount = Math.max(supportLinks.length - visibleSupportLinks.length, 0);

  return (
    <nav aria-label="Mobile report navigation" className={className}>
      <div className="weather-mobile-nav flex flex-col gap-2 px-3 py-3">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {isAnchorRoute ? "Anchor route" : "Return to Weekly Brief"}
          </p>
          <Link
            href={anchorLink.href}
            aria-current={isAnchorRoute ? "page" : undefined}
            className={`mt-2 inline-flex min-h-[44px] items-center rounded-2xl border px-3 py-2 text-xs font-semibold tracking-[0.12em] ${
              isAnchorRoute
                ? "border-amber-300/65 bg-amber-400/10 text-amber-50"
                : "border-slate-700/80 bg-slate-950/80 text-slate-100"
            }`}
          >
            {anchorLink.label}
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-700/80 bg-slate-950/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              {currentPosition} of {totalCount}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {resolveNavigationRouteCue(anchorLink.href)}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-1.5" aria-hidden="true">
            {pageLinks.map((link, index) => (
              <span
                key={link.href}
                className={`h-1.5 rounded-full ${index === currentIndex ? "bg-sky-300" : "bg-slate-800/80"}`}
                title={`${index + 1}. ${link.label}`}
              />
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            {routeSwitcherIntro}
          </p>
        </div>

        {sectionLinks.length ? (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Current page
                </p>
                <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-300">
                  {currentLink.label}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Jump straight to the part of {currentLink.label} on {resolveNavigationRouteCue(currentLink.href)} you need.
                </p>
              </div>
              <span className="rounded-full border border-slate-700/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                {currentPosition} of {totalCount}
              </span>
            </div>
            <ol className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
              {mobileSectionLinks.map((section, index) => (
                <li key={section.href}>
                  <a
                    href={section.href}
                    className="weather-pill inline-flex min-h-[44px] w-full items-center justify-between gap-3 rounded-2xl border border-slate-800/80 px-3 py-2 text-left transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                  >
                    <span className="text-xs font-semibold tracking-[0.12em] text-slate-200">{resolveCompactSectionLabel(section)}</span>
                    <span className="text-[10px] text-slate-400">{index + 1}</span>
                  </a>
                </li>
              ))}
            </ol>
            {hiddenSectionCount > 0 ? (
              <p className="mt-2 text-[11px] text-slate-400">+{hiddenSectionCount} more section{hiddenSectionCount === 1 ? "" : "s"} below.</p>
            ) : null}
          </div>
        ) : null}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 px-3 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-950/80 text-slate-100">
              {pageLinkIcons[currentLink.id] ?? defaultPageLinkIcon}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[0.08em] text-slate-100">
                {currentLink.label}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-300">{currentLink.description}</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {resolveNavigationRouteCue(currentLink.href)}
              </p>
            </div>
          </div>
        </div>

        {visibleSupportLinks.length > 0 ? (
          <div aria-label="Support paths" className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
            {visibleSupportLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={currentPath ? (pathMatchesLink(link.href, currentPath) ? "page" : undefined) : undefined}
                className="weather-pill inline-flex min-h-[44px] w-full flex-col items-start justify-center rounded-2xl border border-slate-800/80 px-3 py-2 text-left transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                <span className="text-xs font-semibold tracking-[0.12em] text-slate-200">{link.label}</span>
                <span className="mt-1 text-[11px] text-slate-400">{link.description}</span>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Route {resolveNavigationRouteCue(link.href)}
                </span>
              </Link>
            ))}
          </div>
        ) : null}
        {hiddenSupportCount > 0 ? (
          <p className="mt-2 text-[11px] text-slate-400">
            +{hiddenSupportCount} more support path{hiddenSupportCount === 1 ? "" : "s"} available.
          </p>
        ) : null}
      </div>
    </nav>
  );
};
