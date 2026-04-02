import type { ReactNode } from "react";
import { ArrowRightIcon } from "../uiIcons";
import { ReportCta } from "../reportCta";
import { ManualRefreshButton } from "../manualRefreshButton";
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
  trustStatusAction,
  showOfflineBadge,
  offlineBadgeLabel,
  decisionBanner,
  missionSupportText,
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
  const actionLinks = [
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
  ]
    .filter((item): item is { href: string; label: string } => Boolean(item))
    .filter((item, index, items) => items.findIndex((candidate) => candidate.href === item.href && candidate.label === item.label) === index);

  if (heroVariant === "compact") {
    return (
      <section className="weather-panel-static min-w-0 space-y-4 px-4 py-4 sm:px-5" aria-label="Page introduction">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)] xl:items-start">
          <div className="space-y-4">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <span>Whether report</span>
                <span className="text-slate-600">•</span>
                <span>{statusLabel}</span>
                <span className="text-slate-600">•</span>
                <span>{trustStatusLabel}</span>
                <span className="text-slate-600">•</span>
                <span>As-of {recordDateLabel}</span>
              </div>
              <h1 className="text-2xl font-semibold text-slate-100 sm:text-[2rem]">
                {pageTitle}
              </h1>
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
              {showOfflineBadge ? (
                <p className="weather-chip inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-amber-100">
                  {offlineBadgeLabel}
                </p>
              ) : null}
            </div>
          </div>

          <article className="weather-priority-card space-y-3 p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-100/80">
              {decisionBanner?.label ?? "Start here"}
            </p>
            <h2 className="text-xl font-semibold leading-7 text-slate-50 sm:text-[1.55rem]">
              {primaryDecisionText}
            </h2>
            <p className="text-sm leading-relaxed text-slate-200">{missionSupportText}</p>
            {decisionDiffs?.length ? (
              <ul className="flex flex-wrap gap-2" aria-label="Decision deltas">
                {decisionDiffs.map((item) => (
                  <li
                    key={item.label}
                    className="inline-flex min-h-[28px] items-center rounded-full border border-sky-300/18 bg-slate-950/35 px-2.5 py-1 text-[11px] font-semibold tracking-[0.06em] text-slate-100"
                  >
                    {item.label}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300">
              {decisionBanner?.evidenceHref ? (
                <InternalAwareLink
                  href={decisionBanner.evidenceHref}
                  className="inline-flex min-h-[44px] items-center font-semibold tracking-[0.08em] text-sky-100 underline decoration-sky-400/45 underline-offset-4"
                >
                  See supporting evidence
                  <ArrowRightIcon className="ml-1 h-3.5 w-3.5" />
                </InternalAwareLink>
              ) : null}
              {nextStep ? <p>Next: {nextStep.description}</p> : null}
            </div>
          </article>
        </div>
      </section>
    );
  }

  return (
    <section className="weather-panel-static min-w-0 space-y-4 px-4 py-4 sm:px-5" aria-label="Page introduction">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.06fr)_minmax(21rem,0.94fr)] xl:items-start">
        <div className="space-y-4">
          {roleSwitcher ? (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Role view
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {roleSwitcher.options.map((option) => {
                  const isActive = option.key === roleSwitcher.active;
                  return (
                    <InternalAwareLink
                      key={option.key}
                      href={option.href}
                      ariaCurrent={isActive ? "page" : undefined}
                      className={`weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-sm font-semibold tracking-[0.08em] ${isActive ? "border-sky-300/80 text-slate-100" : "text-slate-300 hover:border-sky-400/70 hover:text-slate-100"}`}
                    >
                      {option.label}
                    </InternalAwareLink>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="space-y-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Whether report
            </p>
            <h1 className="type-headline text-slate-100">{pageTitle}</h1>
            <p className="flex max-w-3xl flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-relaxed text-slate-200 sm:text-base">
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

          {actionLinks.length > 0 ? (
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium text-slate-400">
              {actionLinks.map((link) => (
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

        <div className="space-y-3">
          <article className="weather-priority-card space-y-3 p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-100/80">
              {decisionBanner?.label ?? "Decide now"}
            </p>
            <h2 className="text-[1.45rem] font-semibold leading-8 text-slate-50">
              {primaryDecisionText}
            </h2>
            <p className="text-sm leading-relaxed text-slate-200">{missionSupportText}</p>
            {decisionDiffs?.length ? (
              <ul className="flex flex-wrap gap-2" aria-label="Decision deltas">
                {decisionDiffs.map((item) => (
                  <li
                    key={item.label}
                    className="inline-flex min-h-[28px] items-center rounded-full border border-sky-300/18 bg-slate-950/35 px-2.5 py-1 text-[11px] font-semibold tracking-[0.06em] text-slate-100"
                  >
                    {item.label}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300">
              {decisionBanner?.evidenceHref ? (
                <InternalAwareLink
                  href={decisionBanner.evidenceHref}
                  className="inline-flex min-h-[44px] items-center font-semibold tracking-[0.08em] text-sky-100 underline decoration-sky-400/45 underline-offset-4"
                >
                  See supporting evidence
                  <ArrowRightIcon className="ml-1 h-3.5 w-3.5" />
                </InternalAwareLink>
              ) : null}
              {nextStep ? <p>Next: {nextStep.description}</p> : null}
            </div>
          </article>

          {missionSequenceItems.length ? (
            <article className="weather-surface space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {missionSequenceTitle}
                </p>
                <span className="text-[11px] text-slate-400">Review order</span>
              </div>
              <ol className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                {missionSequenceItems.map((item) => (
                  <li
                    key={item.title}
                    className="rounded-xl border border-slate-800/80 bg-slate-950/55 px-3 py-3"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {item.phase}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">{item.detail}</p>
                  </li>
                ))}
              </ol>
            </article>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-800/70 pt-4 lg:flex-row lg:items-center lg:justify-between">
        <dl
          className="weather-surface weather-meta-list min-h-[40px] flex-1 px-3 py-2 text-[11px] font-semibold tracking-[0.04em] text-slate-100"
          aria-label="Current report status"
        >
          <div className="weather-meta-list__item">
            <dt className="text-slate-500">Posture</dt>
            <dd>{statusLabel}</dd>
          </div>
          <div className="weather-meta-list__item">
            <dt className="text-slate-500">Trust</dt>
            <dd>{trustStatusLabel}</dd>
          </div>
          <div className="weather-meta-list__item">
            <dt className="text-slate-500">As-of</dt>
            <dd>{recordDateLabel}</dd>
          </div>
          <div className="weather-meta-list__item">
            <dt className="text-slate-500">Refreshed</dt>
            <dd>{fetchedAtLabel}</dd>
          </div>
          <div className="weather-meta-list__item">
            <dt className="text-slate-500">Next</dt>
            <dd>{resolvedNextRefreshLabel}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center gap-2">
          <ManualRefreshButton title="Request the latest weekly brief snapshot." />
          {showOfflineBadge ? (
            <p className="weather-chip inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-amber-100">
              {offlineBadgeLabel}
            </p>
          ) : null}
        </div>
      </div>
      <p className="text-xs leading-relaxed text-slate-300">{trustStatusAction}</p>
    </section>
  );
}
