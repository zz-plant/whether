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
      <div className="pointer-events-none absolute inset-0 weather-aurora" />
      <div className="pointer-events-none absolute inset-0 weather-haze" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-sky-400/15 blur-[190px]" />
      <div className="pointer-events-none absolute -right-24 top-24 h-[420px] w-[420px] rounded-full bg-fuchsia-400/10 blur-[160px]" />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="relative flex flex-col gap-6 border-b border-slate-800/70 pb-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0 space-y-4">
              <p className="type-label text-slate-300">Weekly product guidance</p>
              <div className="space-y-3">
                <h1 className="type-headline text-slate-100">Whether Report</h1>
                <p className="max-w-2xl type-data text-slate-200">
                  A plain-English brief that turns Treasury signals into week-by-week product and
                  engineering constraints. Every output is sourced and time-stamped for traceability.
                </p>
              </div>
              <div className="max-w-2xl space-y-2 border-l border-slate-800/80 pl-4">
                <p className="text-xs font-semibold text-slate-300">You&rsquo;re reading</p>
                <p className="text-base font-semibold text-slate-100">{pageTitle}</p>
                <p className="text-sm text-slate-300">{pageSummary}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
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
                      Start with user outcomes and ROI. If the idea still wins, keep it on the table.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-slate-400">2</span>
                    <span className="break-words">
                      Let the climate dictate pacing, staffing, and sequencing—not whether the idea
                      matters.
                    </span>
                  </li>
                </ul>
              </details>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#weekly-action-summary"
                  className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.2em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
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
            </div>
            <div className={`weather-panel flex flex-col gap-4 px-5 py-4 ${trustToneStyles}`}>
              <p className={`text-sm font-semibold ${trustLabelTone}`}>Confidence in the signals</p>
              <div className="space-y-2 text-sm">
                <p className="font-semibold">{trustStatusLabel}</p>
                <p className="text-sm text-slate-200/90">{trustStatusDetail}</p>
                <p className="text-xs text-slate-200/90">{trustStatusAction}</p>
              </div>
            </div>
          </div>
          {sectionLinks.length > 0 ? (
            <nav aria-label="Report sections" className="space-y-3">
              <p className="text-sm font-semibold text-slate-300">Jump to</p>
              <div className="flex flex-wrap gap-3">
                <ul className="flex flex-wrap gap-3">
                  {sectionLinks.map((item) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        className="weather-pill inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-2">
            <details className="group">
              <summary className="weather-pill-muted inline-flex min-h-[44px] cursor-pointer items-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.1em] transition-colors hover:border-slate-500/80 hover:text-slate-100 touch-manipulation">
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
              <div className="weather-panel mt-3 px-5 py-4">
                <p className="text-xs font-semibold text-slate-100">Proof the data is current</p>
                <dl className="mt-4 space-y-3 text-sm text-slate-300">
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
              </div>
            </details>
            <section className="weather-panel flex flex-col gap-3 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-100">Explore other report paths</p>
                <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs font-semibold tracking-[0.12em] text-slate-300">
                  {pageLinks.length}
                </span>
              </div>
              <nav aria-label="Report paths">
                <ul className="grid gap-3 md:grid-cols-3">
                  {pageLinks.map((link) => {
                    const isActive = link.label === pageTitle;
                    const icon = pageLinkIcons[link.label];
                    return (
                      <li key={link.href}>
                      <a
                        href={link.href}
                        aria-current={isActive ? "page" : undefined}
                        className={`weather-tile flex min-h-[84px] flex-col gap-3 px-4 py-3 text-left text-sm font-semibold tracking-[0.08em] transition-colors touch-manipulation ${
                          isActive
                            ? "border-sky-400/70 bg-sky-500/20 text-sky-100"
                            : "text-slate-300 hover:border-sky-300/70 hover:text-slate-100"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="weather-icon-chip text-slate-100">{icon}</span>
                          <span>{link.label}</span>
                        </span>
                        <span className="text-xs font-normal tracking-normal text-slate-300">
                          {link.description}
                        </span>
                      </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </section>
          </div>
          {historicalBanner}
        </header>

        {children}

        <footer className="mt-12 border-t border-slate-800/70 pt-6 text-xs font-semibold tracking-[0.18em] text-slate-400">
          Not Financial Advice.
        </footer>
      </div>
    </main>
  );
};
