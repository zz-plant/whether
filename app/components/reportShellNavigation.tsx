import Link from "next/link";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";
import { navigationGroupLabels } from "../../lib/navigation/informationArchitecture";
import { homeSectionCompactLabelByHref } from "../../lib/report/homeSections";
import { defaultPageLinkIcon, pageLinkIcons } from "./reportShellPageIcons";

export type ReportPageLink = {
  id: string;
  href: string;
  label: string;
  description: string;
  group: "core" | "workflow" | "reference";
};

export type ReportSectionLink = {
  href: string;
  label: string;
};

const sectionCompactLabelByHref: Record<string, string> = {
  ...homeSectionCompactLabelByHref,
  "#evidence-priorities": "Top drivers",
  "#ops-monthly-action-summary": "Monthly",
  "#ops-playbook": "Playbook",
  "#ops-finance-strategy": "Finance",
  "#ops-export-briefs": "Export",
};

const getCompactSectionLabel = (sectionLink: ReportSectionLink) =>
  sectionCompactLabelByHref[sectionLink.href] ?? sectionLink.label;

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
  const adjacentLinks = pageLinks.filter((link) => link.href !== currentLink.href);

  return { currentLink, adjacentLinks };
};

const basePageLinkClassName =
  "weather-tab inline-flex min-h-[46px] w-full items-center justify-center rounded-xl border px-4 py-2 text-center text-sm font-semibold tracking-[0.08em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation sm:w-auto sm:px-4 sm:text-xs";

const getPageLinkStateClassName = (isActive: boolean) =>
  isActive
    ? "border-sky-300/90 bg-sky-500/25 text-sky-50 shadow-sm shadow-sky-900/40"
    : "border-slate-700/80 bg-slate-900/45 text-slate-200 hover:border-sky-400/70 hover:text-slate-100";

const navigationGroupOrder: Array<keyof typeof navigationGroupLabels> = ["core", "workflow", "reference"];

const groupPageLinks = (pageLinks: ReportPageLink[]) =>
  navigationGroupOrder
    .map((group) => ({
      group,
      label: navigationGroupLabels[group],
      links: pageLinks.filter((link) => link.group === group),
    }))
    .filter((groupSection) => groupSection.links.length > 0);

export const ReportPageNavigation = ({
  pageLinks,
  pageTitle,
  currentPath,
  className,
}: {
  pageLinks: ReportPageLink[];
  pageTitle: string;
  currentPath?: string;
  className?: string;
  variant?: "full" | "compact";
}) => {
  const groupedPageLinks = groupPageLinks(pageLinks);

  return (
    <nav aria-label="Report paths" className={className}>
      <div className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-950/45 p-2">
        {groupedPageLinks.map((groupSection) => (
          <div key={groupSection.group} className="space-y-2">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {groupSection.label}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {groupSection.links.map((link) => {
                const isActive = currentPath ? pathMatchesLink(link.href, currentPath) : link.label === pageTitle;
                return (
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
                    <span className="text-[11px] font-medium normal-case tracking-normal text-slate-300">
                      {link.description}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
};

export const ReportInterpretationNotes = () => (
  <details className="rounded-2xl border border-slate-800/80 bg-slate-950/45 p-3">
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
}: {
  sectionLinks: ReportSectionLink[];
  className?: string;
}) => {
  if (!sectionLinks.length) {
    return null;
  }

  return (
    <nav aria-label="Section index" className={className}>
      <ol className="space-y-2 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-3">
        {sectionLinks.map((section, index) => (
          <li key={section.href}>
            <a
              href={section.href}
              className="inline-flex min-h-[42px] w-full items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/50 px-3 py-2 text-left text-xs font-semibold tracking-[0.12em] text-slate-300 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
            >
              <span>{getCompactSectionLabel(section)}</span>
              <span className="text-[10px] text-slate-400">{index + 1}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export const ReportMobileNavigation = ({
  pageLinks,
  pageTitle,
  currentPath,
  className,
  sectionLinks = [],
}: {
  pageLinks: ReportPageLink[];
  pageTitle: string;
  currentPath?: string;
  className?: string;
  sectionLinks?: ReportSectionLink[];
}) => {
  const { currentLink, adjacentLinks } = getPageNavigationState(
    pageLinks,
    pageTitle,
    currentPath,
  );
  const pageCountLabel =
    pageLinks.length === 1 ? "1 page" : `${pageLinks.length} pages`;
  const mobileSectionLinks = sectionLinks.slice(0, 4);
  const hiddenSectionCount = Math.max(sectionLinks.length - mobileSectionLinks.length, 0);

  return (
    <nav aria-label="Mobile report navigation" className={className}>
      <div className="weather-mobile-nav flex flex-col gap-2 px-3 py-3">
        {sectionLinks.length ? (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-300">
                  {`${sectionLinks.length} sections`}
                </p>
                <p className="mt-1 text-xs text-slate-400">Jump straight to the part of {currentLink.label} you need.</p>
              </div>
              <span className="rounded-full border border-slate-700/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                {currentLink.label}
              </span>
            </div>
            <ol className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
              {mobileSectionLinks.map((section, index) => (
                <li key={section.href}>
                  <a
                    href={section.href}
                    className="weather-pill inline-flex min-h-[44px] w-full items-center justify-between gap-3 rounded-2xl border border-slate-800/80 px-3 py-2 text-left transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                  >
                    <span className="text-xs font-semibold tracking-[0.12em] text-slate-200">{getCompactSectionLabel(section)}</span>
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
        <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/70 px-3 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-950/80 text-slate-100">
              {pageLinkIcons[currentLink.id] ?? defaultPageLinkIcon}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[0.08em] text-slate-100">
                {currentLink.label}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{navigationGroupLabels[currentLink.group]}</p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-300">{currentLink.description}</p>
              <p className="mt-1 truncate text-[11px] text-slate-400">{pageCountLabel}</p>
            </div>
          </div>
          {adjacentLinks[0] ? (
            <Link
              href={adjacentLinks[0].href}
              className="weather-pill inline-flex min-h-[44px] max-w-[160px] flex-col items-start justify-center rounded-2xl border border-slate-700/80 px-3 py-2 text-left transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
            >
              <span className="text-[11px] font-semibold tracking-[0.12em] text-slate-100">{adjacentLinks[0].label}</span>
              <span className="mt-1 text-[10px] text-slate-300">{adjacentLinks[0].description}</span>
            </Link>
          ) : null}
        </div>

        {adjacentLinks.slice(1).length > 0 ? (
          <div aria-label="Suggested destinations" className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
            {adjacentLinks.slice(1).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="weather-pill inline-flex min-h-[44px] w-full flex-col items-start justify-center rounded-2xl border border-slate-800/80 px-3 py-2 text-left transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                <span className="text-xs font-semibold tracking-[0.12em] text-slate-200">{link.label}</span>
                <span className="mt-1 text-[11px] text-slate-400">{link.description}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </nav>
  );
};
