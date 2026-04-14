import Image from "next/image";
import { ReportCta } from "./reportCta";
import type { ExportCtaProps } from "./report-shell/types";

export type ReportShellHeaderVariant = "standard" | "home-brief" | "evidence" | "trust";

type ReportShellHeaderProps = {
  variant: ReportShellHeaderVariant;
  statusLabel: string;
  fetchedAtLabel: string;
  recordDateLabel: string;
  pageTitle: string;
  exportCta?: ExportCtaProps | null;
};

export function ReportShellHeader({
  variant,
  statusLabel,
  fetchedAtLabel,
  recordDateLabel,
  pageTitle,
  exportCta,
}: ReportShellHeaderProps) {
  const contextBadge = variant === "evidence"
    ? {
        label: "Evidence",
        className: "border-sky-300/35 bg-sky-400/10 text-sky-100",
        copy: "Challenge or confirm the weekly call before you change the plan.",
      }
    : variant === "trust"
      ? {
          label: "Trust",
          className: "border-emerald-300/35 bg-emerald-400/10 text-emerald-100",
          copy: "Check whether this week's call is current enough and strong enough to use.",
        }
      : null;
  const summaryLine = variant === "home-brief"
    ? "The weekly brief stays primary. Open another route only when the room needs proof, planning, or verification."
    : (contextBadge?.copy ?? "Move through the workflow without reopening the whole brief.");

  return (
    <header className="weather-appbar relative z-20 border-slate-800/60 px-4 py-2.5 sm:px-5 sm:py-3 lg:sticky lg:top-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <Image
              src="/whether-logo.svg"
              alt="Whether — Weekly Operating Posture (Hiring, Spend, Roadmap)"
              width={132}
              height={30}
              className="h-7 w-auto"
              priority
            />
            <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-100">
              {variant === "home-brief" ? "Weekly brief" : pageTitle}
            </span>
            {contextBadge ? (
              <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${contextBadge.className}`}>
                {contextBadge.label}
              </span>
            ) : null}
          </div>
          <p className="max-w-3xl text-[12px] leading-relaxed text-slate-300">
            {summaryLine}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 xl:justify-end">
          {exportCta ? (
            <ReportCta
              href={exportCta.href}
              copyText={exportCta.copyText}
              copyTarget={exportCta.copyTarget}
              telemetryEvent={exportCta.telemetryEvent}
              label={exportCta.label}
              className="weather-button-primary inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-xs font-semibold tracking-[0.14em] text-slate-100"
            >
              {exportCta.label}
            </ReportCta>
          ) : null}
          <div className="weather-surface flex min-h-[36px] flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-200">
            <span className="rounded-full border border-slate-700/70 bg-slate-950/60 px-2.5 py-1">
              {statusLabel}
            </span>
            <span className="text-slate-600">•</span>
            <span>As-of {recordDateLabel}</span>
            <span className="text-slate-600">•</span>
            <span>Refreshed {fetchedAtLabel}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
