import { ReportCta } from "../reportCta";
import { frameFactsAttributes } from "../../../lib/navigation/runningHead";
import { isRegimeKey } from "../../../lib/regimePresentation";
import { formatNearestChange } from "../../../lib/report/reportFormatting";
import type { ExportCtaProps, ReportCtaProps } from "./types";
import type { RegimeKey } from "../../../lib/types";
import { TrustStrip, type TrustStripProps } from "../trustStrip";

/**
 * The one page intro block a report route gets (ui-ux-standards §XI): kicker,
 * status line, title, one-sentence summary, the refresh stamp, and at most the
 * actions a route asks for. It used to also accept a decision banner, a
 * mission line, a trust action and a role switcher that it never read or that
 * no route ever passed, an inline "↓" link that always pointed at the block
 * directly beneath it, and a secondary button that always pointed at `/`.
 *
 * Below `sm` a route with a trust strip draws three lines: the status word
 * (with the screenshot caption), the title, and the strip as one meta line.
 */
export function CommandCenterNavBlock({
  pageTitle,
  pageSummary,
  recordDateLabel,
  primaryCta,
  exportCta,
  statusLabel,
  statusPrefix,
  statusRegime,
  trustStatusLabel,
  fetchedAtLabel,
  showOfflineBadge,
  offlineBadgeLabel,
  trustStrip,
  regime,
  frameCondition,
}: {
  pageTitle: string;
  pageSummary?: string;
  recordDateLabel: string;
  primaryCta?: ReportCtaProps;
  exportCta?: ExportCtaProps | null;
  statusLabel: string;
  statusPrefix?: string;
  /** The condition the status word names when the page shell has no regime; scoped to the word. */
  statusRegime?: RegimeKey;
  trustStatusLabel: string;
  fetchedAtLabel: string;
  showOfflineBadge: boolean;
  offlineBadgeLabel: string;
  /** The route's trust strip. It carries the record date and the sources, so
   *  the line beside the status word drops both rather than print them twice. */
  trustStrip?: Omit<TrustStripProps, "className">;
  /** The reading's regime. With it, the status word is a condition and the running head repeats it. */
  regime?: string;
  /** The conditions the running head names where the page has no one status word for
   *  them: /history/compare holds two periods ("Cloudy · Stormy"). Never printed here. */
  frameCondition?: string;
}) {
  // The status word leads and prints in the regime ink — it is this page's
  // equivalent of the hero's stamp, and the only word on the route that
  // names the week. The rest of the line stays neutral.
  // With a strip, the sources and the record date are its cells: /operate,
  // /signals and /trust printed "All sources live • As of Oct 2" here and the
  // same two facts again in the strip a row below (DD-040).
  const introMetaRest = [
    trustStrip ? null : trustStatusLabel,
    // Interpolated only when there is a date. `As of ${x}` is a truthy string
    // even when x is "", so the filter below could never drop it, and a caller
    // passing no record date printed a bare "As of" with nothing after it.
    !trustStrip && recordDateLabel ? `Data as of ${recordDateLabel}` : null,
    showOfflineBadge ? offlineBadgeLabel : null,
  ]
    .filter(Boolean)
    .join(" • ");
  // Same rule for the refresh stamp: /history passes no fetch time, and
  // printed "Updated " with nothing after it. There is no second stamp: a
  // "15m cadence" label and, on /history, "Fixed historical snapshot" beside the
  // status line's own "Historical snapshot" were removed (the second 2026-10-09).
  const showStamp = Boolean(fetchedAtLabel);
  const showActions = Boolean(primaryCta) || Boolean(exportCta);
  // A phone gets the week's word, the title and one meta line before the
  // first task block (ui-ux-standards §XI). Until 2026-10-07 the intro on
  // /operate, /signals and /trust was a 2×2 trust grid, a link, the refresh
  // stamp and the caption, each on its own row: about 260px of a 932px
  // screen restating what `/` had just shown. Below `sm` the refresh stamp
  // drops (the record date is the date a phone reader needs; /trust lists
  // each feed's time) and the strip runs as one line.
  //
  // No "Whether · whether.work" caption (2026-10-09). It sat inside every
  // interior intro so a cropped screenshot would still name its source, and
  // printed the site's name under the header that names it on every route.
  // The brief's call card keeps it: that card is the block people crop and
  // share, and #1561 kept it there for that reason.

  // No hue on the card itself (2026-10-09). It carried the regime accent in
  // its fill, its border and a 3px rule across its top edge, under a status
  // word that already prints in the regime ink: colour stays where the
  // condition is named, which here is that word. The brief's hero keeps its
  // rule, because that card is the one people crop and share.

  // No box (2026-11-10): the intro is the document's opening, as the guidance block is on
  // `/` (DESIGN.md, "Report intros"). As a raised sheet it inset the title 24px from the
  // left edge of every section under it; a hairline under it now does the separating.
  return (
    <section
      className="relative min-w-0 border-b border-[color:var(--border-default)] pb-[var(--layout-content-gap)]"
      aria-label="Page introduction"
      /* The running head's facts, for every frame after this one (lib/navigation/runningHead.ts). */
      {...frameFactsAttributes({
        regime,
        /* A qualified status (/history's "Latest archived month") is a condition word
           too, and the head keeps its qualifier on the date, so a frame of the record
           does not read as this week's call. It also carries no regime: that page
           draws in neutral ink on purpose. */
        condition: frameCondition ?? ((regime && isRegimeKey(regime)) || statusPrefix ? statusLabel : null),
        date: recordDateLabel ? `${statusPrefix ?? "Data as of"}${statusPrefix ? ": " : " "}${recordDateLabel}` : null,
        title: pageTitle,
        tension: formatNearestChange(trustStrip?.margin, regime),
        tensionNear: Boolean(trustStrip?.couldChangeNextWeek) || trustStrip?.confidenceLabel === "LOW",
      })}
    >
      {/* Two columns once the intro is 48rem wide (by its own width since
          2026-11-03: at lg the report rail takes 13rem of the viewport, so the
          intro split just as it lost the room for it): the reading block keeps
          its measure on the left, the timestamp and actions bank right. Stacked, the hero was a
          full-width box holding a max-w-3xl column, so ~40% of every report
          hero rendered empty — and the CTAs sat a title, a summary and a meta
          line below the fold-line they belong on. */}
      {/* A flex gap rather than space-y: the right column is hidden on a phone
          when nothing in it shows there, and a margin on the left column would
          still have opened 8px under the meta line. */}
      <div className="@container">
        <div className="flex flex-col gap-2 @3xl:grid @3xl:grid-cols-[minmax(0,1fr)_auto] @3xl:items-start @3xl:gap-x-10 @3xl:gap-y-0">
          <div className="min-w-0 space-y-1.5">
            {/* No kicker. "Weekly brief" above every H1 restated the route the
                header tab, the sidebar and the bottom bar already name, and it
                made distinct pages read as variations of one landing page. */}
            <h1
              style={{ viewTransitionName: "page-title" }}
              className="max-w-3xl font-bold text-slate-100 text-fluid-2xl"
            >
              {pageTitle}
            </h1>
            {/* The page's title leads and the condition and date follow as a line of
                facts (2026-11-10). The condition sat above the title, a label over a
                heading, on every report route. The word prints in the condition's ink. */}
            {statusLabel ? (
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 leading-tight">
                {statusPrefix ? (
                  <span className="text-fluid-sm font-medium text-slate-400">{statusPrefix}</span>
                ) : null}
                {/* The week's word in the stamp's shape, the same placard the
                    hero's tag and the sticky strip print. */}
                <span data-regime={statusRegime} className="type-stamp weather-tag-placard text-fluid-base">{statusLabel}</span>
                {introMetaRest ? (
                  <span className="text-fluid-sm font-medium text-slate-400">{introMetaRest}</span>
                ) : null}
              </p>
            ) : introMetaRest ? (
              <p className="text-fluid-sm font-medium leading-4 text-slate-400">{introMetaRest}</p>
            ) : null}
            {/* On a phone a route with a strip drops the summary: the bottom bar
                already names the page, and the strip is the line a reader
                needs before the first task block. */}
            {pageSummary ? (
              <p className={`max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-fluid-base ${trustStrip ? "max-sm:hidden" : ""}`.trim()}>
                {pageSummary}
              </p>
            ) : null}
            {trustStrip ? <TrustStrip {...trustStrip} regime={regime} phoneLayout="line" sourceSummary={Boolean(trustStrip.href)} className="sm:pt-2" /> : null}
          </div>

          <div className={`space-y-3 @3xl:min-w-[14rem] @3xl:max-w-sm @3xl:shrink-0 ${showActions ? "" : "max-sm:hidden"}`.trim()}>
              {/* No operating-loop strip here. "Signals · Conditions · Plan ·
                  Share" sat beside the intro on /signals, /operate and /trust:
                  it read as tabs, named none of the pages it sat on and linked
                  nowhere. The group's real tabs sit above the intro now
                  (`SectionTabs`). */}
              {/* Two dates print inside one viewport, so each says what it
                  is: the strip's "Data as of" is the reading the guidance
                  rests on, and this is when the sources were last checked
                  (2026-10-09; it read "Signals refreshed", which did not say
                  which of the two mattered). */}
              {showStamp ? (
                <p className="text-fluid-sm text-slate-400 max-sm:hidden @3xl:text-right">Checked {fetchedAtLabel}</p>
              ) : null}

              {showActions ? (
                <div className="flex flex-wrap items-center gap-2 @3xl:justify-end">
                  {primaryCta ? (
                    <ReportCta
                      href={primaryCta.href}
                      copyText={primaryCta.copyText}
                      copyTarget={primaryCta.copyTarget}
                      label={primaryCta.label}
                      className="weather-cta weather-cta-primary px-4 py-2"
                    >
                      {primaryCta.label}
                    </ReportCta>
                  ) : null}
                  {exportCta ? (
                    <ReportCta
                      href={exportCta.href}
                      copyText={exportCta.copyText}
                      copyTarget={exportCta.copyTarget}
                      telemetryEvent={exportCta.telemetryEvent}
                      label={exportCta.label}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-slate-700/50 bg-slate-950/40 px-3 py-2 text-center text-xs font-semibold tracking-[0.05em] text-slate-300 hover:border-sky-400/50 hover:text-slate-100"
                    >
                      {exportCta.label}
                    </ReportCta>
                  ) : null}
                </div>
              ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
