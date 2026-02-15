/**
 * Shared report shell layout for Whether Report pages.
 * Keeps header, navigation, and layout consistent across multi-page views.
 */
import { Children, type ReactNode, isValidElement } from "react";
import { DisplayGuardian } from "./displayGuardian";
import { MobileActionSheet } from "./mobileActionSheet";
import {
  OperatorCommandCenter,
  type OperatorCommandAction,
} from "./operatorCommandCenter";
import {
  ReportMobileNavigation,
  ReportPageNavigation,
  type ReportPageLink,
  type ReportSectionLink,
} from "./reportShellNavigation";
import { type ReportStageItem } from "./reportRevampElements";

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
  sidebarVariant = "full",
  primaryCta = { href: "#weekly-action-summary", label: "Start with this week" },
  secondaryCta = { href: "#executive-snapshot", label: "See leadership summary" },
  exportCta = {
    href: "/operations/briefings#ops-export-briefs",
    label: "Copy-ready leadership brief",
  },
  structuredData,
  historicalBanner,
  currentPath,
  stageRail,
  decisionBanner,
  actionSequence,
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
  sidebarVariant?: "full" | "hidden";
  primaryCta?: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
  exportCta?: { href: string; label: string } | null;
  structuredData?: string;
  historicalBanner?: ReactNode;
  currentPath: string;
  stageRail?: {
    title?: string;
    items: ReportStageItem[];
  };
  decisionBanner?: {
    label?: string;
    decision: string;
    horizon: string;
    confidence: string;
    confidenceScore?: number;
    effectiveDate: string;
    evidenceHref?: string;
  };
  actionSequence?: {
    title: string;
    items: Array<{ title: string; detail: string; href: string; cta: string }>;
  };
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
  const hasSidebar = sidebarVariant === "full";
  const missionSequenceLabels = ["Now", "Next", "Later"];
  const missionSequenceItems = (actionSequence?.items ?? []).slice(0, 3).map((item, index) => ({
    ...item,
    phase: missionSequenceLabels[index] ?? `Step ${index + 1}`,
  }));
  const sourceHref = treasurySource.startsWith("http") ? treasurySource : undefined;
  const hasTwoPrimaryActions = Boolean(primaryCta && secondaryCta);
  const hasSpecialCaveat = trustStatusTone !== "stable";
  const showActNowCard = !hasTwoPrimaryActions || hasSpecialCaveat;
  const missionGridClassName = showActNowCard
    ? "grid gap-4 lg:grid-cols-[1.6fr,1.4fr,1.2fr]"
    : "grid gap-4 lg:grid-cols-[1.6fr,1.4fr]";
  const mobileStatusSummaryToneClass =
    trustStatusTone === "warning"
      ? "border-amber-300/80 bg-amber-500/15 text-amber-100"
      : "text-slate-200";
  const overviewPanel = (
    <section className="weather-panel space-y-3 px-4 py-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-slate-400">Snapshot</p>
      <dl className="grid gap-2 text-xs text-slate-300">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-400">Status</dt>
          <dd className="font-semibold text-slate-100">{statusLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-400">Signals stamped</dt>
          <dd className="text-slate-200">{recordDateLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-400">Updated</dt>
          <dd className="text-slate-200">{fetchedAtLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-400">Source</dt>
          <dd className="text-right text-slate-200">
            <span>Treasury fiscal API</span>
            {sourceHref ? (
              <a
                href={sourceHref}
                target="_blank"
                rel="noreferrer"
                className="ml-2 text-sky-200 underline decoration-slate-500/80 underline-offset-2 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
              >
                View source
              </a>
            ) : null}
          </dd>
        </div>
      </dl>
    </section>
  );
  const confidencePanel = (
    <section className={`weather-panel flex flex-col gap-2 px-4 py-4 ${trustToneStyles}`}>
      <p className={`text-xs font-semibold tracking-[0.16em] ${trustLabelTone}`}>
        Confidence
      </p>
      <p className="text-sm font-semibold text-slate-100">{trustStatusLabel}</p>
      <p className="text-xs leading-relaxed text-slate-200/90">{trustStatusDetail}</p>
      <p className="text-xs leading-relaxed text-slate-200/80">{trustStatusAction}</p>
    </section>
  );
  const sectionsNav =
    sectionLinks.length > 0 ? (
      <nav id="report-sections-nav" aria-label="Report sections" className="weather-panel px-4 py-4">
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
    ) : null;
  const commandActionCandidates: OperatorCommandAction[] = [];

  if (primaryCta) {
    commandActionCandidates.push({
      href: primaryCta.href,
      label: primaryCta.label,
      description: "Primary action",
      keywords: ["start", "weekly", "plan", "priorities"],
      group: "Playbook",
    });
  }

  if (secondaryCta) {
    commandActionCandidates.push({
      href: secondaryCta.href,
      label: secondaryCta.label,
      description: "Secondary action",
      keywords: ["summary", "leadership", "overview"],
      group: "Playbook",
    });
  }

  if (exportCta) {
    commandActionCandidates.push({
      href: exportCta.href,
      label: exportCta.label,
      description: "Export brief",
      keywords: ["copy", "share", "brief", "leadership"],
      group: "Playbook",
    });
  }

  commandActionCandidates.push(
    ...pageLinks.map<OperatorCommandAction>((page) => ({
      href: page.href,
      label: page.label,
      description: page.description,
      keywords: ["navigate", "page"],
      group: "Pages",
    })),
    ...sectionLinks.map<OperatorCommandAction>((section) => ({
      href: section.href,
      label: section.label,
      description: "Jump section",
      keywords: ["section", "jump"],
      group: "Sections",
    })),
  );

  const commandActions = commandActionCandidates.reduce<OperatorCommandAction[]>((accumulator, action) => {
    const isCurrentPageLink =
      action.href.startsWith("/") &&
      !action.href.includes("#") &&
      action.href === currentPath;

    if (isCurrentPageLink) {
      return accumulator;
    }

    if (!accumulator.some((item) => item.href === action.href && item.label === action.label)) {
      accumulator.push(action);
    }

    return accumulator;
  }, []);
  return (
    <>
      <nav
        aria-label="Skip links"
        className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:left-4 focus-within:top-4 focus-within:z-30 focus-within:flex focus-within:flex-col focus-within:gap-2 focus-within:rounded-2xl focus-within:border focus-within:border-slate-700/70 focus-within:bg-slate-950/95 focus-within:p-2 focus-within:shadow-xl focus-within:shadow-black/40"
      >
        <a
          href="#main-content"
          className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-xs font-semibold tracking-[0.14em] text-slate-100 transition-colors hover:border-sky-300/70 hover:text-white focus-visible:border-sky-300/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
        >
          Skip to main content
        </a>
        <a
          href="#report-primary-actions"
          className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-xs font-semibold tracking-[0.14em] text-slate-100 transition-colors hover:border-sky-300/70 hover:text-white focus-visible:border-sky-300/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
        >
          Skip to action controls
        </a>
        {hasSidebar ? (
          <a
            href="#report-sections-nav"
            className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-xs font-semibold tracking-[0.14em] text-slate-100 transition-colors hover:border-sky-300/70 hover:text-white focus-visible:border-sky-300/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
          >
            Skip to section navigation
          </a>
        ) : null}
      </nav>
      <main
        id="main-content"
        tabIndex={-1}
        className="weather-shell relative min-h-screen text-slate-100"
      >
        {structuredData ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: structuredData }}
          />
        ) : null}
        <DisplayGuardian />
        <div className="pointer-events-none absolute inset-0 weather-grid" aria-hidden="true" />
        <div className="mx-auto max-w-7xl pb-[calc(env(safe-area-inset-bottom)+12rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] pl-[calc(env(safe-area-inset-left)+1rem)] pr-[calc(env(safe-area-inset-right)+1rem)] sm:pb-12 sm:pt-6 sm:pl-[calc(env(safe-area-inset-left)+1.5rem)] sm:pr-[calc(env(safe-area-inset-right)+1.5rem)]">
          <header className="weather-appbar sticky top-[calc(env(safe-area-inset-top)+0.75rem)] z-20 px-4 py-4 sm:top-4 sm:px-6 sm:py-4">
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
                  <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">
                    Whether
                  </p>
                  <p className="text-sm font-semibold text-slate-100">
                    Market Climate Station
                  </p>
                  <p className="text-xs text-slate-400 sm:hidden">
                    Signals refreshed {fetchedAtLabel}
                  </p>
                </div>
              </div>
              <div className="hidden flex-wrap items-center gap-2 sm:flex">
                {exportCta ? (
                  <a
                    href={exportCta.href}
                    className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-slate-700/70 px-3 py-2 text-xs font-semibold tracking-[0.14em] text-slate-200 transition-colors hover:border-sky-300/80 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                  >
                    {exportCta.label}
                  </a>
                ) : null}
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

          <div className={`mt-6 grid min-w-0 gap-6 ${hasSidebar ? "lg:grid-cols-[260px,1fr]" : ""}`}>
            {hasSidebar ? (
              <aside className="order-2 space-y-4 lg:order-none lg:sticky lg:top-28 lg:self-start">
                {overviewPanel}
                {confidencePanel}
                {sectionsNav}
              </aside>
            ) : null}

            <div className="order-1 min-w-0 space-y-10 lg:order-none lg:space-y-12">
              <section className="weather-panel-static min-w-0 space-y-4 px-4 py-5 sm:px-5">
                <div className="space-y-3">
                  {heroVariant === "compact" ? (
                    <>
                      <p className="text-xs font-semibold tracking-[0.2em] text-slate-400 sm:tracking-[0.26em]">
                        Whether report
                      </p>
                      <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
                        {pageTitle}
                      </h1>
                      <p className="flex max-w-2xl flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-relaxed text-slate-200 sm:text-base">
                        <span>{pageSummary}</span>
                        {summaryLink}
                      </p>
                      <details className="group sm:hidden">
                        <summary className={`weather-chip inline-flex min-h-[44px] w-full cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-semibold tracking-[0.16em] marker:content-none ${mobileStatusSummaryToneClass}`}>
                          <span>Data status · {statusLabel}</span>
                          <span
                            aria-hidden="true"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700/70 text-slate-300 transition-transform duration-200 group-open:rotate-180"
                          >
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
                          <span className="sr-only">Toggle data status details.</span>
                        </summary>
                        <div className="mt-2 rounded-2xl border border-slate-800/70 bg-slate-950/70 px-3 py-3 text-xs text-slate-300">
                          <p>Signals stamped: {recordDateLabel}</p>
                          <p className={trustLabelTone}>Confidence: {trustStatusLabel}</p>
                        </div>
                      </details>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-semibold tracking-[0.2em] text-slate-400 sm:tracking-[0.26em]">
                        Whether report
                      </p>
                      <h1 className="type-headline text-slate-100">{pageTitle}</h1>
                      <p className="flex max-w-2xl flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-relaxed text-slate-200 sm:text-base">
                        <span>{pageSummary}</span>
                        {summaryLink}
                      </p>
                      <details className="group sm:hidden">
                        <summary className={`weather-chip inline-flex min-h-[44px] w-full cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-semibold tracking-[0.16em] marker:content-none ${mobileStatusSummaryToneClass}`}>
                          <span>Data status · {statusLabel}</span>
                          <span
                            aria-hidden="true"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700/70 text-slate-300 transition-transform duration-200 group-open:rotate-180"
                          >
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
                          <span className="sr-only">Toggle data status details.</span>
                        </summary>
                        <div className="mt-2 rounded-2xl border border-slate-800/70 bg-slate-950/70 px-3 py-3 text-xs text-slate-300">
                          <p>Signals stamped: {recordDateLabel}</p>
                          <p className={trustLabelTone}>Confidence: {trustStatusLabel}</p>
                        </div>
                      </details>
                      <span className="sr-only">Signals stamped {recordDateLabel}</span>
                    </>
                  )}
                </div>
                <div
                  id="report-primary-actions"
                  className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
                >
                  <a
                    href={primaryCta.href}
                    className="weather-button-primary inline-flex min-h-[44px] w-full max-w-full items-center justify-center px-4 py-2 text-center text-xs font-semibold leading-tight tracking-[0.12em] shadow-lg shadow-sky-500/30 ring-1 ring-sky-200/30 transition-colors hover:border-sky-300/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation sm:w-auto sm:text-xs sm:tracking-[0.2em]"
                  >
                    <span className="max-w-full break-words text-center">{primaryCta.label}</span>
                  </a>
                  {secondaryCta ? (
                    <a
                      href={secondaryCta.href}
                      className="inline-flex min-h-[44px] w-full max-w-full items-center justify-center text-center text-xs font-semibold leading-tight tracking-[0.12em] text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation sm:w-auto sm:justify-start sm:text-xs"
                    >
                      <span className="max-w-full break-words text-center">{secondaryCta.label}</span>
                    </a>
                  ) : null}
                  {exportCta ? (
                    <div className="w-full sm:hidden">
                      <MobileActionSheet
                        triggerLabel="More actions"
                        srHint="Open additional actions menu"
                        actions={[{ href: exportCta.href, label: exportCta.label }]}
                      />
                    </div>
                  ) : null}
                </div>
                <p className={`inline-flex items-center gap-2 text-xs leading-relaxed ${trustLabelTone}`}>
                  <span className="font-semibold tracking-[0.14em]">Confidence cue</span>
                  <span aria-hidden="true">{trustStatusTone === "warning" ? "⚠" : trustStatusTone === "historical" ? "⏱" : "✓"}</span>
                  <span>{trustStatusLabel}: {trustStatusAction}</span>
                </p>
                {showOfflineBadge ? (
                  <p className="weather-chip inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.14em] text-amber-100">
                    {offlineBadgeLabel}
                  </p>
                ) : null}
              </section>

              <section className="weather-panel space-y-5 px-4 py-5 sm:px-5" aria-label="Mission control">
                <div className={missionGridClassName}>
                  <article className="weather-surface space-y-3 p-4">
                    <p className="text-xs font-semibold tracking-[0.2em] text-slate-400">{decisionBanner?.label ?? "Decide now"}</p>
                    <h2 className="text-lg font-semibold text-slate-100 sm:text-xl">
                      {decisionBanner?.decision ?? `Start with ${primaryCta.label}.`}
                    </h2>
                    <p className="text-sm text-slate-300">{trustStatusAction}</p>
                    {decisionBanner?.evidenceHref ? (
                      <a
                        href={decisionBanner.evidenceHref}
                        className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.14em] text-sky-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                      >
                        Review evidence trail →
                      </a>
                    ) : null}
                  </article>

                  <article className="weather-surface space-y-3 p-4">
                    <p className="text-xs font-semibold tracking-[0.2em] text-slate-400">
                      {actionSequence?.title ?? "Execution sequence"}
                    </p>
                    <ol className="space-y-2">
                      {missionSequenceItems.map((item) => (
                        <li key={item.title} className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                          <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">{item.phase}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-100">{item.title}</p>
                          <p className="mt-1 text-xs text-slate-300">{item.detail}</p>
                        </li>
                      ))}
                    </ol>
                  </article>

                  {showActNowCard ? (
                    <article className="weather-surface space-y-3 p-4">
                      <p className="text-xs font-semibold tracking-[0.2em] text-slate-400">Act now</p>
                      <a
                        href={primaryCta.href}
                        className="weather-button-primary inline-flex min-h-[44px] w-full items-center justify-center px-3 py-2 text-center text-xs font-semibold tracking-[0.14em] hover:border-sky-300/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                      >
                        {primaryCta.label}
                      </a>
                      {secondaryCta ? (
                        <a
                          href={secondaryCta.href}
                          className="inline-flex min-h-[44px] w-full items-center justify-center text-xs font-semibold text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                        >
                          {secondaryCta.label}
                        </a>
                      ) : null}
                    </article>
                  ) : null}
                </div>

                {!hasSidebar ? (
                  <details className="group rounded-2xl border border-slate-800/80 bg-slate-950/40 px-4 py-3">
                    <summary className="inline-flex min-h-[44px] w-full cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold tracking-[0.16em] text-slate-300 marker:content-none">
                      <span>Data quality and confidence</span>
                      <span
                        aria-hidden="true"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700/70 text-slate-300 transition-transform duration-200 group-open:rotate-180"
                      >
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
                      <span className="sr-only">Toggle data quality and confidence details.</span>
                    </summary>
                    <div className="grid gap-3 pt-2 text-xs text-slate-300 sm:grid-cols-2">
                      <p>Signals stamped: {recordDateLabel}</p>
                      <p>Updated: {fetchedAtLabel}</p>
                      <p className={trustLabelTone}>Confidence: {trustStatusLabel}</p>
                      <p>{trustStatusDetail}</p>
                    </div>
                  </details>
                ) : null}
              </section>

              {stageRail ? (
                <section className="weather-panel space-y-3 px-4 py-4 sm:px-5" aria-label={stageRail.title ?? "Decision flow"}>
                  <p className="text-xs font-semibold tracking-[0.2em] text-slate-400">{stageRail.title ?? "Decision flow"}</p>
                  <ol className="grid gap-2 md:grid-cols-5">
                    {stageRail.items.map((item, index) => (
                      <li key={item.id}>
                        <a
                          href={item.href}
                          className="weather-pill inline-flex min-h-[44px] w-full items-center gap-2 px-3 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                          aria-current={item.status === "current" ? "step" : undefined}
                        >
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">{index + 1}</span>
                          <span>{item.label}</span>
                        </a>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              <OperatorCommandCenter actions={commandActions} />

            {!hasSidebar ? (
              <section className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  {overviewPanel}
                  {confidencePanel}
                </div>
                {sectionsNav ? <div>{sectionsNav}</div> : null}
              </section>
            ) : null}

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
          className="fixed inset-x-0 bottom-0 z-30 pb-3 pt-3 pl-[calc(env(safe-area-inset-left)+1rem)] pr-[calc(env(safe-area-inset-right)+1rem)]"
        />
      </div>
      </main>
    </>
  );
};
