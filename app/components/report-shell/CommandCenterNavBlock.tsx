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
  const headingClassName = heroVariant === "compact"
    ? "max-w-3xl text-2xl font-semibold tracking-[-0.03em] text-slate-100 sm:text-[2rem]"
    : "type-headline max-w-3xl text-slate-100";
  const decisionHeadingClassName = heroVariant === "compact"
    ? "max-w-xl text-[1.45rem] font-semibold leading-[1.15] tracking-[-0.03em] text-slate-50 sm:text-[1.6rem]"
    : "max-w-xl text-[1.7rem] font-semibold leading-[1.12] tracking-[-0.035em] text-slate-50";
  const briefKicker = heroVariant === "compact" ? "Route brief" : "Weekly operating brief";
  const hasUtilityActions = Boolean(secondaryCta || exportCta);
  const introMetaLine = [
    statusLabel,
    trustStatusLabel,
    `As of ${recordDateLabel}`,
    showOfflineBadge ? offlineBadgeLabel : null,
  ].filter(Boolean).join(" • ");
  const decisionDeltaLine = decisionDiffs?.map((item) => item.label).join(" • ");
  const shouldShowMissionSequence = heroVariant === "full" && missionSequenceItems.length > 0;

  return (
    <section
      className="weather-panel-static weather-brief-shell relative min-w-0 overflow-hidden px-4 py-4 sm:px-5 sm:py-5"
      aria-label="Page introduction"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-400/35 to-transparent"
        aria-hidden="true"
      />

      <div className="space-y-4">
        {roleSwitcher && heroVariant === "full" ? (
          <div className="weather-surface grid gap-2 rounded-[1rem] border border-slate-800/55 bg-slate-950/48 p-3">
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

        <article className="weather-priority-card relative overflow-hidden p-4 sm:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)] xl:items-start">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/35 to-transparent"
              aria-hidden="true"
            />
            <div className="space-y-4">
              <div className="space-y-2.5">
                <p className="weather-brief-kicker">{briefKicker}</p>
                <p className="text-[11px] leading-5 text-slate-400">{introMetaLine}</p>
                <h1 className={headingClassName}>{pageTitle}</h1>
                <p className="flex max-w-3xl flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-relaxed text-slate-200 sm:text-[15px]">
                  <span>{pageSummary}</span>
                  {summaryLink}
                </p>
              </div>

              {decisionDeltaLine ? (
                <p className="text-[12px] leading-5 text-slate-300" aria-label="Decision deltas">
                  {decisionDeltaLine}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {primaryCta ? (
                  <ReportCta
                    href={primaryCta.href}
                    copyText={primaryCta.copyText}
                    copyTarget={primaryCta.copyTarget}
                    label={primaryCta.label}
                    className="weather-cta weather-cta-primary px-4 py-2"
                  >
                    {primaryCta.label}
                  </ReportCta>
                ) : null}
                {hasUtilityActions ? (
                  <div className="flex flex-wrap gap-2">
                    {secondaryCta ? (
                      <InternalAwareLink
                        href={secondaryCta.href}
                        className="weather-pill inline-flex min-h-[42px] items-center justify-center px-3 py-2 text-center text-xs font-semibold tracking-[0.05em] text-slate-100"
                      >
                        {secondaryCta.label}
                      </InternalAwareLink>
                    ) : null}
                    {exportCta ? (
                      <ReportCta
                        href={exportCta.href}
                        copyText={exportCta.copyText}
                        copyTarget={exportCta.copyTarget}
                        telemetryEvent={exportCta.telemetryEvent}
                        label={exportCta.label}
                        className="weather-pill inline-flex min-h-[42px] items-center justify-center px-3 py-2 text-center text-xs font-semibold tracking-[0.05em] text-slate-100"
                      >
                        {exportCta.label}
                      </ReportCta>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-3 rounded-[0.95rem] border border-slate-800/70 bg-slate-950/38 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100/80">
                {decisionBanner?.label ?? "Current operating call"}
              </p>

              <h2 className={decisionHeadingClassName}>{primaryDecisionText}</h2>
              <p className="max-w-lg text-sm leading-relaxed text-slate-200">{missionSupportText}</p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-slate-400">
                <span>Updated {fetchedAtLabel}</span>
                <span className="text-slate-700">•</span>
                <span>{resolvedNextRefreshLabel}</span>
                {nextStep ? (
                  <>
                    <span className="text-slate-700">•</span>
                    <span>Next: {nextStep.description}</span>
                  </>
                ) : null}
              </div>

              {decisionBanner?.evidenceHref && !primaryCta ? (
                <InternalAwareLink
                  href={decisionBanner.evidenceHref}
                  className="inline-flex min-h-[44px] items-center font-semibold tracking-[0.08em] text-sky-100 underline decoration-sky-400/45 underline-offset-4"
                >
                  Open first section
                  <ArrowRightIcon className="ml-1 h-3.5 w-3.5" />
                </InternalAwareLink>
              ) : null}
            </div>
          </div>
        </article>

        {roleSwitcher && heroVariant !== "full" ? (
          <div className="weather-surface grid gap-2 rounded-[1rem] border border-slate-800/55 bg-slate-950/42 p-3 sm:grid-cols-2">
            {roleSwitcher.options.map((option) => {
              const isActive = option.key === roleSwitcher.active;
              return (
                <InternalAwareLink
                  key={option.key}
                  href={option.href}
                  ariaCurrent={isActive ? "page" : undefined}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold ${
                    isActive
                      ? "border-sky-300/70 bg-sky-500/12 text-slate-100"
                      : "border-slate-800/70 bg-slate-950/50 text-slate-300 hover:border-sky-400/45 hover:text-slate-100"
                  }`}
                >
                  {option.label}
                </InternalAwareLink>
              );
            })}
          </div>
        ) : null}

        {shouldShowMissionSequence ? (
          <article className="weather-surface rounded-[1rem] border border-slate-800/55 bg-slate-950/42 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {missionSequenceTitle || "Use this order"}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Work left to right. Each step exists to support the weekly call, not compete with it.
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
                    className="weather-sequence-card block px-3 py-3 transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-sky-400/45 hover:bg-slate-900/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-100/78">
                          {item.phase}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">{item.title}</p>
                      </div>
                      <span className="rounded-[0.65rem] border border-slate-700/70 bg-slate-950/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-300">
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
