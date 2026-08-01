import { AlertTriangle, ShieldCheck, Gauge } from "lucide-react";
import type { SignalDirection } from "../viewModel";

type FlipMeterProps = {
  tightness: number;
  tightnessDelta: number;
  pauseThreshold?: number;
  flipConditions?: string[];
  signalDirection: SignalDirection;
  /** Regulated regime-transition probability (0-100). When >0 it governs the
   * urgency tier instead of raw linear proximity to the threshold, so the
   * visual "near-miss" glow matches the actual odds rather than geometry. */
  transitionProbability?: number;
};

export function FlipMeter({
  tightness,
  tightnessDelta,
  pauseThreshold = 70,
  flipConditions = [],
  signalDirection,
  transitionProbability = 0,
}: FlipMeterProps) {
  const proximityPct = Math.min(100, Math.max(0, Math.round((tightness / pauseThreshold) * 100)));
  const isBreached = tightness >= pauseThreshold;
  const hasProbability = transitionProbability > 0;

  // Urgency is governed by the regulated transition probability when available.
  // Geometric proximity alone is a near-miss signal: a bar at 82% can glow amber
  // when the real transition odds are ~12%. The probability is the audit number.
  type UrgencyLevel = "breached" | "high" | "elevated" | "stable";
  const urgencyLevel: UrgencyLevel = isBreached
    ? "breached"
    : hasProbability
      ? transitionProbability >= 50
        ? "high"
        : transitionProbability >= 25
          ? "elevated"
          : "stable"
      : proximityPct >= 80
        ? "elevated"
        : "stable";

  const statusLabel =
    urgencyLevel === "breached" ? "Threshold Breached · Flip Triggered"
    : urgencyLevel === "high" ? "High Flip Risk · Watch Closely"
    : urgencyLevel === "elevated" ? "Elevated Flip Risk"
    : "Posture Stable · Clear Distance";

  const statusBg =
    urgencyLevel === "breached" || urgencyLevel === "high"
      ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
    : urgencyLevel === "elevated"
      ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300";

  const barGradient =
    urgencyLevel === "breached"
      ? "linear-gradient(90deg, #f43f5e 0%, #e11d48 100%)"
    : urgencyLevel === "high" || urgencyLevel === "elevated"
      ? "linear-gradient(90deg, #10b981 0%, #f59e0b 80%, #f43f5e 100%)"
    : "linear-gradient(90deg, #10b981 0%, #34d399 100%)";

  return (
    <div className="weather-card relative overflow-hidden p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Gauge className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">Flip Threshold Barometer</h3>
            <p className="text-fluid-micro text-white/50">Proximity of macro climate to posture reversal</p>
          </div>
        </div>

        <span className={`inline-flex items-center gap-1.5 rounded-sm border px-3 py-1 text-fluid-nano font-semibold uppercase tracking-[0.06em] ${statusBg}`}>
          {urgencyLevel === "breached" || urgencyLevel === "high" ? (
            <AlertTriangle className="w-3 h-3 text-rose-400" aria-hidden="true" />
          ) : (
            <ShieldCheck className="w-3 h-3 text-emerald-400" aria-hidden="true" />
          )}
          {statusLabel}
        </span>
      </div>

      {/* Main Barometer Visual */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-fluid-xs text-white/65">
          <span className="font-medium">Capital Tightness ({tightness}/100)</span>
          <span className="font-mono text-white/50">Flip Limit: {pauseThreshold}/100</span>
        </div>

        <div className="relative h-3.5 w-full rounded-sm bg-white/[0.06] overflow-hidden p-0.5 border border-white/[0.08]">
          <div
            className="h-full rounded-sm transition-all duration-700 ease-out"
            style={{
              width: `${proximityPct}%`,
              background: barGradient,
            }}
          />
          {/* Threshold marker line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10"
            style={{ left: `${Math.min(99, (pauseThreshold / 100) * 100)}%` }}
            title={`Threshold limit: ${pauseThreshold}`}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-fluid-nano text-white/50 pt-0.5">
          <span>0 (Maximum Liquidity)</span>
          <span className="font-semibold text-white/65">
            {proximityPct}% to threshold
            {hasProbability ? (
              <span className="ml-2 text-white/50 font-normal">· {transitionProbability}% transition risk</span>
            ) : null}
          </span>
          <span>100 (Extreme Tightness)</span>
        </div>
        {hasProbability && urgencyLevel !== "breached" ? (
          <p className="text-fluid-nano text-white/40">
            Urgency reflects {transitionProbability}% regime-transition odds, not just distance to the line.
          </p>
        ) : null}
      </div>

      {/* Flip Conditions & Macro Drivers */}
      {flipConditions.length > 0 ? (
        <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-3 space-y-2">
          <p className="text-fluid-nano font-semibold uppercase tracking-[0.08em] text-sky-300/80">
            Reversal Triggers Being Monitored
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {flipConditions.map((condition, idx) => (
              <li key={idx} className="flex items-start gap-2 text-fluid-xs text-slate-200">
                <span className="mt-1 size-1.5 rounded-sm bg-sky-400 flex-shrink-0" />
                <span>{condition}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
