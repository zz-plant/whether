import Image from "next/image";
import { canonicalPositioningLine } from "../../lib/seo";
import {
  ReportPageNavigation,
  type ReportPageLink,
} from "./reportShellNavigation";

export type ReportShellHeaderVariant = "standard" | "home-brief";

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
}: ReportShellHeaderProps) {
  return (
    <header className="weather-appbar relative z-20 border-slate-800/70 px-4 py-4 sm:px-6 sm:py-5 lg:sticky lg:top-4">
      {variant === "home-brief" ? (
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Image
                src="/whether-logo.svg"
                alt="Whether — Weekly Operating Posture (Hiring, Spend, Roadmap)"
                width={156}
                height={36}
                className="h-9 w-auto"
                priority
              />
              <span className="rounded-full border border-sky-300/35 bg-sky-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-100">
                Weekly operating forecast
              </span>
              <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200">
                {statusLabel}
              </span>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-100/85">
                Current conditions
              </p>
              <p className="max-w-3xl text-base font-semibold leading-relaxed text-slate-100 sm:text-lg">
                This week&apos;s posture, action, and flip risk in one scan.
              </p>
              <p className="max-w-3xl text-xs leading-relaxed text-slate-300">
                Decide now, keep commitments reversible, and open deeper evidence only when the call needs it.
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[30rem]">
            <div className="weather-stat-card">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Posture</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">{statusLabel}</p>
            </div>
            <div className="weather-stat-card">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Signals updated</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">{fetchedAtLabel}</p>
            </div>
            <div className="weather-stat-card">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Record date</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">{recordDateLabel}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 space-y-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <Image
                src="/whether-logo.svg"
                alt="Whether — Weekly Operating Posture (Hiring, Spend, Roadmap)"
                width={132}
                height={30}
                className="h-7 w-auto"
                priority
              />
              <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200">
                {statusLabel}
              </span>
            </div>
            <p className="max-w-2xl text-xs leading-relaxed text-slate-300">
              Weekly posture artifact for operators: decide now, execute with guardrails, and keep evidence one click away.
            </p>
            <p className="max-w-2xl text-[11px] leading-relaxed text-slate-400">
              {canonicalPositioningLine}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[23rem]">
            <div className="weather-stat-card">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Signals updated</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">{fetchedAtLabel}</p>
            </div>
            <div className="weather-stat-card">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Record date</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">{recordDateLabel}</p>
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
