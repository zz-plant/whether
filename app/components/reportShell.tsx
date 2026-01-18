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
  structuredData?: string;
  historicalBanner?: ReactNode;
}) => {
  const primarySectionLinks = sectionLinks.slice(0, 3);
  const secondarySectionLinks = sectionLinks.slice(3);
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
      <div className="pointer-events-none absolute inset-0 weather-haze" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-sky-400/15 blur-[190px]" />
      <div className="pointer-events-none absolute right-[-120px] top-[20%] h-[520px] w-[520px] rounded-full bg-cyan-500/15 blur-[190px]" />
      <div className="pointer-events-none absolute left-[-120px] top-[40%] h-[420px] w-[420px] rounded-full bg-indigo-500/15 blur-[180px]" />
      <div className="mx-auto max-w-6xl px-6 py-12 display-drift">
        <header className="relative flex flex-col gap-6 border-b border-slate-800/70 pb-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0 space-y-4">
              <p className="type-label text-slate-400">Weekly product guidance</p>
              <div className="space-y-3">
                <h1 className="type-headline text-slate-100">Whether Report</h1>
                <p className="max-w-2xl type-data text-slate-300">
                  A plain-English brief that turns Treasury signals into week-by-week product and
                  engineering constraints. Every output is sourced and time-stamped for traceability.
                </p>
                <p className="max-w-2xl text-sm text-slate-400">
                  Built for the moments when you need to explain why scope, hiring, or delivery
                  plans should bend with the macro climate—not just internal preference.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="weather-panel flex flex-col gap-4 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                    Current operating climate
                  </p>
                  <span className="text-3xl font-semibold tracking-tight text-slate-100">
                    {statusLabel}
                  </span>
                  <p className="text-xs text-slate-400">Signals stamped {recordDateLabel}</p>
                </div>
                <div className={`rounded-lg border px-3 py-2 text-[11px] uppercase tracking-[0.2em] ${trustToneStyles}`}>
                  {trustStatusLabel}
                </div>
              </div>
              <p className="text-sm text-slate-300">
                You are likely balancing delivery pressure with budget scrutiny. Use the climate
                label as a neutral, external anchor in planning conversations.
              </p>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  How to interpret this week
                </p>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex gap-2">
                    <span className="text-slate-500">1</span>
                    <span className="break-words">
                      Start with user outcomes and ROI. If the idea still wins, keep it on the table.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-slate-500">2</span>
                    <span className="break-words">
                      Let the climate dictate pacing, staffing, and sequencing—not whether the idea
                      matters.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-slate-500">3</span>
                    <span className="break-words">
                      Use the signals below to explain tradeoffs when stakeholders disagree.
                    </span>
                  </li>
                </ul>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#weekly-action-summary"
                  className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
                >
                  Start with this week
                </a>
                <a
                  href="#executive-snapshot"
                  className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
                >
                  See leadership summary
                </a>
              </div>
            </div>
            <div className={`weather-panel flex flex-col gap-4 px-5 py-4 ${trustToneStyles}`}>
              <p className={`text-[10px] uppercase tracking-[0.3em] ${trustLabelTone}`}>
                Confidence in the signals
              </p>
              <div className="space-y-2 text-sm">
                <p className="font-semibold uppercase tracking-[0.2em]">{trustStatusLabel}</p>
                <p className="text-xs text-slate-200/90">{trustStatusDetail}</p>
                <p className="text-[11px] text-slate-200/90">{trustStatusAction}</p>
              </div>
              <div className="weather-surface p-4 text-sm text-slate-200">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                  When this is most useful
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-200">
                  <li className="flex gap-2">
                    <span className="text-slate-400">•</span>
                    <span className="break-words">
                      You need to justify a slower cadence without sounding risk-averse.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-slate-400">•</span>
                    <span className="break-words">
                      You need to frame why product bets must be staged or time-boxed.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-slate-400">•</span>
                    <span className="break-words">
                      You want shared language for “why now” across leadership.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="weather-panel px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">You're reading</p>
            <div className="mt-3 space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-100">
                {pageTitle}
              </p>
              <p className="text-sm text-slate-300">{pageSummary}</p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="weather-panel px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                Decision flow
              </p>
              <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-100">
                Reduce the cognitive load
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li className="flex gap-2">
                  <span className="text-slate-500">1</span>
                  <span className="break-words">
                    Anchor on customer value and ROI so you keep strategic intent clear.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-slate-500">2</span>
                  <span className="break-words">
                    Let the macro guardrails set pace, scope, and hiring tradeoffs.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-slate-500">3</span>
                  <span className="break-words">
                    Use the signal matrix to document why you chose this week’s plan.
                  </span>
                </li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href="#regime-assessment"
                  className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
                >
                  Understand the scores
                </a>
                <a
                  href="/operations"
                  className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
                >
                  Move to actions
                </a>
              </div>
            </div>
            <div className="weather-panel px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                Data timestamps
              </p>
              <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-100">
                Proof the data is current
              </p>
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
                      className="touch-target inline-flex min-h-[44px] items-center text-xs text-slate-300 underline decoration-slate-700 underline-offset-4 hover:text-slate-100 touch-manipulation"
                    >
                      US Treasury Fiscal Data API
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <nav aria-label="Report pages" className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Report paths</p>
            <ul className="grid gap-3 md:grid-cols-3">
              {pageLinks.map((link) => {
                const isActive = link.label === pageTitle;
                const icon = pageLinkIcons[link.label];
                return (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`weather-tile flex min-h-[96px] flex-col gap-3 px-4 py-3 text-left text-xs uppercase tracking-[0.2em] transition-colors touch-manipulation ${
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
                      More detail
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
