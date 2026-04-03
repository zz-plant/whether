import Link from "next/link";
import type { Route } from "next";
import type { RegimeKey } from "../../../../lib/regimeEngine";
import type { FlipRiskMeterState, WeeklyDecisionCardViewModel } from "../../../../lib/report/homeBriefModel";
import type { TrustStripDisplay } from "../../../../lib/report/reportFormatting";
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
  trustStrip: TrustStripDisplay;
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

export function RegimeBanner(props: RegimeBannerProps) {
  const { statusLabel, regimeKey = "VOLATILE", postureLabel, stageLabel, postureWithStageLabel, recordDateLabel, confidencePercent, confidenceLabel, trendLabel, regimeDistance, flipRiskMeter, trustStrip } = props;
  const { resolvedPostureLabel, resolvedStageLabel } = resolvePostureAndStage({ statusLabel, postureLabel, stageLabel, postureWithStageLabel });
  const trendValue = trendLabel?.trim() || "Unspecified";
  const flipRiskValue = regimeDistance && Number.isFinite(regimeDistance.pointsToFlip) ? `${Math.max(0, Math.round(regimeDistance.pointsToFlip))} pts` : "Unknown";
  const bannerTone = REGIME_BANNER_TOKENS[regimeKey];
  const activeWeather = getRegimeWeatherLabel(regimeKey);
  const activeWeatherIcon = getRegimeWeatherIcon(regimeKey);

  return (
    <header className={`z-10 rounded-2xl border px-4 py-3 shadow-[0_20px_44px_rgba(2,6,23,0.42)] backdrop-blur sm:px-5 ${bannerTone.shell}`} data-testid="weekly-regime-banner" aria-label="Weekly regime banner">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div id="weekly-posture-brief-title" className="flex min-w-0 items-center gap-3">
          <span className="weather-icon-chip h-9 w-9 flex-shrink-0 text-slate-50"><RegimeWeatherGlyph icon={activeWeatherIcon} title={activeWeather} /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-100/85">
              <span>Orientation</span>
              <span className="rounded-full border border-white/10 bg-slate-950/35 px-2 py-0.5">Week of {recordDateLabel}</span>
            </div>
            <p className="mt-1 text-base font-semibold leading-tight text-slate-50 sm:text-lg">{resolvedPostureLabel} · {resolvedStageLabel}</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-300">{activeWeather}. {flipRiskMeter.detailLabel}</p>
          </div>
        </div>
        <div className={`flex flex-wrap gap-1.5 text-[11px] font-semibold ${bannerTone.metrics}`} aria-label="Current outlook metadata">
          <span className="inline-flex min-h-8 items-center gap-1 rounded-full border border-white/10 bg-slate-950/25 px-2.5 py-1 leading-4">
            <TrendGlyph trendLabel={trendValue} />
            <span>Trend {trendValue}</span>
          </span>
          <span className="inline-flex min-h-8 items-center rounded-full border border-white/10 bg-slate-950/25 px-2.5 py-1 leading-4">
            Posture confidence {Math.round(confidencePercent)}% ({confidenceLabel})
          </span>
          <span className="inline-flex min-h-8 items-center rounded-full border border-white/10 bg-slate-950/25 px-2.5 py-1 leading-4">
            Flip window {flipRiskValue}
          </span>
          <span className="inline-flex min-h-8 items-center rounded-full border border-white/10 bg-slate-950/25 px-2.5 py-1 leading-4">
            {flipRiskMeter.triggerLabel}
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-200" aria-label="Trust strip">
        <span className="rounded-full border border-white/15 bg-slate-950/35 px-2 py-1">{trustStrip.freshnessBadge}</span>
        <span className="rounded-full border border-white/15 bg-slate-950/35 px-2 py-1">{trustStrip.confidenceBadge}</span>
        <Link href={trustStrip.provenanceHref as Route} className="rounded-full border border-sky-400/35 bg-sky-500/10 px-2 py-1 text-sky-100 hover:text-slate-50">
          {trustStrip.provenanceBadge}
        </Link>
        {trustStrip.fallbackBadge ? (
          <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-amber-100">{trustStrip.fallbackBadge}</span>
        ) : null}
        {trustStrip.warningCopy ? (
          <p className="w-full text-[11px] normal-case tracking-normal text-amber-100">{trustStrip.warningCopy}</p>
        ) : null}
      </div>
    </header>
  );
}

export type { RegimeBannerProps };
