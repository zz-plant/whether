import type { ReactNode } from "react";
import { ArrowRightIcon } from "../uiIcons";
import { ReportCta } from "../reportCta";
import { InternalAwareLink } from "./InternalAwareLink";
import { ShareMenuDropdown } from "./ShareMenuDropdown";
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
  sharePayload,
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
  sharePayload?: React.ComponentProps<typeof ShareMenuDropdown> | null;
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
    ? "max-w-3xl font-semibold text-slate-100 text-fluid-2xl"
    : "type-headline max-w-3xl text-slate-100";
  const decisionHeadingClassName = heroVariant === "compact"
    ? "max-w-xl font-semibold leading-[1.15] text-slate-50 text-fluid-lg"
    : "max-w-xl font-semibold leading-[1.12] text-slate-50 text-fluid-xl";
  const briefKicker = heroVariant === "compact" ? "Weekly brief" : "Weekly operating brief";
  const hasUtilityActions = Boolean(secondaryCta || exportCta);
  const introMetaLine = [
    statusLabel,
    trustStatusLabel,
    `As of ${recordDateLabel}`,
    showOfflineBadge ? offlineBadgeLabel : null,
  ].filter(Boolean).join(" • ");
  const decisionDeltaLine = decisionDiffs?.map((item) => item.label).join(" • ");
  const shouldShowMissionSequence = heroVariant === "full" && missionSequenceItems.length > 0;
  const mobileDecisionText = decisionBanner?.decision ?? primaryDecisionText;

  return (
    <section
      className="weather-surface-secondary relative min-w-0 px-4 py-4 sm:px-5 sm:py-5"
      aria-label="Page introduction"
    >
      <div className="space-y-3 sm:space-y-4">
        {roleSwitcher && heroVariant === "full" ? (
          <div className="rounded border border-slate-800/55 bg-slate-950/40 p-3">
            <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400">
              Role
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {roleSwitcher.options.map((option) => {
                const isActive = option.key === roleSwitcher.active;
                return (
                  <InternalAwareLink
                    key={option.key}
                    href={option.href}
                    ariaCurrent={isActive ? "page" : undefined}
                    className={`inline-flex min-h-[44px] items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold ${
                      isActive
                        ? "border-sky-300/70 bg-sky-500/12 text-slate-100"
                        : "border-slate-800/60 text-slate-400 hover:border-sky-400/45 hover:text-slate-100"
                    }`}
                  >
                    {option.label}
                  </InternalAwareLink>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          <div className="space-y-2">
            <p className="weather-brief-kicker">{briefKicker}</p>
            <p className="text-fluid-micro leading-4 text-slate-400">{introMetaLine}</p>
            <h1 className={headingClassName}>{pageTitle}</h1>
            <p className="flex max-w-3xl flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-relaxed text-slate-300 sm:text-fluid-base">
              <span>{pageSummary}</span>
              {summaryLink}
            </p>
          </div>

          {decisionDeltaLine ? (
            <p className="text-fluid-xs leading-5 text-slate-400" aria-label="Decision deltas">
              {decisionDeltaLine}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-fluid-xs text-slate-400">
            <span>Updated {fetchedAtLabel}</span>
            <span>{resolvedNextRefreshLabel}</span>
            {nextStep ? <span>Next: {nextStep.description}</span> : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
            {secondaryCta ? (
              <InternalAwareLink
                href={secondaryCta.href}
                className="inline-flex min-h-[44px] items-center justify-center rounded-sm border border-slate-700/50 bg-slate-950/40 px-3 py-2 text-center text-xs font-semibold tracking-[0.05em] text-slate-300 hover:border-sky-400/50 hover:text-slate-100"
              >
                {secondaryCta.label}
              </InternalAwareLink>
            ) : null}
            {sharePayload ? (
              <ShareMenuDropdown {...sharePayload} />
            ) : exportCta ? (
              <ReportCta
                href={exportCta.href}
                copyText={exportCta.copyText}
                copyTarget={exportCta.copyTarget}
                telemetryEvent={exportCta.telemetryEvent}
                label={exportCta.label}
                className="inline-flex min-h-[44px] items-center justify-center rounded-sm border border-slate-700/50 bg-slate-950/40 px-3 py-2 text-center text-xs font-semibold tracking-[0.05em] text-slate-300 hover:border-sky-400/50 hover:text-slate-100"
              >
                {exportCta.label}
              </ReportCta>
            ) : null}
          </div>
        </div>

        {roleSwitcher && heroVariant !== "full" ? (
          <div className="grid gap-2 rounded border border-slate-800/55 bg-slate-950/40 p-3 sm:grid-cols-2">
            {roleSwitcher.options.map((option) => {
              const isActive = option.key === roleSwitcher.active;
              return (
                <InternalAwareLink
                  key={option.key}
                  href={option.href}
                  ariaCurrent={isActive ? "page" : undefined}
                  className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                    isActive
                      ? "border-sky-300/70 bg-sky-500/12 text-slate-100"
                      : "border-slate-800/60 text-slate-400 hover:border-sky-400/45 hover:text-slate-100"
                  }`}
                >
                  {option.label}
                </InternalAwareLink>
              );
            })}
          </div>
        ) : null}

        {shouldShowMissionSequence ? (
          <details className="group rounded border border-slate-800/55 bg-slate-950/40 px-4 py-3 sm:px-5 sm:py-4">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 sm:cursor-default sm:list-none">
              <span className="min-w-0">
                <span className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {missionSequenceTitle || "Use this order"}
                </span>
                <span className="mt-0.5 block text-fluid-xs text-slate-400">{nextStep ? `Next: ${nextStep.description}` : ""}</span>
              </span>
              <span aria-hidden="true" className="rounded-md border border-slate-700/60 bg-slate-950/50 px-2 py-0.5 text-fluid-xs text-slate-400 transition group-open:rotate-180 sm:hidden">▾</span>
            </summary>
            <ol className="mt-3 grid gap-2 sm:grid-cols-3">
              {missionSequenceItems.map((item) => (
                <li key={`${item.phase}-${item.title}`}>
                  <InternalAwareLink
                    href={item.href}
                    className="block rounded-sm border border-slate-800/60 bg-slate-950/30 px-3 py-3 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-sky-400/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-sky-100/70">
                          {item.phase}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">{item.title}</p>
                      </div>
                      <span className="rounded-md border border-slate-700/50 bg-slate-950/50 px-2 py-0.5 text-fluid-micro font-semibold uppercase tracking-[0.08em] text-slate-400">
                        {item.cta}
                      </span>
                    </div>
                    <p className="mt-2 text-fluid-xs leading-5 text-slate-400">{item.detail}</p>
                  </InternalAwareLink>
                </li>
              ))}
            </ol>
          </details>
        ) : null}
      </div>
    </section>
  );
}
