import Image from "next/image";
import { canonicalPositioningLine } from "../../lib/seo";
import {
  ReportPageNavigation,
  type ReportPageLink,
} from "./reportShellNavigation";

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
  const hideCanonicalPositioningLineOnMobile = currentPath === "/signals" ||
    currentPath.startsWith("/signals/") ||
    currentPath === "/method" ||
    currentPath.startsWith("/method/");

  const contextBadge = variant === "evidence"
    ? {
        label: "Evidence appendix",
        className: "border-sky-300/35 bg-sky-400/10 text-sky-100",
        copy: "Signal thresholds, score movement, and replay context to validate or challenge this week's call.",
      }
    : variant === "trust"
      ? {
          label: "Trust audit hub",
          className: "border-emerald-300/35 bg-emerald-400/10 text-emerald-100",
          copy: "Freshness, confidence, and source checks before approving irreversible decisions.",
        }
      : null;

  return (
    <header className="weather-appbar relative z-20 border-slate-800/70 px-4 py-3 sm:px-6 sm:py-4 lg:sticky lg:top-4">
      {variant === "home-brief" ? (
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-end xl:justify-between">
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
              <span className="rounded-full border border-amber-300/35 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-50">
                Weekly operating brief
              </span>
              <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-100">
                {statusLabel}
              </span>
            </div>
            <div className="space-y-1.5">
              <p className="max-w-3xl font-[family:var(--weather-font-display)] text-[1.05rem] font-semibold leading-[1.07] tracking-[-0.02em] text-slate-50 sm:text-[1.4rem]">
                Decide this week&apos;s pace in one screen.
              </p>
              <div className="hidden gap-1.5 text-[11px] leading-relaxed text-slate-300 sm:grid sm:grid-cols-2 xl:max-w-[48rem]">
                <p className="rounded-xl border border-slate-700/70 bg-slate-950/55 px-2.5 py-2">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-100">Posture</span>
                  Keep this week&apos;s regime as the operating baseline.
                </p>
                <p className="rounded-xl border border-slate-700/70 bg-slate-950/55 px-2.5 py-2">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-100">Do now</span>
                  Execute only the bounded moves already approved for this posture.
                </p>
                <p className="rounded-xl border border-slate-700/70 bg-slate-950/55 px-2.5 py-2">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-100">Watch threshold</span>
                  Track the nearest trigger that changes pacing.
                </p>
                <p className="rounded-xl border border-slate-700/70 bg-slate-950/55 px-2.5 py-2">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-100">Flip condition</span>
                  Reverse only when the trigger confirms.
                </p>
              </div>
            </div>
          </div>
          <div className="xl:min-w-[30rem]">
            <div className="weather-surface flex min-h-[36px] flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-200">
              <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2.5 py-1">Posture {statusLabel}</span>
              <span className="text-slate-500">•</span>
              <span>Decision as-of {recordDateLabel}</span>
              <span className="text-slate-500">•</span>
              <span>Data refreshed {fetchedAtLabel}</span>
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
              {contextBadge ? (
                <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${contextBadge.className}`}>
                  {contextBadge.label}
                </span>
              ) : null}
              <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-100">
                {statusLabel}
              </span>
            </div>
            <p className="max-w-2xl text-xs leading-relaxed text-slate-300">
              {contextBadge?.copy ?? "Weekly posture artifact for operators: decide now, execute with guardrails, and keep evidence one click away."}
            </p>
            <p className={`max-w-2xl text-[11px] leading-relaxed text-slate-400 ${hideCanonicalPositioningLineOnMobile ? "hidden sm:block" : ""}`}>
              {canonicalPositioningLine}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[23rem]">
            <div className="weather-stat-card">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Decision as-of</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">{recordDateLabel}</p>
            </div>
            <div className="weather-stat-card">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Data refreshed</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">{fetchedAtLabel}</p>
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
