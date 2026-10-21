import { ReportCta } from "../reportCta";
import type { ExportCtaProps, ReportCtaProps } from "./types";
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
  trustStatusLabel,
  fetchedAtLabel,
  showOfflineBadge,
  offlineBadgeLabel,
  trustStrip,
}: {
  pageTitle: string;
  pageSummary?: string;
  recordDateLabel: string;
  primaryCta?: ReportCtaProps;
  exportCta?: ExportCtaProps | null;
  statusLabel: string;
  statusPrefix?: string;
  trustStatusLabel: string;
  fetchedAtLabel: string;
  showOfflineBadge: boolean;
  offlineBadgeLabel: string;
  /** The route's trust strip. It carries the record date and the sources, so
   *  the line beside the status word drops both rather than print them twice. */
  trustStrip?: Omit<TrustStripProps, "className">;
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
  return (
    <section
      className="weather-surface-secondary weather-inset relative min-w-0"
      aria-label="Page introduction"
    >
      {/* Two columns from lg up: the reading block keeps its measure on the
          left, the timestamp and actions bank right. Stacked, the hero was a
          full-width box holding a max-w-3xl column, so ~40% of every report
          hero rendered empty — and the CTAs sat a title, a summary and a meta
          line below the fold-line they belong on. */}
      {/* A flex gap rather than space-y: the right column is hidden on a phone
          when nothing in it shows there, and a margin on the left column would
          still have opened 8px under the meta line. */}
      <div className="flex flex-col gap-2 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-x-10 lg:gap-y-0">
        <div className="min-w-0 space-y-1.5">
          {/* No kicker. "Weekly brief" above every H1 restated the route the
              header tab, the sidebar and the bottom bar already name, and it
              made distinct pages read as variations of one landing page. */}
          {/* The condition leads, the page title follows. A phone shows the
              route name in the bottom bar already, and the week's word —
              Freezing, Sunny — is the fact the reader came for. The word
              prints in the regime ink at the reading's own size; the trust
              headline and the record date stay micro under it. */}
          {statusLabel ? (
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 leading-tight">
              {statusPrefix ? (
                <span className="text-fluid-xs font-medium text-slate-400">{statusPrefix}</span>
              ) : null}
              {/* The week's word in the stamp's shape, the same placard the
                  hero's tag and the sticky strip print. */}
              <span className="type-stamp weather-tag-placard self-center rounded-sm border px-2 py-0.5 text-fluid-xs font-semibold">{statusLabel}</span>
              {introMetaRest ? (
                <span className="text-fluid-xs font-medium text-slate-400">{introMetaRest}</span>
              ) : null}
            </p>
          ) : introMetaRest ? (
            <p className="text-fluid-xs font-medium leading-4 text-slate-400">{introMetaRest}</p>
          ) : null}
          <h1
            style={{ viewTransitionName: "page-title" }}
            className="max-w-3xl font-semibold text-slate-100 text-fluid-base lg:text-fluid-2xl"
          >
            {pageTitle}
          </h1>
          {/* On a phone a route with a strip drops the summary: the bottom bar
              already names the page, and the strip is the line a reader
              needs before the first task block. */}
          {pageSummary ? (
            <p className={`max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-fluid-base ${trustStrip ? "max-sm:hidden" : ""}`.trim()}>
              {pageSummary}
            </p>
          ) : null}
          {trustStrip ? <TrustStrip {...trustStrip} phoneLayout="line" className="sm:pt-2" /> : null}
        </div>

        <div className={`space-y-3 lg:min-w-[14rem] lg:max-w-sm lg:shrink-0 ${showActions ? "" : "max-sm:hidden"}`.trim()}>
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
              <p className="text-fluid-xs text-slate-400 max-sm:hidden lg:text-right">Checked {fetchedAtLabel}</p>
            ) : null}

            {showActions ? (
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
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
    </section>
  );
}
