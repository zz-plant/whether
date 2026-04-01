import Image from "next/image";
import {
  ReportPageNavigation,
  type ReportPageLink,
} from "./reportShellNavigation";
import { ReportCta } from "./reportCta";
import type { ExportCtaProps } from "./report-shell/types";

export type ReportShellHeaderVariant = "standard" | "home-brief" | "evidence" | "trust";

type ReportShellHeaderProps = {
  variant: ReportShellHeaderVariant;
  statusLabel: string;
  fetchedAtLabel: string;
  recordDateLabel: string;
  currentPath: string;
  showPageNavigation: boolean;
  pageLinks: ReportPageLink[];
  pageTitle: string;
  pageNavVariant: "full" | "compact";
  exportCta?: ExportCtaProps | null;
};

export function ReportShellHeader({
  variant,
  statusLabel,
  fetchedAtLabel,
  recordDateLabel,
  currentPath,
  showPageNavigation,
  pageLinks,
  pageTitle,
  pageNavVariant,
  exportCta,
}: ReportShellHeaderProps) {
  const contextBadge = variant === "evidence"
    ? {
        label: "Screen: Evidence",
        className: "border-sky-300/35 bg-sky-400/10 text-sky-100",
        copy: "Signal thresholds, score movement, and replay context to validate or challenge this week's call.",
      }
    : variant === "trust"
      ? {
          label: "Screen: Trust",
          className: "border-emerald-300/35 bg-emerald-400/10 text-emerald-100",
          copy: "Freshness, confidence, and source checks before approving irreversible decisions.",
        }
      : null;

  return (
    <header className="weather-appbar relative z-20 border-slate-800/60 px-4 py-2.5 sm:px-5 sm:py-3 lg:sticky lg:top-4">
      {variant === "home-brief" ? (
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <Image
                src="/whether-logo.svg"
                alt="Whether — Weekly Operating Posture (Hiring, Spend, Roadmap)"
                width={156}
                height={36}
                className="h-9 w-auto"
                priority
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Weekly brief
              </p>
              <p className="max-w-3xl font-[family:var(--weather-font-display)] text-[1.05rem] font-semibold leading-[1.07] tracking-[-0.02em] text-slate-50 sm:text-[1.32rem]">
                Decide this week&apos;s pace in one screen.
              </p>
              <p className="max-w-3xl text-sm leading-relaxed text-slate-300">
                The call, immediate move, threshold, and flip condition are captured in one view, with deeper pages available only when needed.
              </p>
            </div>
            {exportCta ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <ReportCta
                  href={exportCta.href}
                  copyText={exportCta.copyText}
                  copyTarget={exportCta.copyTarget}
                  telemetryEvent={exportCta.telemetryEvent}
                  label={exportCta.label}
                  className="weather-button-primary inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-xs font-semibold tracking-[0.14em] text-slate-100 transition-colors hover:border-sky-300/70 hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                >
                  {exportCta.label}
                </ReportCta>
                <span className="rounded-full border border-slate-700/70 bg-slate-950/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200">
                  {statusLabel}
                </span>
              </div>
            ) : null}
          </div>
          <div className="xl:min-w-[30rem]">
            <div className="weather-surface flex min-h-[36px] flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-200">
              <span className="rounded-full border border-slate-700/70 bg-slate-950/60 px-2.5 py-1">Posture {statusLabel}</span>
              <span className="text-slate-500">•</span>
              <span>Decision as-of {recordDateLabel}</span>
              <span className="text-slate-500">•</span>
              <span>Data refreshed {fetchedAtLabel}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <Image
                src="/whether-logo.svg"
                alt="Whether — Weekly Operating Posture (Hiring, Spend, Roadmap)"
                width={132}
                height={30}
                className="h-7 w-auto"
                priority
              />
              {contextBadge ? (
                <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${contextBadge.className}`}>
                  {contextBadge.label}
                </span>
              ) : null}
              <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-100">
                {statusLabel}
              </span>
            </div>
            <p className="text-[11px] font-medium tracking-[0.06em] text-slate-400">
              {pageTitle}
            </p>
          </div>
          <div className="xl:min-w-[23rem]">
            <div className="weather-surface flex min-h-[36px] flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 text-[10px] font-semibold tracking-[0.06em] text-slate-200">
              <span className="text-slate-500">As-of</span>
              <span>{recordDateLabel}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-500">Refreshed</span>
              <span>{fetchedAtLabel}</span>
            </div>
          </div>
        </div>
      )}
      {showPageNavigation ? (
        <ReportPageNavigation
          pageLinks={pageLinks}
          pageTitle={pageTitle}
          currentPath={currentPath}
          variant={pageNavVariant}
          className="mt-4 -mx-4 hidden px-4 sm:mx-0 sm:block sm:px-0"
        />
      ) : null}
    </header>
  );
}
