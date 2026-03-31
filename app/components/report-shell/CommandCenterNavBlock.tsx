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

  if (heroVariant === "compact") {
    return (
      <section className="weather-panel-static min-w-0 space-y-4 px-4 py-4 sm:px-5" aria-label="Page introduction">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <div className="space-y-4">
            <div className="space-y-2.5">
              <p className="text-xs font-semibold tracking-[0.14em] text-slate-400 sm:tracking-[0.18em]">
                Whether report
              </p>
              <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
                {pageTitle}
              </h1>
              <p className="flex max-w-3xl flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-relaxed text-slate-200 sm:text-[15px]">
                <span>{pageSummary}</span>
                {summaryLink}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
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

            {secondaryCta || nextStep || exportCta ? (
              <p className="text-[11px] leading-relaxed text-slate-400">
                Elsewhere:
                {secondaryCta ? (
                  <>
                    {" "}
                    <InternalAwareLink
                      href={secondaryCta.href}
                      className="text-sky-200 underline decoration-slate-500/80 underline-offset-4"
                    >
                      {secondaryCta.label}
                    </InternalAwareLink>
                  </>
                ) : null}
                {nextStep ? (
                  <>
                    {secondaryCta ? <span className="mx-1 text-slate-500">•</span> : " "}
                    <InternalAwareLink
                      href={nextStep.href}
                      className="text-sky-200 underline decoration-slate-500/80 underline-offset-4"
                    >
                      {nextStep.description}
                    </InternalAwareLink>
                  </>
                ) : null}
                {exportCta ? (
                  <>
                    {secondaryCta || nextStep ? <span className="mx-1 text-slate-500">•</span> : " "}
                    <InternalAwareLink
                      href={exportCta.href}
                      className="text-sky-200 underline decoration-slate-500/80 underline-offset-4"
                    >
                      {exportCta.label}
                    </InternalAwareLink>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>

          <article className="weather-surface space-y-3 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {decisionBanner?.label ?? "Start here"}
            </p>
            <h2 className="text-lg font-semibold leading-6 text-slate-100 sm:text-xl">
              {primaryDecisionText}
            </h2>
            <p className="text-sm leading-relaxed text-slate-300">{missionSupportText}</p>
            {decisionDiffs?.length ? (
              <ul className="flex flex-wrap gap-2" aria-label="Decision deltas">
                {decisionDiffs.map((item) => (
                  <li
                    key={item.label}
                    className="inline-flex min-h-[28px] items-center rounded-full border border-slate-700/80 bg-slate-950/60 px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-slate-200"
                  >
                    {item.label}
                  </li>
                ))}
              </ul>
            ) : null}
            {nextStep ? (
              <p className="text-xs leading-relaxed text-slate-400">
                Next: {nextStep.description}
              </p>
            ) : null}
            {decisionBanner?.evidenceHref ? (
              <InternalAwareLink
                href={decisionBanner.evidenceHref}
                className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.12em] text-sky-200 underline decoration-slate-500/80 underline-offset-4"
              >
                See supporting evidence
                <ArrowRightIcon className="ml-1 h-3.5 w-3.5" />
              </InternalAwareLink>
            ) : null}
          </article>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-800/70 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <dl
            className="weather-surface weather-meta-list min-h-[40px] flex-1 px-3 py-2 text-[11px] font-semibold tracking-[0.06em] text-slate-100"
            aria-label="Current report status"
          >
            <div className="weather-meta-list__item">
              <dt className="text-slate-400">Posture</dt>
              <dd>{statusLabel}</dd>
            </div>
            <div className="weather-meta-list__item">
              <dt className="text-slate-400">Confidence</dt>
              <dd>{trustStatusLabel}</dd>
            </div>
            <div className="weather-meta-list__item">
              <dt className="text-slate-400">Data refreshed</dt>
              <dd>{fetchedAtLabel}</dd>
            </div>
            <div className="weather-meta-list__item">
              <dt className="text-slate-400">Next refresh</dt>
              <dd>{resolvedNextRefreshLabel}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap items-center gap-2">
            <ManualRefreshButton title="Request the latest weekly brief snapshot." />
            {showOfflineBadge ? (
              <p className="weather-chip inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.14em] text-amber-100">
                {offlineBadgeLabel}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="weather-panel-static min-w-0 space-y-3 px-4 py-4 sm:space-y-4 sm:px-5">
        <div className="space-y-3">
          {roleSwitcher ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-[0.1em] text-slate-400">Role view</p>
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
          <p className="text-xs font-semibold tracking-[0.14em] text-slate-400 sm:tracking-[0.18em]">
            Whether report
          </p>
          <h1
            className={
              heroVariant === "compact"
                ? "text-2xl font-semibold text-slate-100 sm:text-3xl"
                : "type-headline text-slate-100"
            }
          >
            {pageTitle}
          </h1>
          <p className="flex max-w-2xl flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-relaxed text-slate-200 sm:text-base">
            <span>{pageSummary}</span>
            {summaryLink}
          </p>
          {heroVariant === "full" ? (
            <span className="sr-only">Evidence stamped {recordDateLabel}</span>
          ) : null}
        </div>

        {primaryCta ? (
          <div id="report-primary-actions" className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              On this page
            </p>
            <div className="flex w-full min-w-0">
              <ReportCta
                href={primaryCta.href}
                copyText={primaryCta.copyText}
                copyTarget={primaryCta.copyTarget}
                label={primaryCta.label}
                className="weather-cta weather-cta-primary w-full max-w-full text-center sm:w-auto"
              >
                <span className="max-w-full break-words text-center">{primaryCta.label}</span>
              </ReportCta>
            </div>
          </div>
        ) : null}
        {secondaryCta || nextStep || exportCta ? (
          <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400">
            Elsewhere:
            {secondaryCta ? (
              <>
                {" "}
                <InternalAwareLink
                  href={secondaryCta.href}
                  className="text-sky-200 underline decoration-slate-500/80 underline-offset-4"
                >
                  {secondaryCta.label}
                </InternalAwareLink>
              </>
            ) : null}
            {nextStep ? (
              <>
                {secondaryCta ? <span className="mx-1 text-slate-500">•</span> : " "}
                <InternalAwareLink
                  href={nextStep.href}
                  className="text-sky-200 underline decoration-slate-500/80 underline-offset-4"
                >
                  {nextStep.description}
                </InternalAwareLink>
              </>
            ) : null}
            {exportCta ? (
              <>
                {secondaryCta || nextStep ? <span className="mx-1 text-slate-500">•</span> : " "}
                <InternalAwareLink
                  href={exportCta.href}
                  className="text-sky-200 underline decoration-slate-500/80 underline-offset-4"
                >
                  {exportCta.label}
                </InternalAwareLink>
              </>
            ) : null}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dl
            className="weather-surface weather-meta-list min-h-[40px] flex-1 px-3 py-2 text-[11px] font-semibold tracking-[0.06em] text-slate-100"
            aria-label="Current report status"
          >
            <div className="weather-meta-list__item">
              <dt className="text-slate-400">Posture</dt>
              <dd>{statusLabel}</dd>
            </div>
            <div className="weather-meta-list__item">
              <dt className="text-slate-400">Confidence</dt>
              <dd>{trustStatusLabel}</dd>
            </div>
            <div className="weather-meta-list__item">
              <dt className="text-slate-400">Data refreshed</dt>
              <dd>{fetchedAtLabel}</dd>
            </div>
            <div className="weather-meta-list__item">
              <dt className="text-slate-400">Next refresh</dt>
              <dd>{resolvedNextRefreshLabel}</dd>
            </div>
          </dl>
          <ManualRefreshButton title="Request the latest weekly brief snapshot." />
        </div>
        <p className="text-xs leading-relaxed text-slate-300">{trustStatusAction}</p>
        {showOfflineBadge ? (
          <p className="weather-chip inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.14em] text-amber-100">
            {offlineBadgeLabel}
          </p>
        ) : null}
      </section>

      <section className="weather-panel space-y-4 px-4 py-5 sm:px-5" aria-label="Decision snapshot">
        <div className="grid gap-3 lg:grid-cols-[1.6fr,1.4fr]">
          <article className="weather-surface space-y-3 border-sky-400/25 bg-sky-500/8 p-4">
            <p className="text-sm font-semibold tracking-[0.12em] text-slate-400">
              {decisionBanner?.label ?? "Decide now"}
            </p>
            <h2 className="text-xl font-semibold text-slate-100 sm:text-[1.45rem]">
              {primaryDecisionText}
            </h2>
            <p className="text-sm text-slate-300">{missionSupportText}</p>
            {decisionDiffs?.length ? (
              <ul className="mt-2 flex flex-wrap gap-2" aria-label="Decision deltas">
                {decisionDiffs.map((item) => (
                  <li
                    key={item.label}
                    className="inline-flex min-h-[28px] items-center rounded-full border border-slate-700/80 bg-slate-900/60 px-2 py-1 text-[11px] font-semibold tracking-[0.12em] text-slate-200"
                  >
                    {item.label}
                  </li>
                ))}
              </ul>
            ) : null}
            {decisionBanner?.evidenceHref ? (
              <InternalAwareLink
                href={decisionBanner.evidenceHref}
                className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.14em] text-sky-200 underline"
              >
                See supporting evidence
                <ArrowRightIcon className="ml-1 h-3.5 w-3.5" />
              </InternalAwareLink>
            ) : null}
          </article>
          <article className="weather-surface space-y-3 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              {missionSequenceTitle}
            </p>
            <ol className="space-y-2">
              {missionSequenceItems.map((item) => (
                <li
                  key={item.title}
                  className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3"
                >
                  <p className="text-xs font-semibold tracking-[0.1em] text-slate-400">
                    {item.phase}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-300">{item.detail}</p>
                </li>
              ))}
            </ol>
          </article>
        </div>
      </section>
    </>
  );
}
