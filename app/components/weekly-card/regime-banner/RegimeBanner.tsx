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
  const confidenceColor = confidenceLabel === "HIGH"
    ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
    : confidenceLabel === "MED"
      ? "border-amber-400/25 bg-amber-500/10 text-amber-100"
      : "border-rose-400/25 bg-rose-500/10 text-rose-100";

  return (
    <header className={`z-10 rounded border px-4 py-3 shadow-[0_20px_44px_rgba(2,6,23,0.42)] backdrop-blur sm:px-5 ${bannerTone.shell}`} data-testid="weekly-regime-banner" aria-label="Weekly regime banner">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
        <div id="weekly-posture-brief-title" className="flex min-w-0 items-start gap-3">
          <span className="weather-icon-chip h-8 w-8 flex-shrink-0 text-slate-50"><RegimeWeatherGlyph icon={activeWeatherIcon} title={activeWeather} /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-fluid-micro font-semibold uppercase tracking-[0.14em] text-slate-100/85">
              <span>This week</span>
              <span className="text-slate-400">Week of {recordDateLabel}</span>
            </div>
            <p className="mt-1 text-base font-semibold leading-tight text-slate-50 sm:text-lg">{resolvedPostureLabel} · {resolvedStageLabel}</p>
            <p className="mt-1 text-fluid-xs leading-5 text-slate-300">{activeWeather}. {flipRiskMeter.detailLabel}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:max-w-[24rem]" aria-label="This week metadata">
          <span className={`inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-slate-950/25 px-3 py-1.5 text-fluid-xs font-semibold text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${bannerTone.metrics}`}>
            <TrendGlyph trendLabel={trendValue} />
            <span>{trendValue} trend</span>
          </span>
          <span className={`inline-flex rounded-md border px-3 py-1.5 text-fluid-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${confidenceColor}`}>
            {Math.round(confidencePercent)}% confidence ({confidenceLabel})
          </span>
          <span className="inline-flex rounded-md border border-white/10 bg-slate-950/25 px-3 py-1.5 text-fluid-xs font-semibold text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            {flipRiskValue} to flip
          </span>
        </div>
      </div>
      <div className="mt-2 text-fluid-xs leading-5 text-slate-300" aria-label="Trust strip">
        <span>Flip trigger: {flipRiskMeter.triggerLabel}</span>
        <span className="text-slate-400"> · </span>
        <span className="font-semibold text-slate-100">{trustStrip.freshnessBadge}</span>
        <span className="text-slate-400"> · </span>
        <span className="font-semibold text-slate-100">{trustStrip.confidenceBadge}</span>
        <span className="text-slate-400"> · </span>
        <Link href={trustStrip.provenanceHref as Route} className="font-semibold text-sky-100 underline decoration-slate-600 underline-offset-4 hover:text-slate-50">
          {trustStrip.provenanceBadge}
        </Link>
        {trustStrip.fallbackBadge ? (
          <>
            <span className="text-slate-400"> · </span>
            <span className="font-semibold text-amber-100">{trustStrip.fallbackBadge}</span>
          </>
        ) : null}
        {trustStrip.warningCopy ? (
          <p className="mt-1 text-fluid-xs normal-case tracking-normal text-amber-100">{trustStrip.warningCopy}</p>
        ) : null}
      </div>
    </header>
  );
}

export type { RegimeBannerProps };
