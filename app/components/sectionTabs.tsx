import Link from "next/link";
import { resolveSectionTabs } from "../../lib/navigation/globalHeader";
import { toRoute, type Route } from "../../lib/navigation/routeType";
import { SectionTabsActiveInView } from "./sectionTabsActiveInView";

/**
 * The group's pages as a row of text tabs, under the header on every page of a
 * group that has more than one: This week (the brief, why it changed, how much
 * to trust it), Decide (the plan, the runway planner, scenarios, SaaS
 * multiples) and Record (the record, compare periods, calibration).
 *
 * It replaces two rows that each did half the job. /operate drew a "Planning
 * views" switcher for its three pages and nothing else did; /signals, /operate
 * and /trust drew a "Signals · Conditions · Plan · Share" strip beside the
 * intro, which read as tabs, named none of the pages it sat on, and linked to
 * nothing.
 *
 * Secondary pages (Product writing under Record) and cross-links (Record's
 * reach into the sources and the score derivation on /trust) follow the tabs
 * after a rule, in lighter type. `query` carries a page's own selection (the
 * month an archived plan is read for) across the group's pages.
 */
export function SectionTabs({ currentPath, query }: { currentPath: Route; query?: string }) {
  const resolved = resolveSectionTabs(currentPath);
  if (!resolved) return null;

  const tabs = resolved.links.filter((link) => link.placement === "tab");
  const extras = resolved.links.filter((link) => link.placement !== "tab");
  const withQuery = (href: Route) => (query && !href.includes("#") ? toRoute(`${href}?${query}`) : href);

  return (
    /* One line below sm (2026-10-14): wrapping put Decide's fourth tab on a row
       of its own, ~48px of a phone's first screen spent on one link. The row
       scrolls sideways instead, like the section chips under the intro. */
    <nav
      aria-label={`${resolved.group.label} pages`}
      data-section-tabs={resolved.group.key}
      className="flex items-end gap-x-4 gap-y-1 max-sm:-mx-4 max-sm:overflow-x-auto max-sm:overscroll-x-contain max-sm:px-4 max-sm:[scrollbar-width:none] sm:flex-wrap sm:gap-x-5"
    >
      {tabs.map((link) => (
        <Link
          key={link.href}
          href={withQuery(link.href)}
          aria-current={link.isActive ? "page" : undefined}
          className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 text-sm font-medium no-underline transition-colors ${
            link.isActive
              ? "border-[var(--regime-accent)] text-slate-100"
              : "border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-200"
          }`}
        >
          {link.label}
        </Link>
      ))}
      {extras.length > 0 ? (
        <span className="flex shrink-0 items-end gap-x-4 gap-y-1 border-l border-[color:var(--border-default)] pl-4 sm:flex-wrap sm:pl-5">
          {extras.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.isActive ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 text-fluid-xs no-underline transition-colors ${
                link.isActive
                  ? "border-[var(--regime-accent)] font-medium text-slate-100"
                  : "border-transparent text-slate-500 hover:border-slate-600 hover:text-slate-300"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </span>
      ) : null}
      <SectionTabsActiveInView />
    </nav>
  );
}
