/**
 * Shared report shell layout for Whether Weekly Brief pages.
 * Keeps header, navigation, and layout consistent across multi-page views.
 *
 * Uses PageShell for the outer container structure so hub and report pages
 * share consistent page-level padding, backdrop, and ambient behavior.
 *
 * What the shell stopped accepting on 2026-09-15, and why. Every route built
 * these, and the shell rendered none of them:
 * - `commandBar`: rendered only when `currentPath === "/"`, and `/` never
 *   mounts this shell.
 * - `decisionBanner`, `missionSupportText`, `trustStatusDetail`,
 *   `trustStatusAction`: the hero accepted them and never read them; the one
 *   other consumer was a phone-only card gated on a condition that was always
 *   false.
 * - `trustStatusLabel`: the hero prints `resolveTrustReadinessCopy().headline`,
 *   derived from tone, fallback and degraded count, so every route-authored
 *   phrase was discarded.
 * - `stageRail`, `hideHeroChrome`, `inlineTrustPlacement`, `provenance`,
 *   `treasurySource` and the outage props: no route set the switches, so the
 *   trust blocks and the sequence rail they fed never rendered.
 * - `heroVariant` and `roleSwitcher`: no route passed a role switcher, and the
 *   "Weekly operating brief" kicker only appeared on the two routes that forgot
 *   to ask for `compact`. One name per thing.
 * - `pageSummaryLink`, `secondaryCta`, the default `primaryCta`, and
 *   `currentPath`: every inline "↓" link and secondary button targeted either
 *   the block directly beneath the hero or the `/` the header tab already
 *   reaches; the default pointed at an anchor no route renders; and the path
 *   was read only to decide those.
 */
import { Children, type ReactNode, isValidElement } from "react";
import { PageShell } from "./pageShell";
import { type ReportSectionLink } from "./reportShellNavigation";
import { AppSidebar } from "./AppSidebar";
import { MobileSectionChips } from "./mobileSectionChips";
import type { RegimeIconType } from "./pageShell";
import { resolveTrustReadinessCopy } from "../../lib/report/trustStatus";
import { CommandCenterNavBlock } from "./report-shell/CommandCenterNavBlock";
import { SectionTabs } from "./sectionTabs";
import type { Route } from "../../lib/navigation/routeType";
import type { ExportCtaProps, ReportCtaProps } from "./report-shell/types";
import { OfflineNotice } from "./offlineNotice";
import type { TrustStripProps } from "./trustStrip";

export type ReportShellModel = {
  status: {
    statusLabel: string;
    /** A qualifier printed small before the status word, e.g. "Last completed
     *  month" on /history, so the word itself can keep the stamp's shape. */
    statusPrefix?: string;
    regime?: RegimeIconType;
    recordDateLabel: string;
    fetchedAtLabel?: string;
  };
  page: {
    pageTitle: string;
    /** The page's job in one sentence. Left out where the title already says it
     *  (/trust: "How much to trust this week's guidance"). */
    pageSummary?: string;
    sectionLinks: ReportSectionLink[];
    /** The route's address, for its group's sub-tab row above the intro. Omitted, no row renders. */
    currentPath?: Route;
    /** A selection the route carries across its group's pages (an archived month on Decide). */
    tabsQuery?: string;
  };
  trust: {
    trustStatusTone: "stable" | "warning" | "historical";
    degradedSourceRows?: Array<{ sourceName: string; modeLabel: string; freshnessStatus: string }>;
    showOfflineBadge?: boolean;
    offlineBadgeLabel?: string;
    /** The route's trust strip, drawn in the intro under the h1 in place of
     *  the intro's own "sources • as of" line. A route that passes one renders
     *  no second copy in its body. */
    strip?: Omit<TrustStripProps, "className">;
  };
  chrome?: {
    sidebarVariant?: "full" | "hidden";
  };
  /** A hero action, for a destination the header and the page index do not
   *  already reach. No route needs one today; the slot stays for the one that does.
   *  There is no closing "Next" card (2026-10-09): on /signals, /operate and
   *  /trust it pointed at a header tab or at "Use it elsewhere", which the
   *  header and the footer already carry. A next action that only the page
   *  knows is a link in its last section. */
  actions?: {
    primaryCta?: ReportCtaProps;
    exportCta?: ExportCtaProps | null;
  };
  payloads?: {
    structuredData?: unknown;
    historicalBanner?: ReactNode;
  };
};

type ReportShellProps = {
  model: ReportShellModel;
  children?: ReactNode;
};

export { CommandCenterNavBlock } from "./report-shell/CommandCenterNavBlock";

export const ReportShell = ({ model, children }: ReportShellProps) => {
  const {
    status: { statusLabel, statusPrefix, regime, recordDateLabel, fetchedAtLabel = "" },
    page: { pageTitle, pageSummary, sectionLinks, currentPath, tabsQuery },
    trust: {
      trustStatusTone,
      degradedSourceRows,
      showOfflineBadge = false,
      offlineBadgeLabel = "Cached snapshot",
      strip: trustStrip,
    },
    chrome: { sidebarVariant = "full" } = {},
    actions: {
      primaryCta,
      exportCta = null,
    } = {},
    payloads: { structuredData, historicalBanner } = {},
  } = model;
  const contentSections = Children.toArray(children);
  /*
   * A rail with no outline in it is just 13rem of empty column — /history asked
   * for "full" while passing an empty sectionLinks array, and rendered a rail
   * containing one static link. The outline is the reason the rail exists.
   */
  const sidebarEnabled = sidebarVariant === "full" && sectionLinks.length > 0;
  const trustReadiness = resolveTrustReadinessCopy({
    trustStatusTone,
    degradedSourceRows,
    isFallbackSnapshot: showOfflineBadge,
  });

  return (
    <PageShell regime={regime} structuredData={structuredData}>
      {historicalBanner}

      {/* The rail column exists only where the rail renders. `AppSidebar` is
          hidden below lg, but the grid reserved its column from md, so a
          tablet paid 12rem for an empty rail and got no outline at all. */}
      <div className={`mt-2 ${sidebarEnabled ? "lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-5" : ""}`}>
        {/* max-h, not h: as a grid item a fixed height forces the whole row
            to a viewport tall, so any page whose content was shorter than the
            rail ended in a screenful of empty space. */}
        {sidebarEnabled ? (
          <aside className="hidden lg:block lg:sticky lg:top-[calc(var(--running-head-height,0px)+1rem)] lg:self-start lg:max-h-[calc(100vh-2rem-var(--running-head-height,0px))] lg:overflow-y-auto lg:overscroll-contain">
            <AppSidebar sectionLinks={sectionLinks} />
          </aside>
        ) : null}

        {/* Between whole report sections. Was space-y-5/6, the same 20-24px
            used between items *inside* a section, so section boundaries
            carried no more weight than item boundaries. On phones the outer
            gap stays tighter than the desktop one: 40px between the chips
            row, the notice and the intro was unused space above the first
            task block, not separation. Desktop stops at 32px: at 48px, on top
            of the first section's own padding, ~90px of empty ground sat
            between the intro and the page's first heading. */}
        <div className={`weather-page-stack order-1 min-w-0 ${sidebarEnabled ? "" : "mx-auto w-full weather-page-shell-standard"}`}>
          {/* Every page built on this shell renders a reading, and the service
              worker serves the last copy of any of them when the network is
              gone. `/` carried this notice alone, so /trust — the page the IA
              points a reader to when they want to check the brief before a
              decision — showed a previous visit's readings with nothing saying
              so. The shell already has the record date, which is what makes the
              label true of whatever is on the screen. */}
          <OfflineNotice recordDateLabel={recordDateLabel} />

          {/* The group's pages, as tabs, before the intro names the one this is. */}
          {currentPath ? <SectionTabs currentPath={currentPath} query={tabsQuery} /> : null}

          <CommandCenterNavBlock
            pageTitle={pageTitle}
            pageSummary={pageSummary}
            recordDateLabel={recordDateLabel}
            primaryCta={primaryCta}
            exportCta={exportCta}
            statusLabel={statusLabel}
            statusPrefix={statusPrefix}
            trustStatusLabel={trustReadiness.headline}
            fetchedAtLabel={fetchedAtLabel}
            showOfflineBadge={showOfflineBadge}
            offlineBadgeLabel={offlineBadgeLabel}
            trustStrip={trustStrip}
            regime={regime}
          />

          {/* The outline, as a row of tabs, where the rail is hidden. Under the
              intro rather than above it: a phone read the index before it had
              read which page it was on. Sticky, so it still follows the reader
              down once they pass it. Renders nothing on a page with fewer than
              two sections. */}
          <MobileSectionChips sectionLinks={sectionLinks} />

          {/* The section rule was white/[0.04] — below the visible threshold
              by this repo's own measure (see the border-alpha note in
              tokens.css, which raised the floor to 0.10 for exactly this
              reason). So report pages had no visible section boundary at
              all, and the only thing chunking them was 24px of padding that
              matched the spacing used *inside* sections. A visible rule plus
              a wider outer gap makes the boundary the strongest horizontal
              signal on the page. */}
          {/* Token, not hardcoded white divider: a hardcoded white rule is
              invisible on the light theme's near-white ground, and 0.10 is
              not one of the four alphas the light escape-hatch block
              remaps. */}
          {/* Every section row owns its boundary padding; unboxed panels add no
              second inset. The group cancels its first and last outer padding. Deciding "first" by index gave the
              top row no top padding — but the first child is often a tracker
              that renders nothing (/resolve, /operate), so the real first
              section took the full padding and sat ~32px lower than on pages
              without one. */}
          <div className="weather-report-sections divide-y divide-[color:var(--border-default)]">
            {contentSections.map((section, index) => {
              const sectionKey =
                isValidElement(section) && section.key != null
                  ? section.key
                  : `section-${index}`;
              return (
                // `empty:hidden` because a section can decide at render time not to
                // render — ReturningVisitorDeltaStrip returns null for anyone without
                // a stored previous read, which is every first-time visitor.
                // Children.toArray only drops children that are already null at the
                // JSX level, so such a section still claimed a padded row and drew its
                // divider: an empty ~64px band between two rules on a first visit.
                <div
                  key={sectionKey}
                  className="weather-report-section-row empty:hidden"
                >
                  {section}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageShell>
  );
};
