import type { ReactNode } from "react";
import { ArrowRightIcon } from "../uiIcons";
import { ReportCta } from "../reportCta";
import { InternalAwareLink } from "./InternalAwareLink";
import type {
  DecisionBanner,
  DecisionDiff,
  ExportCtaProps,
  ReportCtaProps,
  RoleSwitcher,
  SecondaryCtaProps,
} from "./types";

export function CommandCenterNavBlock({
  heroVariant,
  pageTitle,
  pageSummary,
  summaryLink,
  recordDateLabel,
  roleSwitcher,
  primaryCta,
  secondaryCta,
  exportCta,
  nextStep,
  statusLabel,
  trustStatusLabel,
  fetchedAtLabel,
  resolvedNextRefreshLabel,
  missionSupportText,
  showOfflineBadge,
  offlineBadgeLabel,
  decisionBanner,
  decisionDiffs,
  missionSequenceTitle,
  missionSequenceItems,
}: {
  heroVariant: "full" | "compact";
  pageTitle: string;
  pageSummary: string;
  summaryLink: ReactNode;
  recordDateLabel: string;
  roleSwitcher?: RoleSwitcher;
  primaryCta?: ReportCtaProps;
  secondaryCta?: SecondaryCtaProps;
  exportCta?: ExportCtaProps | null;
  nextStep?: { description: string; href: string };
  statusLabel: string;
  trustStatusLabel: string;
  fetchedAtLabel: string;
  resolvedNextRefreshLabel: string;
  trustStatusAction: string;
  showOfflineBadge: boolean;
  offlineBadgeLabel: string;
  decisionBanner?: DecisionBanner;
  missionSupportText: string;
  decisionDiffs?: DecisionDiff[];
  missionSequenceTitle: string;
  missionSequenceItems: Array<{
    title: string;
    detail: string;
    href: string;
    cta: string;
    phase: string;
  }>;
}) {
  const primaryDecisionText =
    decisionBanner?.decision ??
    (primaryCta ? `${primaryCta.label}.` : "Review the current operating posture.");
  const followOnLinks = [
    nextStep
      ? {
          href: nextStep.href,
          label: nextStep.description,
        }
      : null,
    exportCta
      ? {
          href: exportCta.href,
          label: exportCta.label,
        }
      : null,
  ].filter((item): item is { href: string; label: string } => Boolean(item));
  const headingClassName = heroVariant === "compact"
    ? "max-w-3xl text-2xl font-semibold tracking-[-0.03em] text-slate-100 sm:text-[2rem]"
    : "type-headline max-w-3xl text-slate-100";
  const decisionHeadingClassName = heroVariant === "compact"
    ? "max-w-xl text-[1.45rem] font-semibold leading-[1.15] tracking-[-0.03em] text-slate-50 sm:text-[1.6rem]"
    : "max-w-xl text-[1.7rem] font-semibold leading-[1.12] tracking-[-0.035em] text-slate-50";

  return (
    <section
      className="weather-panel-static relative min-w-0 overflow-hidden px-4 py-4 sm:px-5"
      aria-label="Page introduction"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-400/35 to-transparent"
        aria-hidden="true"
      />

      <div className="space-y-4">
        {roleSwitcher ? (
          <div className="weather-surface grid gap-2 rounded-[1.15rem] border border-slate-800/55 bg-slate-950/48 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Role-aware translation
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {roleSwitcher.options.map((option) => {
                const isActive = option.key === roleSwitcher.active;
                return (
                  <InternalAwareLink
                    key={option.key}
                    href={option.href}
                    ariaCurrent={isActive ? "page" : undefined}
                    className={`weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-sm font-semibold tracking-[0.08em] ${
                      isActive
                        ? "border-sky-300/80 bg-sky-500/18 text-slate-100"
                        : "text-slate-300 hover:border-sky-400/70 hover:text-slate-100"
                    }`}
                  >
                    {option.label}
                  </InternalAwareLink>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)] xl:items-start">
          <div className="space-y-4">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                <span>{heroVariant === "compact" ? "Use this route" : "Start here"}</span>
                <span className="text-slate-700">•</span>
                <span>{statusLabel}</span>
                <span className="text-slate-700">•</span>
                <span>{trustStatusLabel}</span>
                <span className="text-slate-700">•</span>
                <span>As-of {recordDateLabel}</span>
                {showOfflineBadge ? (
                  <>
                    <span className="text-slate-700">•</span>
                    <span className="text-amber-200">{offlineBadgeLabel}</span>
                  </>
                ) : null}
              </div>
              <h1 className={headingClassName}>{pageTitle}</h1>
              <p className="flex max-w-3xl flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-relaxed text-slate-200 sm:text-[15px]">
                <span>{pageSummary}</span>
                {summaryLink}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {primaryCta ? (
                <ReportCta
                  href={primaryCta.href}
                  copyText={primaryCta.copyText}
                  copyTarget={primaryCta.copyTarget}
                  label={primaryCta.label}
                  className="weather-cta weather-cta-primary"
                >
                  {primaryCta.label}
                </ReportCta>
              ) : null}
              {secondaryCta ? (
                <InternalAwareLink
                  href={secondaryCta.href}
                  className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100"
                >
                  {secondaryCta.label}
                </InternalAwareLink>
              ) : null}
            </div>

            {followOnLinks.length > 0 ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-medium text-slate-400">
                <span>Follow-on:</span>
                {followOnLinks.map((link) => (
                  <InternalAwareLink
                    key={`${link.href}-${link.label}`}
                    href={link.href}
                    className="text-slate-300 underline decoration-slate-600/80 underline-offset-4 hover:text-slate-100"
                  >
                    {link.label}
                  </InternalAwareLink>
                ))}
              </div>
            ) : null}
          </div>

          <article className="weather-priority-card relative overflow-hidden p-4 sm:p-5">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/35 to-transparent"
              aria-hidden="true"
            />
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100/80">
                  {decisionBanner?.label ?? "Decision focus"}
                </p>
                <span className="rounded-full border border-slate-700/70 bg-slate-950/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200">
                  {trustStatusLabel}
                </span>
              </div>

              <h2 className={decisionHeadingClassName}>{primaryDecisionText}</h2>
              <p className="max-w-lg text-sm leading-relaxed text-slate-200">{missionSupportText}</p>

              {decisionDiffs?.length ? (
                <ul className="flex flex-wrap gap-2" aria-label="Decision deltas">
                  {decisionDiffs.map((item) => (
                    <li
                      key={item.label}
                      className="inline-flex min-h-[28px] items-center rounded-full border border-slate-700/70 bg-slate-950/40 px-2.5 py-1 text-[11px] font-semibold tracking-[0.06em] text-slate-100"
                    >
                      {item.label}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-slate-400">
                <span>Updated {fetchedAtLabel}</span>
                <span className="text-slate-700">•</span>
                <span>{resolvedNextRefreshLabel}</span>
              </div>

              {decisionBanner?.evidenceHref ? (
                <InternalAwareLink
                  href={decisionBanner.evidenceHref}
                  className="inline-flex min-h-[44px] items-center font-semibold tracking-[0.08em] text-sky-100 underline decoration-sky-400/45 underline-offset-4"
                >
                  Open the first proof block
                  <ArrowRightIcon className="ml-1 h-3.5 w-3.5" />
                </InternalAwareLink>
              ) : null}
            </div>
          </article>
        </div>

        {missionSequenceItems.length > 0 ? (
          <article className="weather-surface rounded-[1.15rem] border border-slate-800/55 bg-slate-950/42 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {missionSequenceTitle}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Use one next move at a time.
                </p>
              </div>
              {nextStep ? (
                <p className="text-[11px] text-slate-400">
                  Next: {nextStep.description}
                </p>
              ) : null}
            </div>
            <ol className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-3">
              {missionSequenceItems.map((item) => (
                <li key={`${item.phase}-${item.title}`}>
                  <InternalAwareLink
                    href={item.href}
                    className="block rounded-xl border border-slate-800/70 bg-slate-950/60 px-3 py-3 transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-sky-400/45 hover:bg-slate-900/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {item.phase}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">{item.title}</p>
                      </div>
                      <span className="rounded-full border border-slate-700/70 bg-slate-950/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                        {item.cta}
                      </span>
                    </div>
                    <p className="mt-2 text-[12px] leading-5 text-slate-300">{item.detail}</p>
                  </InternalAwareLink>
                </li>
              ))}
            </ol>
          </article>
        ) : null}
      </div>
    </section>
  );
}
