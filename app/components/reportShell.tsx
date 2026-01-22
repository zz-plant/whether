/**
 * Shared report shell layout for Whether Report pages.
 * Keeps header, navigation, and layout consistent across multi-page views.
 */
import type { ReactNode } from "react";
import { DisplayGuardian } from "./displayGuardian";
import {
  ReportDataTimestamps,
  ReportInterpretationNotes,
  ReportMobileNavigation,
  ReportPageNavigation,
  type ReportPageLink,
  type ReportSectionLink,
} from "./reportShellNavigation";

export const ReportShell = ({
  children,
  statusLabel,
  recordDateLabel,
  fetchedAtLabel,
  treasurySource,
  pageTitle,
  pageSummary,
  pageLinks,
  sectionLinks,
  trustStatusLabel,
  trustStatusDetail,
  trustStatusAction,
  trustStatusTone,
  showOfflineBadge = false,
  offlineBadgeLabel = "OFFLINE / SIMULATED",
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
  pageLinks: ReportPageLink[];
  sectionLinks: ReportSectionLink[];
  trustStatusLabel: string;
  trustStatusDetail: string;
  trustStatusAction: string;
  trustStatusTone: "stable" | "warning" | "historical";
  showOfflineBadge?: boolean;
  offlineBadgeLabel?: string;
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

  return (
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
      <div className="pointer-events-none absolute inset-0 hidden sm:block weather-aurora" />
      <div className="pointer-events-none absolute inset-0 hidden sm:block weather-haze" />
      <div className="pointer-events-none absolute left-1/2 top-0 hidden h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-sky-400/15 blur-[190px] sm:block" />
      <div className="pointer-events-none absolute -right-24 top-24 hidden h-[420px] w-[420px] rounded-full bg-fuchsia-400/10 blur-[160px] sm:block" />
      <div className="mx-auto max-w-7xl pb-[calc(env(safe-area-inset-bottom)+12rem)] pt-3 pl-[calc(env(safe-area-inset-left)+1rem)] pr-[calc(env(safe-area-inset-right)+1rem)] sm:pb-12 sm:pt-6 sm:pl-[calc(env(safe-area-inset-left)+1.5rem)] sm:pr-[calc(env(safe-area-inset-right)+1.5rem)]">
        <header className="weather-appbar sticky top-3 z-20 px-4 py-5 sm:top-4 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold tracking-[0.2em] text-slate-300 sm:text-xs sm:tracking-[0.14em]">
              <span className="rounded-full border border-slate-800/70 px-3 py-1">{statusLabel}</span>
              <span className={`rounded-full border px-3 py-1 ${trustToneStyles}`}>
                {trustStatusLabel}
              </span>
              {showOfflineBadge ? (
                <span className="rounded-full border border-rose-400/60 bg-rose-500/10 px-3 py-1 text-rose-100">
                  {offlineBadgeLabel}
                </span>
              ) : null}
            </div>
          </div>
          <ReportPageNavigation
            pageLinks={pageLinks}
            pageTitle={pageTitle}
            className="mt-4 -mx-4 px-4 sm:mx-0 sm:px-0"
          />
        </header>

        {historicalBanner}

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px,1fr]">
          <aside className="order-2 space-y-4 lg:order-none lg:sticky lg:top-28 lg:self-start">
            <section className="weather-panel space-y-3 px-4 py-4">
              <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">You are here</p>
              <p className="text-lg font-semibold text-slate-100">{pageTitle}</p>
              <p className="text-sm text-slate-300">{pageSummary}</p>
              <div className="space-y-2 text-xs text-slate-300">
                <p className="text-xs font-semibold text-slate-400">Updated</p>
                <p className="mono text-slate-100">{fetchedAtLabel}</p>
              </div>
            </section>

            <section className={`weather-panel flex flex-col gap-3 px-4 py-4 ${trustToneStyles}`}>
              <p className={`text-xs font-semibold tracking-[0.18em] ${trustLabelTone}`}>
                Signal confidence
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
                <ul className="mt-3 space-y-2">
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
              </nav>
            ) : null}

            <ReportDataTimestamps
              recordDateLabel={recordDateLabel}
              fetchedAtLabel={fetchedAtLabel}
              treasurySource={treasurySource}
            />
          </aside>

          <div className="order-1 space-y-6 lg:order-none">
            <section className="weather-panel-static space-y-4 px-4 py-5 sm:px-5">
              <div className="space-y-3">
                <p className="text-xs font-semibold tracking-[0.32em] text-slate-400">
                  Weekly product guidance
                </p>
                <h1 className="type-headline text-slate-100">Whether Report</h1>
                <p className="max-w-2xl text-sm text-slate-200 sm:text-base">
                  A fast, sourced readout of Treasury signals translated into product guidance.
                </p>
              </div>
              <div className="weather-surface flex flex-col gap-2 px-4 py-3 sm:hidden">
                <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">
                  Quick glance
                </p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-2xl font-semibold text-slate-100">{statusLabel}</span>
                  <span className={`rounded-full border px-3 py-1 text-[10px] ${trustToneStyles}`}>
                    {trustStatusLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-300">Signals stamped {recordDateLabel}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href="#weekly-action-summary"
                  className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.2em] transition-colors hover:border-sky-300/80 hover:text-white touch-manipulation"
                >
                  Start with this week
                </a>
                <a
                  href="#executive-snapshot"
                  className="inline-flex min-h-[44px] items-center justify-center text-xs font-semibold tracking-[0.12em] text-slate-200 underline decoration-slate-400 underline-offset-4 hover:text-slate-100 touch-manipulation sm:justify-start"
                >
                  See leadership summary
                </a>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="weather-panel flex flex-col gap-4 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-300">Current operating climate</p>
                    <span className="text-3xl font-semibold tracking-tight text-slate-100">
                      {statusLabel}
                    </span>
                    <p className="text-xs text-slate-300">Signals stamped {recordDateLabel}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div
                      className={`rounded-full border px-3 py-2 text-xs font-semibold tracking-[0.12em] ${trustToneStyles}`}
                    >
                      {trustStatusLabel}
                    </div>
                    {showOfflineBadge ? (
                      <span className="rounded-full border border-rose-400/60 bg-rose-500/10 px-3 py-2 text-xs font-semibold tracking-[0.12em] text-rose-100">
                        {offlineBadgeLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="text-sm text-slate-300">
                  You are likely balancing delivery pressure with budget scrutiny. Use the climate
                  label as a neutral, external anchor in planning conversations.
                </p>
                <ReportInterpretationNotes />
              </div>
              <div className="weather-panel flex flex-col gap-4 px-5 py-4">
                <p className="text-xs font-semibold text-slate-300">The readout in one line</p>
                <p className="text-sm text-slate-200">
                  Anchor planning conversations with the climate label and share the supporting
                  signals if leadership needs proof.
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="rounded-full border border-slate-700/70 px-3 py-1 font-semibold tracking-[0.12em] text-slate-200">
                    Record date {recordDateLabel}
                  </span>
                  <span className="rounded-full border border-slate-800/70 px-3 py-1 font-semibold tracking-[0.12em] text-slate-300">
                    {trustStatusLabel}
                  </span>
                </div>
              </div>
            </section>

            {children}

            <footer className="mt-12 border-t border-slate-800/70 pt-6 text-xs font-semibold tracking-[0.18em] text-slate-400">
              Not Financial Advice.
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
  );
};
