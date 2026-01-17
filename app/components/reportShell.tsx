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
  structuredData?: string;
  historicalBanner?: ReactNode;
}) => {
  const primarySectionLinks = sectionLinks.slice(0, 3);
  const secondarySectionLinks = sectionLinks.slice(3);
  const pageLinkIcons: Record<string, ReactNode> = {
    Overview: (
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
    "Signals & thresholds": (
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
    "Operations playbook": (
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
      <div className="pointer-events-none absolute inset-0 weather-haze" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-sky-400/15 blur-[190px]" />
      <div className="pointer-events-none absolute right-[-120px] top-[20%] h-[520px] w-[520px] rounded-full bg-cyan-500/15 blur-[190px]" />
      <div className="pointer-events-none absolute left-[-120px] top-[40%] h-[420px] w-[420px] rounded-full bg-indigo-500/15 blur-[180px]" />
      <div className="mx-auto max-w-6xl px-6 py-12 display-drift">
        <header className="relative flex flex-col gap-6 border-b border-slate-800/70 pb-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0 space-y-4">
              <p className="type-label text-slate-400">Regime Station</p>
              <div className="space-y-3">
                <h1 className="type-headline text-slate-100">Whether Report</h1>
                <p className="max-w-2xl type-data text-slate-300">
                  A deep-realist operating brief that translates Treasury signals into constraints you can
                  execute. Every output is sourced and time-stamped for traceability.
                </p>
              </div>
            </div>
            <div className="weather-panel flex min-w-[220px] flex-col items-start gap-3 px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                Current conditions
              </p>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-semibold tracking-tight text-slate-100">
                  {statusLabel}
                </span>
                <span className="weather-chip px-3 py-1 text-[10px] uppercase tracking-[0.2em]">
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Signals stamped {recordDateLabel}
              </p>
            </div>
          </div>
          <div className="weather-panel px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Forecast lane</p>
            <div className="mt-3 space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-100">
                {pageTitle}
              </p>
              <p className="text-sm text-slate-300">{pageSummary}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="weather-panel px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Record date</p>
              <p className="mono mt-3 text-sm text-slate-100">{recordDateLabel}</p>
            </div>
            <div className="weather-panel px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Fetched at</p>
              <p className="mono mt-3 text-sm text-slate-100">{fetchedAtLabel}</p>
            </div>
            <div className="weather-panel px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Source</p>
              <a
                href={treasurySource}
                target="_blank"
                rel="noreferrer"
                className="touch-target mt-3 inline-flex min-h-[44px] items-center text-xs text-slate-300 underline decoration-slate-700 underline-offset-4 hover:text-slate-100"
              >
                US Treasury Fiscal Data API
              </a>
            </div>
          </div>
          <nav aria-label="Report pages" className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Report lanes</p>
            <ul className="grid gap-3 md:grid-cols-3">
              {pageLinks.map((link) => {
                const isActive = link.label === pageTitle;
                const icon = pageLinkIcons[link.label];
                return (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`weather-tile flex min-h-[96px] flex-col gap-3 px-4 py-3 text-left text-xs uppercase tracking-[0.2em] transition-colors ${
                        isActive
                          ? "border-sky-400/70 bg-sky-500/20 text-sky-100"
                          : "text-slate-300 hover:border-sky-300/70 hover:text-slate-100"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="weather-icon-chip text-slate-100">{icon}</span>
                        <span>{link.label}</span>
                      </span>
                      <span className="text-[11px] normal-case tracking-normal text-slate-300">
                        {link.description}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
          {sectionLinks.length > 0 ? (
            <nav aria-label="Report sections" className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Jump to</p>
              <div className="flex flex-wrap gap-3">
                <ul className="flex flex-wrap gap-3">
                  {primarySectionLinks.map((item) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        className="weather-pill inline-flex min-h-[44px] items-center px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-slate-300 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
                {secondarySectionLinks.length > 0 ? (
                  <details className="group">
                    <summary className="weather-pill inline-flex min-h-[44px] cursor-pointer items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-slate-300 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation">
                      More sections
                      <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                        {secondarySectionLinks.length}
                      </span>
                    </summary>
                    <ul className="mt-3 flex flex-wrap gap-3">
                      {secondarySectionLinks.map((item) => (
                        <li key={item.href}>
                          <a
                            href={item.href}
                            className="weather-pill inline-flex min-h-[44px] items-center px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-slate-300 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
                          >
                            {item.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            </nav>
          ) : null}
          {historicalBanner}
        </header>

        {children}

        <footer className="mt-12 border-t border-slate-800/70 pt-6 text-xs uppercase tracking-[0.3em] text-slate-500">
          Not Financial Advice.
        </footer>
      </div>
    </main>
  );
};
