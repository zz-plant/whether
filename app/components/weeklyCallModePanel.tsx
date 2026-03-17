import Link from "next/link";
import type { StartupVariantMode } from "../../lib/report/boundedDecisionRules";
import type { StartupVariantPolicy } from "../../lib/report/homeBriefModel";
import {
  ForecastConditionsHeader,
  ForecastStatsGrid,
  ForecastStrip,
  type ForecastStripCardData,
} from "./forecastStrip";
import type { StartupModeContent } from "./startupModeSelector";

type WeeklyCallModePanelProps = {
  startupVariantPolicy: StartupVariantPolicy;
  modeContentByMode: Partial<Record<StartupVariantMode, StartupModeContent>>;
  postureLabel: string;
  operatingCall: string;
  trendLabel: string;
  confidencePercent: number;
  confidenceLabel: "HIGH" | "MED" | "LOW";
  snapshotDoNow: string;
  snapshotAvoid: string;
  snapshotWatch: string;
  effectiveFlipLabels: string[];
  compactInsetClassName: string;
  tierOnePanelClassName: string;
  sectionSpacingClassName: string;
  tierOneHeadingClassName: string;
  whyItMattersLine?: string;
  readThisCardItems?: Array<{
    label: string;
    detail: string;
  }>;
  glossaryHref?: string;
  trustCueLine?: string;
  needsTrustWarning?: boolean;
  trustWarningCopy?: string;
};

const resolveModeContent = ({
  startupVariantPolicy,
  modeContentByMode,
}: Pick<WeeklyCallModePanelProps, "startupVariantPolicy" | "modeContentByMode">) => {
  const selectedMode = startupVariantPolicy.selectedMode;
  const selectedContent = modeContentByMode[selectedMode];

  if (selectedContent) {
    return {
      activeContent: selectedContent,
      selectedModeLabel: startupVariantPolicy.options.find((option) => option.mode === selectedMode)?.label ?? "Default",
    };
  }

  const fallbackOption = startupVariantPolicy.options.find((option) => modeContentByMode[option.mode]);
  return {
    activeContent: fallbackOption ? modeContentByMode[fallbackOption.mode] : undefined,
    selectedModeLabel: fallbackOption?.label ?? "Default",
  };
};

export function WeeklyCallModePanel({
  startupVariantPolicy,
  modeContentByMode,
  postureLabel,
  operatingCall,
  trendLabel,
  confidencePercent,
  confidenceLabel,
  snapshotDoNow,
  snapshotAvoid,
  snapshotWatch,
  effectiveFlipLabels,
  compactInsetClassName,
  tierOnePanelClassName,
  sectionSpacingClassName,
  tierOneHeadingClassName,
  whyItMattersLine,
  readThisCardItems = [],
  glossaryHref,
  trustCueLine,
  needsTrustWarning = false,
  trustWarningCopy,
}: WeeklyCallModePanelProps) {
  const { activeContent, selectedModeLabel } = resolveModeContent({
    startupVariantPolicy,
    modeContentByMode,
  });

  const modeAdjustedSnapshot = {
    doNow: activeContent?.doNowBullets[0] ?? snapshotDoNow,
    avoid: activeContent?.avoidBullets[0] ?? snapshotAvoid,
    watch: activeContent?.watchBullets[0] ?? snapshotWatch,
  };

  const confidenceValue = Math.max(0, Math.min(100, Math.round(confidencePercent)));
  const confidenceToneClass = confidenceLabel === "HIGH"
    ? "bg-emerald-400/80"
    : confidenceLabel === "MED"
      ? "bg-amber-400/80"
      : "bg-rose-400/80";
  const heroUrgencyClass = confidenceLabel === "LOW"
    ? "weather-live-hero weather-live-hero--high"
    : confidenceLabel === "MED"
      ? "weather-live-hero weather-live-hero--medium"
      : "weather-live-hero weather-live-hero--low";
  const trustDotClass = needsTrustWarning ? "bg-amber-300" : "bg-emerald-300";
  const trustStatusLabel = needsTrustWarning ? "Degraded" : "Live";
  const followUpFlipLabels = effectiveFlipLabels
    .filter((label) => label.trim().length > 0 && label.trim() !== modeAdjustedSnapshot.watch.trim())
    .slice(0, 2);
  const forecastCards: ForecastStripCardData[] = [
    {
      id: "outlook",
      label: "Outlook",
      headline: operatingCall,
      supportingText: postureLabel,
    },
    {
      id: "do-now",
      label: "Do now",
      headline: modeAdjustedSnapshot.doNow,
      tone: "positive",
    },
    {
      id: "guardrail",
      label: "Guardrail",
      headline: modeAdjustedSnapshot.avoid,
      tone: "warning",
    },
    {
      id: "flip-watch",
      label: "Flip watch",
      headline: modeAdjustedSnapshot.watch,
      tone: "info",
      chips: followUpFlipLabels.map((label) => ({ label, tone: "info" })),
      footerText: followUpFlipLabels.length > 0
        ? undefined
        : "Primary trigger before new fixed-cost commitments.",
    },
  ];

  return (
    <>
      <article className={`rounded-[1.2rem] border border-slate-700/75 bg-slate-950/92 p-3 sm:p-3.5 ${heroUrgencyClass}`} aria-label="Weekly call snapshot">
        <ForecastConditionsHeader
          eyebrow="Current conditions"
          headline="This week in one screen"
          description="Action, guardrail, and flip condition for this week."
          chips={[
            { label: "Operator forecast", tone: "info" },
            { label: postureLabel },
            { label: trendLabel },
          ]}
          trailing={(
            <ForecastStatsGrid
              stats={[
                { label: "Confidence", value: `${confidenceValue}%` },
                { label: "Stage view", value: selectedModeLabel },
                { label: "Signal state", value: confidenceLabel },
              ]}
              className="lg:min-w-[19rem]"
            />
          )}
        />
        {whyItMattersLine ? (
          <p className="mt-2.5 max-w-3xl rounded-xl border border-slate-700/60 bg-slate-950/55 px-3 py-2 text-xs leading-5 text-slate-200">{whyItMattersLine}</p>
        ) : null}
        <ForecastStrip cards={forecastCards} ariaLabel="Weekly decision transmission order" className="mt-3" />
        {readThisCardItems.length > 0 ? (
          <details className="mt-3 rounded-lg border border-slate-700/60 bg-slate-950/55 px-3 py-2.5">
            <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">Decode this forecast</summary>
            <ul className="mt-2 grid gap-1.5 text-[11px] text-slate-100">
              {readThisCardItems.slice(0, 3).map((item) => (
                <li key={item.label} className="rounded-md border border-slate-700/55 bg-slate-900/55 px-2.5 py-2">
                  <span className="font-semibold text-slate-200">{item.label}:</span> {item.detail}
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-300">
              <span className={compactInsetClassName}>Capital tightness = how hard funding is to access.</span>
              <span className={compactInsetClassName}>Risk appetite = how much the market will support bold expansion.</span>
              <span className={compactInsetClassName}>Flip condition = the threshold that changes this week&apos;s call.</span>
            </div>
            {glossaryHref ? (
              <Link href={glossaryHref} className="mt-2 inline-flex min-h-[44px] items-center text-xs font-semibold text-sky-300 underline underline-offset-2">
                Open glossary help
              </Link>
            ) : null}
          </details>
        ) : null}
        <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(13rem,0.85fr)]">
          {trustCueLine ? (
            <div className={`rounded-xl border px-3 py-2 text-[11px] ${needsTrustWarning ? "border-amber-400/30 bg-amber-500/10 text-amber-50" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-50"}`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-current/80">Can I rely on this?</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${trustDotClass}`} aria-hidden="true" />
                  <span className="font-semibold uppercase tracking-[0.12em]">{trustStatusLabel}</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-current/80">
                  <span aria-hidden="true">◷</span>
                  Data status
                </span>
              </div>
              <p className="mt-1 leading-5">{needsTrustWarning ? trustWarningCopy ?? trustCueLine : trustCueLine}</p>
            </div>
          ) : null}
          <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 px-3 py-2" aria-label="Decision confidence gauge">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">Decision confidence</p>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800/90" role="progressbar" aria-valuenow={confidenceValue} aria-valuemin={0} aria-valuemax={100} aria-label={`Confidence ${confidenceValue} percent`}>
              <div className={`h-full origin-left ${confidenceToneClass} transition-transform duration-300`} style={{ transform: `scaleX(${confidenceValue / 100})` }} />
            </div>
            <p className="mt-1 text-[10px] text-slate-300"><span className="font-semibold text-slate-100">{confidenceLabel} {confidenceValue}%</span> confidence · watch the flip cues when this compresses.</p>
          </div>
        </div>
      </article>

      <article id="weekly-call-core" className={`${tierOnePanelClassName} weather-motion-card ${sectionSpacingClassName} bg-gradient-to-br from-slate-950/95 via-slate-900/85 to-slate-950/95`}>
        <h2 className={tierOneHeadingClassName}>This week&apos;s call</h2>
        <div className="grid gap-2 text-xs text-slate-100 md:grid-cols-2">
          <p className="border-l-2 border-slate-700/70 pl-3 py-1.5"><span className="font-semibold uppercase tracking-[0.08em] text-slate-200">What environment?</span> {postureLabel} with a {trendLabel.toLowerCase()} trend at {confidenceValue}% confidence.</p>
          <p className="border-l-2 border-emerald-400/45 pl-3 py-1.5"><span className="font-semibold uppercase tracking-[0.08em] text-emerald-200">DO NOW</span> {modeAdjustedSnapshot.doNow}</p>
          <p className="border-l-2 border-rose-400/45 pl-3 py-1.5"><span className="font-semibold uppercase tracking-[0.08em] text-rose-200">GUARDRAIL</span> {modeAdjustedSnapshot.avoid}</p>
          <p className="border-l-2 border-sky-400/45 pl-3 py-1.5"><span className="font-semibold uppercase tracking-[0.08em] text-sky-200">FLIP WHEN</span> {modeAdjustedSnapshot.watch}</p>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <a href="#audit-this-call" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100">
            Audit this call
          </a>
          <a href="#approve-this-weeks-plan" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100">
            Approve the plan
          </a>
          <Link href="/signals" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100">
            Open Signals
          </Link>
        </div>
      </article>
    </>
  );
}
