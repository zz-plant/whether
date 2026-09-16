import { ReportCta } from "../reportCta";
import { ShareRailButton } from "./ShareRailButton";
import type { ExportCtaProps, ReportCtaProps } from "./types";

/**
 * The one page intro block a report route gets (ui-ux-standards §XI): kicker,
 * status line, title, one-sentence summary, the refresh stamp, and at most the
 * actions a route asks for. It used to also accept a decision banner, a
 * mission line, a trust action and a role switcher that it never read or that
 * no route ever passed, an inline "↓" link that always pointed at the block
 * directly beneath it, and a secondary button that always pointed at `/`.
 */
export function CommandCenterNavBlock({
  pageTitle,
  pageSummary,
  recordDateLabel,
  primaryCta,
  exportCta,
  showShare = false,
  statusLabel,
  trustStatusLabel,
  fetchedAtLabel,
  resolvedNextRefreshLabel,
  showOfflineBadge,
  offlineBadgeLabel,
}: {
  pageTitle: string;
  pageSummary: string;
  recordDateLabel: string;
  primaryCta?: ReportCtaProps;
  exportCta?: ExportCtaProps | null;
  /** Opens the one global share rail — the same formats, the same island, as / and /share. */
  showShare?: boolean;
  statusLabel: string;
  trustStatusLabel: string;
  fetchedAtLabel: string;
  resolvedNextRefreshLabel?: string;
  showOfflineBadge: boolean;
  offlineBadgeLabel: string;
}) {
  // The status word leads and prints in the regime ink — it is this page's
  // equivalent of the hero's stamp, and the only word on the route that
  // names the week. The rest of the line stays neutral.
  const introMetaRest = [
    trustStatusLabel,
    // Interpolated only when there is a date. `As of ${x}` is a truthy string
    // even when x is "", so the filter below could never drop it, and a caller
    // passing no record date printed a bare "As of" with nothing after it.
    recordDateLabel ? `As of ${recordDateLabel}` : null,
    showOfflineBadge ? offlineBadgeLabel : null,
  ]
    .filter(Boolean)
    .join(" • ");
  // Same rule for the refresh stamp: /history passes no fetch time, and
  // printed "Updated " with nothing after it.
  const showStamp = Boolean(fetchedAtLabel) || Boolean(resolvedNextRefreshLabel);
  const showActions = Boolean(primaryCta) || showShare || Boolean(exportCta);

  return (
    <section
      className="weather-surface-secondary weather-page-intro relative min-w-0 px-4 py-4 sm:px-5 sm:py-5"
      aria-label="Page introduction"
    >
      {/* Two columns from lg up: the reading block keeps its measure on the
          left, the timestamp and actions bank right. Stacked, the hero was a
          full-width box holding a max-w-3xl column, so ~40% of every report
          hero rendered empty — and the CTAs sat a title, a summary and a meta
          line below the fold-line they belong on. */}
      <div className="space-y-3 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-x-10 lg:space-y-0">
        <div className="min-w-0 space-y-2">
          <p className="type-label text-slate-400">Weekly brief</p>
          <p className="text-fluid-micro leading-4 text-slate-400">
            {statusLabel ? (
              <span className="font-semibold text-[color:var(--regime-ink)]">{statusLabel}</span>
            ) : null}
            {statusLabel && introMetaRest ? " • " : null}
            {introMetaRest}
          </p>
          <h1 style={{ viewTransitionName: "page-title" }} className="max-w-3xl font-semibold text-slate-100 text-fluid-2xl">{pageTitle}</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-fluid-base">
            {pageSummary}
          </p>
        </div>

        {showStamp || showActions ? (
          <div className="space-y-3 lg:min-w-[14rem] lg:max-w-sm lg:shrink-0">
            {showStamp ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-fluid-xs text-slate-400 lg:justify-end lg:text-right">
                {fetchedAtLabel ? <span>Updated {fetchedAtLabel}</span> : null}
                {resolvedNextRefreshLabel ? (
                  <span>{resolvedNextRefreshLabel}</span>
                ) : null}
              </div>
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
                {showShare ? (
                  <ShareRailButton />
                ) : exportCta ? (
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
        ) : null}
      </div>
    </section>
  );
}
