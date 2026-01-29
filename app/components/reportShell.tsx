/**
 * Shared report shell layout for Whether Report pages.
 * Keeps header, navigation, and layout consistent across multi-page views.
 */
import { Children, type ReactNode, isValidElement } from "react";
import { DisplayGuardian } from "./displayGuardian";
import {
  ReportDataTimestamps,
  ReportMobileNavigation,
  ReportPageNavigation,
  type ReportPageLink,
  type ReportSectionLink,
} from "./reportShellNavigation";
import { ReportSummaryTabs } from "./reportSummaryTabs";

export const ReportShell = ({
  children,
  statusLabel,
  recordDateLabel,
  fetchedAtLabel,
  treasurySource,
  pageTitle,
  pageSummary,
  pageSummaryLink,
  pageLinks,
  sectionLinks,
  trustStatusLabel,
  trustStatusDetail,
  trustStatusAction,
  trustStatusTone,
  showOfflineBadge = false,
  offlineBadgeLabel = "Cached snapshot",
  heroVariant = "full",
  pageNavVariant = "full",
  primaryCta = { href: "#weekly-action-summary", label: "Start with this week" },
  secondaryCta = { href: "#executive-snapshot", label: "See leadership summary" },
  exportCta = {
    href: "/operations/briefings#ops-export-briefs",
    label: "Copy-ready leadership brief",
  },
  structuredData,
  historicalBanner,
}: {
  children: ReactNode;
  statusLabel: string;
  recordDateLabel: string;
  fetchedAtLabel: string;
  treasurySource: string;
  pageTitle: string;
  pageSummary: string;
  pageSummaryLink?: { href: string; label: string };
  pageLinks: ReportPageLink[];
  sectionLinks: ReportSectionLink[];
  trustStatusLabel: string;
  trustStatusDetail: string;
  trustStatusAction: string;
  trustStatusTone: "stable" | "warning" | "historical";
  showOfflineBadge?: boolean;
  offlineBadgeLabel?: string;
  heroVariant?: "full" | "compact";
  pageNavVariant?: "full" | "compact";
  primaryCta?: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
  exportCta?: { href: string; label: string } | null;
  structuredData?: string;
  historicalBanner?: ReactNode;
}) => {
  const trustToneStyles =
    trustStatusTone === "warning"
      ? "border-amber-400/60 bg-amber-500/10 text-amber-100"
      : trustStatusTone === "historical"
        ? "border-slate-500/60 bg-slate-900/70 text-slate-200"
        : "border-emerald-400/60 bg-emerald-500/10 text-emerald-100";
  const trustLabelTone =
    trustStatusTone === "warning"
      ? "text-amber-200"
      : trustStatusTone === "historical"
        ? "text-slate-400"
        : "text-emerald-200";
  const contentSections = Children.toArray(children);
  const summaryLink = pageSummaryLink ? (
    <a
      href={pageSummaryLink.href}
      className="inline-flex min-h-[44px] items-center text-xs font-semibold text-sky-200 underline decoration-slate-500/80 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
    >
      {pageSummaryLink.label}
    </a>
  ) : null;

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-full focus:bg-slate-950 focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:tracking-[0.2em] focus:text-slate-100 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-sky-300"
      >
        Skip to main content
      </a>
      <main
        id="main-content"
        tabIndex={-1}
        className="weather-shell relative min-h-screen overflow-hidden text-slate-100"
      >
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredData }}
        />
      ) : null}
      <DisplayGuardian />
      <div className="pointer-events-none absolute inset-0 weather-grid" />
      <div className="mx-auto max-w-7xl pb-[calc(env(safe-area-inset-bottom)+12rem)] pt-3 pl-[calc(env(safe-area-inset-left)+1rem)] pr-[calc(env(safe-area-inset-right)+1rem)] sm:pb-12 sm:pt-6 sm:pl-[calc(env(safe-area-inset-left)+1.5rem)] sm:pr-[calc(env(safe-area-inset-right)+1.5rem)]">
        <header className="weather-appbar sticky top-3 z-20 px-4 py-4 sm:top-4 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="weather-icon-chip text-slate-100">
                <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                  <path
                    d="M4 14.5a6.5 6.5 0 0 1 12.8-2.4A4.5 4.5 0 1 1 18 21H7.6A5.1 5.1 0 0 1 4 14.5Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 9.5a4 4 0 0 1 6.9 2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <div>
                <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">Whether</p>
                <p className="text-sm font-semibold text-slate-100">Market Climate Station</p>
                <p className="text-xs text-slate-400 sm:hidden">Signals refreshed {fetchedAtLabel}</p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 text-[9px] font-semibold tracking-[0.16em] text-slate-300 sm:items-end sm:text-xs sm:tracking-[0.14em]">
              <span className="rounded-full border border-slate-800/70 px-3 py-1">
                Operating climate: {statusLabel}
              </span>
              <span className="text-[10px] font-semibold tracking-[0.18em] text-slate-400">
                Data mode: {trustStatusLabel}
                {showOfflineBadge ? ` · ${offlineBadgeLabel}` : ""}
              </span>
            </div>
          </div>
          <ReportPageNavigation
            pageLinks={pageLinks}
            pageTitle={pageTitle}
            variant={pageNavVariant}
            className="mt-4 -mx-4 hidden px-4 sm:mx-0 sm:block sm:px-0"
          />
        </header>

        {historicalBanner}

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px,1fr]">
          <aside className="order-2 space-y-4 lg:order-none lg:sticky lg:top-28 lg:self-start">
            <section className="weather-panel space-y-3 px-4 py-4">
              <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">Page overview</p>
              <p className="text-base font-semibold text-slate-100">{pageTitle}</p>
              <p className="text-sm text-slate-300">{pageSummary}</p>
              <div className="space-y-2 text-xs text-slate-300">
                <p className="text-xs font-semibold text-slate-400">Updated</p>
                <p className="mono text-slate-100">{fetchedAtLabel}</p>
              </div>
            </section>

            <section className={`weather-panel flex flex-col gap-3 px-4 py-4 ${trustToneStyles}`}>
              <p className={`text-xs font-semibold tracking-[0.18em] ${trustLabelTone}`}>
                Data confidence
              </p>
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-slate-100">{trustStatusLabel}</p>
                <p className="text-sm text-slate-200/90">{trustStatusDetail}</p>
                <p className="text-xs text-slate-200/80">{trustStatusAction}</p>
              </div>
            </section>

            {sectionLinks.length > 0 ? (
              <nav aria-label="Report sections" className="weather-panel px-4 py-4">
                <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">Sections</p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
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
              </nav>
            ) : null}

            <ReportDataTimestamps
              recordDateLabel={recordDateLabel}
              fetchedAtLabel={fetchedAtLabel}
              treasurySource={treasurySource}
            />
          </aside>

          <div className="order-1 space-y-10 lg:order-none lg:space-y-12">
            <section className="weather-panel-static space-y-4 px-4 py-5 sm:px-5">
              <div className="space-y-3">
                {heroVariant === "compact" ? (
                  <>
                    <p className="text-xs font-semibold tracking-[0.26em] text-slate-400 sm:tracking-[0.32em]">
                      Whether report
                    </p>
                    <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
                      {pageTitle}
                    </h1>
                    <p className="flex max-w-2xl flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-200 sm:text-base">
                      <span>{pageSummary}</span>
                      {summaryLink}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold tracking-[0.26em] text-slate-400 sm:tracking-[0.32em]">
                      Weekly product guidance
                    </p>
                    <h1 className="type-headline text-slate-100">Whether Report</h1>
                    <p className="max-w-2xl text-sm text-slate-200 sm:text-base">
                      A fast, sourced readout of public Treasury signals translated into product
                      guidance. Interpret as planning input, not official advice.
                    </p>
                  </>
                )}
              </div>
              <div className="weather-surface weather-quick-glance flex flex-col gap-2 px-4 py-3 sm:hidden">
                <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">
                  Quick glance
                </p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-2xl font-semibold text-slate-100">{statusLabel}</span>
                </div>
                <p className="text-xs text-slate-300">Signals stamped {recordDateLabel}</p>
                <p className="text-xs text-slate-300">Confidence: {trustStatusLabel}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
                <a
                  href={primaryCta.href}
                  className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-[11px] font-semibold tracking-[0.2em] shadow-lg shadow-sky-500/20 transition-colors hover:border-sky-300/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation sm:text-xs"
                >
                  {primaryCta.label}
                </a>
                {secondaryCta ? (
                  <a
                    href={secondaryCta.href}
                    className="inline-flex min-h-[44px] items-center justify-center text-[11px] font-semibold tracking-[0.12em] text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation sm:justify-start sm:text-xs"
                  >
                    {secondaryCta.label}
                  </a>
                ) : null}
                {exportCta ? (
                  <a
                    href={exportCta.href}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-700/70 px-3 py-2 text-[11px] font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-300/80 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation sm:text-xs"
                  >
                    {exportCta.label}
                  </a>
                ) : null}
              </div>
            </section>

            <div className="space-y-4">
              <ReportSummaryTabs
                statusLabel={statusLabel}
                recordDateLabel={recordDateLabel}
                trustStatusLabel={trustStatusLabel}
                trustStatusDetail={trustStatusDetail}
                trustStatusAction={trustStatusAction}
                trustToneStyles={trustToneStyles}
              />
            </div>

            <div className="space-y-12">
              {contentSections.map((section, index) => {
                const sectionKey =
                  isValidElement(section) && section.key != null
                    ? section.key
                    : `section-${index}`;
                return (
                  <div
                    key={sectionKey}
                    className={index === 0 ? "" : "border-t border-slate-800/70 pt-10"}
                  >
                    {section}
                  </div>
                );
              })}
            </div>

            <footer className="mt-12 border-t border-slate-800/70 pt-6 text-xs font-semibold tracking-[0.18em] text-slate-400">
              Not financial, legal, or investment advice.
            </footer>
          </div>
        </div>
      </div>
      <div className="sm:hidden">
        <ReportMobileNavigation
          pageLinks={pageLinks}
          pageTitle={pageTitle}
          sectionLinks={sectionLinks}
          className="fixed inset-x-0 bottom-0 z-30 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 pl-[calc(env(safe-area-inset-left)+1rem)] pr-[calc(env(safe-area-inset-right)+1rem)]"
        />
      </div>
      </main>
    </>
  );
};
