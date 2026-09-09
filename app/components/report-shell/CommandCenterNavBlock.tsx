import type { ReactNode } from "react";
import { ReportCta } from "../reportCta";
import { InternalAwareLink } from "./InternalAwareLink";
import { ShareRailButton } from "./ShareRailButton";
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
  showShare = false,
  nextStep,
  statusLabel,
  trustStatusLabel,
  fetchedAtLabel,
  resolvedNextRefreshLabel,
  showOfflineBadge,
  offlineBadgeLabel,
  decisionDiffs,
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
  /** Opens the one global share rail — the same formats, the same island, as / and /share. */
  showShare?: boolean;
  nextStep?: { description: string; href: string };
  statusLabel: string;
  trustStatusLabel: string;
  fetchedAtLabel: string;
  resolvedNextRefreshLabel?: string;
  trustStatusAction: string;
  showOfflineBadge: boolean;
  offlineBadgeLabel: string;
  decisionBanner?: DecisionBanner;
  missionSupportText: string;
  decisionDiffs?: DecisionDiff[];
}) {
  const headingClassName =
    heroVariant === "compact"
      ? "max-w-3xl font-semibold text-slate-100 text-fluid-2xl"
      : "type-headline max-w-3xl text-slate-100";
  const briefKicker =
    heroVariant === "compact" ? "Weekly brief" : "Weekly operating brief";
  const introMetaLine = [
    statusLabel,
    trustStatusLabel,
    // Interpolated only when there is a date. `As of ${x}` is a truthy string
    // even when x is "", so the filter below could never drop it, and a caller
    // passing no record date printed a bare "As of" with nothing after it.
    recordDateLabel ? `As of ${recordDateLabel}` : null,
    showOfflineBadge ? offlineBadgeLabel : null,
  ]
    .filter(Boolean)
    .join(" • ");
  const decisionDeltaLine = decisionDiffs
    ?.map((item) => item.label)
    .join(" • ");

  return (
    <section
      className="weather-surface-secondary relative min-w-0 px-4 py-4 sm:px-5 sm:py-5"
      aria-label="Page introduction"
    >
      <div className="space-y-3 sm:space-y-4">
        {roleSwitcher && heroVariant === "full" ? (
          <div className="rounded border border-slate-800/55 bg-slate-950/40 p-3">
            <p className="type-eyebrow">Role</p>
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

        {/* Two columns from lg up: the reading block keeps its measure on the
            left, the timestamp and actions bank right. Stacked, the hero was a
            full-width box holding a max-w-3xl column, so ~40% of every report
            hero rendered empty — and the CTAs sat a title, a summary and a meta
            line below the fold-line they belong on. */}
        <div className="space-y-3 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-x-10 lg:space-y-0">
          <div className="min-w-0 space-y-2">
            <p className="type-label text-slate-400">{briefKicker}</p>
            <p className="text-fluid-micro leading-4 text-slate-400">
              {introMetaLine}
            </p>
            <h1 className={headingClassName}>{pageTitle}</h1>
            <p className="flex max-w-3xl flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-relaxed text-slate-300 sm:text-fluid-base">
              <span>{pageSummary}</span>
              {summaryLink}
            </p>

            {decisionDeltaLine ? (
              <p
                className="text-fluid-xs leading-5 text-slate-400"
                aria-label="Decision deltas"
              >
                {decisionDeltaLine}
              </p>
            ) : null}
          </div>

          <div className="space-y-3 lg:min-w-[14rem] lg:max-w-sm lg:shrink-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-fluid-xs text-slate-400 lg:justify-end lg:text-right">
              <span>Updated {fetchedAtLabel}</span>
              {resolvedNextRefreshLabel ? (
                <span>{resolvedNextRefreshLabel}</span>
              ) : null}
              {nextStep ? <span>Next: {nextStep.description}</span> : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
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
                  className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-slate-700/50 bg-slate-950/40 px-3 py-2 text-center text-xs font-semibold tracking-[0.05em] text-slate-300 hover:border-sky-400/50 hover:text-slate-100"
                >
                  {secondaryCta.label}
                </InternalAwareLink>
              ) : null}
              {showShare ? (
                <ShareRailButton />
              ) : exportCta ? (
                <ReportCta
                  href={exportCta.href}
                  copyText={exportCta.copyText}
                  copyTarget={exportCta.copyTarget}
                  telemetryEvent={exportCta.telemetryEvent}
                  label={exportCta.label}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-slate-700/50 bg-slate-950/40 px-3 py-2 text-center text-xs font-semibold tracking-[0.05em] text-slate-300 hover:border-sky-400/50 hover:text-slate-100"
                >
                  {exportCta.label}
                </ReportCta>
              ) : null}
            </div>
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
      </div>
    </section>
  );
}
