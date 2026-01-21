/**
 * Shared report shell layout for Whether Report pages.
 * Keeps header, navigation, and layout consistent across multi-page views.
 */
import type { ReactNode } from "react";
import { DisplayGuardian } from "./displayGuardian";

type ReportPageLink = {
  href: string;
  label: string;
  description: string;
};

type ReportSectionLink = {
  href: string;
  label: string;
};

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
      <div className="mx-auto max-w-7xl pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-4 pl-[calc(env(safe-area-inset-left)+1rem)] pr-[calc(env(safe-area-inset-right)+1rem)] sm:px-6 sm:pb-12 sm:pt-6">
        <header className="weather-appbar sticky top-4 z-20 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
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
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-[0.14em] text-slate-300">
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
          <nav aria-label="Report paths" className="mt-4 -mx-4 px-4 sm:mx-0 sm:px-0">
            <ul className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
              {pageLinks.map((link) => {
                const isActive = link.label === pageTitle;
                return (
                  <li key={link.href} className="flex-shrink-0">
                    <a
                      href={link.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`weather-tab inline-flex min-h-[44px] items-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors touch-manipulation ${
                        isActive
                          ? "border-sky-400/70 bg-sky-500/20 text-sky-100"
                          : "text-slate-300 hover:border-sky-400/70 hover:text-slate-100"
                      }`}
                    >
                      <span className="hidden sm:inline-flex">{pageLinkIcons[link.label]}</span>
                      {link.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </header>

        {historicalBanner}

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px,1fr]">
          <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
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

            <details className="group weather-panel px-4 py-4">
              <summary className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-xs font-semibold tracking-[0.1em] text-slate-200 transition-colors hover:text-slate-100 touch-manipulation">
                Data timestamps
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700/70 text-slate-300 transition-transform duration-200 group-open:rotate-180">
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
              </summary>
              <dl className="mt-3 space-y-3 text-sm text-slate-300">
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
            </details>
          </aside>

          <div className="space-y-6">
            <section className="weather-panel-static space-y-4 px-5 py-5">
              <div className="space-y-3">
                <p className="text-xs font-semibold tracking-[0.32em] text-slate-400">
                  Weekly product guidance
                </p>
                <h1 className="type-headline text-slate-100">Whether Report</h1>
                <p className="max-w-2xl text-sm text-slate-200 sm:text-base">
                  A fast, sourced readout of Treasury signals translated into product guidance.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#weekly-action-summary"
                  className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.2em] transition-colors hover:border-sky-300/80 hover:text-white touch-manipulation"
                >
                  Start with this week
                </a>
                <a
                  href="#executive-snapshot"
                  className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.12em] text-slate-200 underline decoration-slate-400 underline-offset-4 hover:text-slate-100 touch-manipulation"
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
                <details className="group">
                  <summary className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:text-slate-100 touch-manipulation">
                    <span>How to interpret this week</span>
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700/70 text-slate-300 transition-transform duration-200 group-open:rotate-180">
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
                  </summary>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    <li className="flex gap-2">
                      <span className="text-slate-400">1</span>
                      <span className="break-words">
                        Start with user outcomes and ROI. If the idea still wins, keep it on the
                        table.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">2</span>
                      <span className="break-words">
                        Let the climate dictate pacing, staffing, and sequencing—not whether the
                        idea matters.
                      </span>
                    </li>
                  </ul>
                </details>
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
        <nav
          aria-label="Mobile report navigation"
          className="fixed inset-x-0 bottom-0 z-30 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 pl-[calc(env(safe-area-inset-left)+1rem)] pr-[calc(env(safe-area-inset-right)+1rem)]"
        >
          <div className="weather-panel flex items-center justify-between gap-2 px-3 py-2">
            {pageLinks.map((link) => {
              const isActive = link.label === pageTitle;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1 text-[10px] font-semibold tracking-[0.2em] transition-colors touch-manipulation ${
                    isActive
                      ? "bg-sky-500/15 text-sky-100"
                      : "text-slate-300 hover:text-slate-100"
                  }`}
                >
                  <span className="text-slate-200">{pageLinkIcons[link.label]}</span>
                  <span className="uppercase">{link.label}</span>
                </a>
              );
            })}
            {sectionLinks.length > 0 ? (
              <details className="group relative flex-1">
                <summary className="flex min-h-[52px] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1 text-[10px] font-semibold tracking-[0.2em] text-slate-300 transition-colors hover:text-slate-100 touch-manipulation">
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
                </summary>
                <div className="absolute bottom-full left-0 right-0 mb-3">
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
                </div>
              </details>
            ) : null}
          </div>
        </nav>
      </div>
    </main>
  );
};
