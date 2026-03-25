import type { RegimeKey } from "../../../../lib/regimeEngine";
import type { FlipRiskMeterState, WeeklyDecisionCardViewModel } from "../../../../lib/report/homeBriefModel";
import { getRegimeWeatherIcon, getRegimeWeatherLabel, REGIME_BANNER_TOKENS, type RegimeWeatherIcon } from "../../../../lib/regimePresentation";
import { resolvePostureAndStage } from "../../../../lib/report/homeBriefPresentation";
import { TrendGlyph } from "../shared";

type RegimeBannerProps = {
  statusLabel: string;
  regimeKey: RegimeKey;
  postureLabel?: string;
  stageLabel?: string;
  postureWithStageLabel?: string;
  recordDateLabel: string;
  confidencePercent: number;
  confidenceLabel: WeeklyDecisionCardViewModel["status"]["confidenceLabel"];
  trendLabel?: string;
  regimeDistance?: WeeklyDecisionCardViewModel["diagnostics"]["regimeDistance"];
  flipRiskMeter: FlipRiskMeterState;
};

const RegimeWeatherGlyph = ({ icon, title }: { icon: RegimeWeatherIcon; title: string }) => {
  if (icon === "snowflake") {
    return <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-sky-100" aria-hidden="true" focusable="false"><title>{title}</title><path d="M8 1.5v13M2.6 4.2l10.8 7.6M13.4 4.2L2.6 11.8M4.8 2.7l1.7 1.1M11.2 2.7L9.5 3.8M4.8 13.3l1.7-1.1M11.2 13.3l-1.7-1.1" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>;
  }
  if (icon === "cloud") {
    return <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-slate-100" aria-hidden="true" focusable="false"><title>{title}</title><path d="M5.1 12.4h6.3a2.6 2.6 0 1 0-.3-5.1 3.7 3.7 0 0 0-7.2.9A2.1 2.1 0 1 0 5.1 12.4Z" fill="currentColor" opacity="0.95"/></svg>;
  }
  if (icon === "storm") {
    return <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-sky-100" aria-hidden="true" focusable="false"><title>{title}</title><path d="M5.1 9.8h6.3a2.6 2.6 0 1 0-.3-5.1 3.7 3.7 0 0 0-7.2.9A2.1 2.1 0 1 0 5.1 9.8Z" fill="currentColor" opacity="0.92"/><path d="M8.8 9 6.9 12h1.6L7.4 14.5 10 11h-1.5L9.6 9Z" fill="rgb(253 224 71)"/></svg>;
  }
  return <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-amber-200" aria-hidden="true" focusable="false"><title>{title}</title><circle cx="8" cy="8" r="3.1" fill="currentColor"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M12.8 3.2l-1.1 1.1M4.3 11.7l-1.1 1.1" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
};

const confidenceBandTone: Record<RegimeBannerProps["confidenceLabel"], { label: string; activeIndex: number; fillClass: string; textClass: string }> = {
  HIGH: { label: "High confidence", activeIndex: 2, fillClass: "bg-emerald-300", textClass: "text-emerald-100" },
  MED: { label: "Medium confidence", activeIndex: 1, fillClass: "bg-amber-200", textClass: "text-amber-100" },
  LOW: { label: "Low confidence", activeIndex: 0, fillClass: "bg-rose-300", textClass: "text-rose-200" },
};

const flipRiskStrokeClass: Record<FlipRiskMeterState["urgencyLabel"], string> = {
  High: "stroke-rose-300",
  Medium: "stroke-amber-200",
  Low: "stroke-emerald-200",
  Unknown: "stroke-slate-300/70",
};

const ConfidenceBandMeter = ({ confidencePercent, confidenceLabel }: { confidencePercent: number; confidenceLabel: RegimeBannerProps["confidenceLabel"] }) => {
  const tone = confidenceBandTone[confidenceLabel];
  return (
    <div className="min-w-[8rem]">
      <p className={`text-[11px] font-semibold ${tone.textClass}`}>{tone.label}</p>
      <div className="mt-1 grid grid-cols-3 gap-1" role="img" aria-label={`${tone.label}. Exact confidence ${Math.round(confidencePercent)} percent`}>
        {[0, 1, 2].map((index) => <span key={index} className={`h-1.5 rounded-full ${index === tone.activeIndex ? tone.fillClass : "bg-slate-800/85"}`} aria-hidden="true" />)}
      </div>
    </div>
  );
};

const FlipRiskDial = ({ flipRiskState }: { flipRiskState: FlipRiskMeterState }) => {
  const radius = 11;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - flipRiskState.progressPercent / 100);
  const strokeClass = flipRiskStrokeClass[flipRiskState.urgencyLabel];
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 30 30" className="h-7 w-7 -rotate-90" aria-hidden="true" focusable="false">
        <circle cx="15" cy="15" r={radius} className="fill-none stroke-slate-800/80" strokeWidth="3" />
        <circle cx="15" cy="15" r={radius} className={`fill-none ${strokeClass}`} strokeWidth="3" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} />
      </svg>
      <p className="text-[11px] text-slate-300">{flipRiskState.urgencyLabel} flip risk</p>
    </div>
  );
};

export function RegimeBanner(props: RegimeBannerProps) {
  const { statusLabel, regimeKey = "VOLATILE", postureLabel, stageLabel, postureWithStageLabel, recordDateLabel, confidencePercent, confidenceLabel, trendLabel, regimeDistance, flipRiskMeter } = props;
  const { resolvedPostureLabel, resolvedStageLabel } = resolvePostureAndStage({ statusLabel, postureLabel, stageLabel, postureWithStageLabel });
  const trendValue = trendLabel?.trim() || "Unspecified";
  const flipRiskValue = regimeDistance && Number.isFinite(regimeDistance.pointsToFlip) ? `${Math.max(0, Math.round(regimeDistance.pointsToFlip))} pts` : "Unknown";
  const bannerTone = REGIME_BANNER_TOKENS[regimeKey];
  const activeWeather = getRegimeWeatherLabel(regimeKey);
  const activeWeatherIcon = getRegimeWeatherIcon(regimeKey);

  return (
    <header className={`z-10 rounded-2xl border px-4 py-3 shadow-[0_20px_44px_rgba(2,6,23,0.42)] backdrop-blur sm:px-5 sm:py-4 ${bannerTone.shell}`} data-testid="weekly-regime-banner" aria-label="Weekly regime banner">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-100/85">
            <span>Current outlook</span>
            <span className="rounded-full border border-white/10 bg-slate-950/35 px-2.5 py-1">Week of {recordDateLabel}</span>
          </div>
          <div id="weekly-posture-brief-title" className="flex items-start gap-3">
            <span className="weather-icon-chip mt-0.5 h-10 w-10 flex-shrink-0 text-slate-50"><RegimeWeatherGlyph icon={activeWeatherIcon} title={activeWeather} /></span>
            <div className="min-w-0">
              <p className="text-xl font-semibold leading-tight sm:text-[1.7rem]">{resolvedPostureLabel}</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-100/90">{resolvedStageLabel} cycle</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">{activeWeather}. {flipRiskMeter.detailLabel}</p>
            </div>
          </div>
        </div>
        <div className="space-y-2 lg:max-w-[24rem]">
          <div className={`flex flex-wrap gap-1.5 text-xs font-semibold ${bannerTone.metrics}`} aria-label="Current outlook metadata">
            {[`Trend ${trendValue}`, `Confidence ${confidenceLabel} ${Math.round(confidencePercent)}%`, `Flip window ${flipRiskValue}`].map((metric) => <span key={metric} className="inline-flex min-h-8 items-center rounded-full border border-white/10 bg-slate-950/25 px-2.5 py-1 leading-4">{metric}</span>)}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex items-center gap-1.5 text-[11px] text-slate-300" aria-label={`Trend ${trendValue}`}><TrendGlyph trendLabel={trendValue} /><span>{flipRiskMeter.triggerLabel}</span></p>
            <ConfidenceBandMeter confidencePercent={confidencePercent} confidenceLabel={confidenceLabel} />
            <FlipRiskDial flipRiskState={flipRiskMeter} />
          </div>
        </div>
      </div>
    </header>
  );
}

export type { RegimeBannerProps };
