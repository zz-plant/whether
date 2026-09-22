"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { TreasuryData } from "../../../lib/types";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import {
  evaluateRegime,
  type RegimeAssessment,
} from "../../../lib/regimeEngine";
import { getPlaybookGuidance } from "../../../lib/playbook";
import { CopyIcon, SlidersIcon } from "../../components/uiIcons";
import { useClipboardCopy } from "../../components/useClipboardCopy";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { ruleMetricLabel } from "../../../lib/report/boundedDecisionRules";

type ScenarioPreset = {
  id: string;
  rate: number;
  slope: number;
  description: string;
};

const PRESETS: ScenarioPreset[] = [
  {
    id: "easing",
    rate: 2.0,
    slope: 1.2,
    description: "Fast cuts and a steep curve: funding loosens.",
  },
  {
    id: "stagflation",
    rate: 6.25,
    slope: -0.6,
    description: "High rates with an inverted curve.",
  },
  {
    id: "deep-inversion",
    rate: 5.25,
    slope: -1.25,
    description: "A deep inversion: the recession warning at its strongest.",
  },
  {
    id: "soft-landing",
    rate: 3.25,
    slope: 0.85,
    description: "Rates near neutral with a normal curve.",
  },
];

const formatDelta = (value: number, unit = "") => {
  const rounded = Number(value.toFixed(2));
  if (rounded > 0) return `+${rounded}${unit}`;
  if (rounded < 0) return `${rounded}${unit}`;
  return `0${unit}`;
};

export function ScenarioStudioSimulator({
  liveTreasury,
  liveAssessment,
}: {
  liveTreasury: TreasuryData;
  liveAssessment: RegimeAssessment;
}) {
  const searchParams = useSearchParams();
  const initialRateParam = searchParams?.get("rate");
  const initialSlopeParam = searchParams?.get("slope");

  const liveBaseRate = liveAssessment.scores.baseRate ?? 4.5;
  const liveCurveSlope = liveAssessment.scores.curveSlope ?? -0.5;

  const [simulatedBaseRate, setSimulatedBaseRate] = useState<number>(() => {
    if (initialRateParam) {
      const parsed = Number.parseFloat(initialRateParam);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 8) return parsed;
    }
    return liveBaseRate;
  });

  const [simulatedCurveSlope, setSimulatedCurveSlope] = useState<number>(() => {
    if (initialSlopeParam) {
      const parsed = Number.parseFloat(initialSlopeParam);
      if (!Number.isNaN(parsed) && parsed >= -1.5 && parsed <= 2.5) return parsed;
    }
    return liveCurveSlope;
  });

  const { copyToClipboard, copiedTarget } = useClipboardCopy();

  // Sync state to URL search parameters for link shareability
  useEffect(() => {
    const isLiveValues =
      Math.abs(simulatedBaseRate - liveBaseRate) < 0.01 &&
      Math.abs(simulatedCurveSlope - liveCurveSlope) < 0.01;

    const url = new URL(window.location.href);
    if (isLiveValues) {
      url.searchParams.delete("rate");
      url.searchParams.delete("slope");
    } else {
      url.searchParams.set("rate", simulatedBaseRate.toFixed(2));
      url.searchParams.set("slope", simulatedCurveSlope.toFixed(2));
    }
    window.history.replaceState(null, "", url.toString());
  }, [simulatedBaseRate, simulatedCurveSlope, liveBaseRate, liveCurveSlope]);

  // Pure deterministic counterfactual simulation
  const simulatedTreasury: TreasuryData = useMemo(
    () => ({
      ...liveTreasury,
      isLive: false,
      source: "Simulated Counterfactual (Scenario Studio)",
      yields: {
        ...liveTreasury.yields,
        fedFunds: simulatedBaseRate,
        oneMonth: simulatedBaseRate,
        threeMonth: simulatedBaseRate,
        twoYear: simulatedBaseRate,
        tenYear: Number((simulatedBaseRate + simulatedCurveSlope).toFixed(3)),
      },
    }),
    [liveTreasury, simulatedBaseRate, simulatedCurveSlope],
  );

  const simulatedAssessment = useMemo(() => {
    return evaluateRegime(simulatedTreasury);
  }, [simulatedTreasury]);

  const simulatedPlaybook = useMemo(() => {
    return getPlaybookGuidance(simulatedAssessment.regime, {
      scores: simulatedAssessment.scores,
      thresholds: simulatedAssessment.thresholds,
    });
  }, [simulatedAssessment]);

  // Deltas vs live baseline
  const regimeShifted = simulatedAssessment.regime !== liveAssessment.regime;
  const tightnessDelta =
    simulatedAssessment.scores.tightness - liveAssessment.scores.tightness;
  const riskAppetiteDelta =
    simulatedAssessment.scores.riskAppetite - liveAssessment.scores.riskAppetite;
  const baseRateDelta = simulatedBaseRate - liveBaseRate;
  const curveSlopeDelta = simulatedCurveSlope - liveCurveSlope;

  const isAtLiveBaseline =
    Math.abs(baseRateDelta) < 0.01 && Math.abs(curveSlopeDelta) < 0.01;

  const applyPreset = (preset: ScenarioPreset) => {
    setSimulatedBaseRate(preset.rate);
    setSimulatedCurveSlope(preset.slope);
  };

  const resetToLive = () => {
    setSimulatedBaseRate(liveBaseRate);
    setSimulatedCurveSlope(liveCurveSlope);
  };

  const handleCopySimulatedBrief = async () => {
    const briefText = [
      "==================================================",
      "SCENARIO — NOT THIS WEEK'S READING",
      "Numbers set by hand in the Whether scenario studio, not this week's data.",
      "==================================================",
      `Short-term borrowing rate ${simulatedBaseRate.toFixed(2)}% (${formatDelta(baseRateDelta, "%")}) | Recession warning gauge (10-year minus 2-year rate) ${simulatedCurveSlope.toFixed(2)}% (${formatDelta(curveSlopeDelta, "%")})`,
      `Conditions: ${getRegimePublicLabel(simulatedAssessment.regime)} (this week: ${getRegimePublicLabel(liveAssessment.regime)})`,
      `${ruleMetricLabel.tightness}: ${simulatedAssessment.scores.tightness}/100 (${formatDelta(tightnessDelta, " pts")})`,
      `${ruleMetricLabel.riskAppetite}: ${simulatedAssessment.scores.riskAppetite}/100 (${formatDelta(riskAppetiteDelta, " pts")})`,
      "",
      `Mandate: "${simulatedPlaybook.playbook?.mandate ?? ""}"`,
      `Tone: ${simulatedPlaybook.playbook?.tone ?? ""}`,
      "",
      "--- WHAT CHANGES ---",
      "What to STOP in this scenario:",
      ...simulatedPlaybook.stopItems.map((item) => ` • STOP: ${item}`),
      "",
      "What to START in this scenario:",
      ...simulatedPlaybook.startItems.map((item) => ` • START: ${item}`),
      "",
      "--- RULES BY AREA ---",
      ...simulatedPlaybook.operatingLevers.map(
        (lever) => ` • ${lever.label}: ${lever.actionNow} (${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${lever.triggerThreshold})`,
      ),
      "",
      `Link to this scenario: ${window.location.href}`,
    ].join("\n");

    await copyToClipboard(briefText, "simulated-brief");
  };

  const handleCopyShareableLink = async () => {
    await copyToClipboard(window.location.href, "shareable-link");
  };

  return (
    <div className="space-y-6">
      {/* Simulation Guardrail Banner */}
      <div
        role="alert"
        aria-live="polite"
        className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 shadow-sm backdrop-blur-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-fluid-nano font-bold tracking-widest text-amber-200 uppercase border border-amber-500/30">
              Simulated Scenario
            </span>
            <p className="text-xs font-semibold text-amber-100">
              What if the numbers were different
            </p>
          </div>
          <span className="text-fluid-nano text-amber-300/80">
            Not this week&apos;s data
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-amber-200/90">
          Move the sliders to test a plan against a different week.
        </p>
      </div>

      {/* Preset Library */}
      <section aria-labelledby="scenario-presets-heading" className="weather-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id="scenario-presets-heading" className="type-eyebrow">
              Presets
            </h3>
            <p className="mt-1 text-xs text-slate-300">
              Four preset scenarios. Each sets the short-term borrowing rate and the recession warning gauge (10-year minus 2-year rate).
            </p>
          </div>
          <button
            type="button"
            onClick={resetToLive}
            disabled={isAtLiveBaseline}
            className={`weather-pill px-3 py-1.5 text-xs font-semibold tracking-wider transition-colors ${
              isAtLiveBaseline
                ? "border-slate-800 text-slate-500 cursor-not-allowed"
                : "border-sky-500/50 text-sky-200 hover:border-sky-400 hover:bg-sky-500/15"
            }`}
          >
            Reset to this week
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRESETS.map((preset) => {
            const isActive =
              Math.abs(simulatedBaseRate - preset.rate) < 0.05 &&
              Math.abs(simulatedCurveSlope - preset.slope) < 0.05;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`weather-surface flex flex-col items-start p-3.5 text-left transition-all ${
                  isActive
                    ? "border-sky-400 bg-sky-500/15 shadow-[0_0_12px_rgba(56,189,248,0.2)]"
                    : "hover:border-slate-700 hover:bg-slate-900/60"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-xs font-semibold text-slate-100">
                    Rate {preset.rate.toFixed(2)}%, curve {formatDelta(preset.slope, "%")}
                  </span>
                  {isActive && (
                    <span className="text-[10px] font-bold text-sky-300 uppercase tracking-widest">
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[11px] leading-snug text-slate-400">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Dual Sliders Simulation Panel */}
      <section aria-labelledby="sliders-controls-heading" className="weather-panel p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id="sliders-controls-heading" className="type-section text-slate-100 flex items-center gap-2">
              <SlidersIcon className="h-4 w-4 text-sky-400" />
              Sliders
            </h3>
            <p className="mt-1 text-sm text-slate-300">
              Move either slider. The call, the scores, and the rules below update while you move it.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyShareableLink}
              className="weather-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-slate-100 transition-colors"
            >
              <CopyIcon className="h-3.5 w-3.5" />
              {copiedTarget === "shareable-link" ? "Link copied" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={handleCopySimulatedBrief}
              className="weather-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:text-sky-100 hover:border-sky-400/60 transition-colors"
            >
              <CopyIcon className="h-3.5 w-3.5" />
              {copiedTarget === "simulated-brief" ? "Copied" : "Copy this scenario"}
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Base Rate Slider */}
          <div className="weather-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="base-rate-slider" className="text-xs font-semibold text-slate-300">
                Short-term borrowing rate
              </label>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-sm font-bold text-sky-200">
                  {simulatedBaseRate.toFixed(2)}%
                </span>
                <span className="text-xs text-slate-400">
                  ({formatDelta(baseRateDelta, "%")} vs this week)
                </span>
              </div>
            </div>
            <input
              id="base-rate-slider"
              type="range"
              min="0.0"
              max="8.0"
              step="0.05"
              value={simulatedBaseRate}
              onChange={(e) => setSimulatedBaseRate(Number.parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg bg-slate-800 appearance-none cursor-pointer accent-sky-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.00% (zero rates)</span>
              <span>2.50% (neutral)</span>
              <span>5.00% (tight)</span>
              <span>8.00% (extreme)</span>
            </div>
          </div>

          {/* Curve Slope Slider */}
          <div className="weather-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="curve-slope-slider" className="text-xs font-semibold text-slate-300">
                Recession warning gauge (10-year minus 2-year rate)
              </label>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-sm font-bold text-sky-200">
                  {simulatedCurveSlope.toFixed(2)}%
                </span>
                <span className="text-xs text-slate-400">
                  ({formatDelta(curveSlopeDelta, "%")} vs this week)
                </span>
              </div>
            </div>
            <input
              id="curve-slope-slider"
              type="range"
              min="-1.5"
              max="2.5"
              step="0.05"
              value={simulatedCurveSlope}
              onChange={(e) => setSimulatedCurveSlope(Number.parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg bg-slate-800 appearance-none cursor-pointer accent-sky-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>-1.50% (deeply inverted)</span>
              <span>0.00% (flat)</span>
              <span>+1.00% (normal)</span>
              <span>+2.50% (steep)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Side-by-Side Then-vs-Now / Live vs Simulated Delta Panel */}
      <section aria-labelledby="deltas-heading" className="weather-panel p-6 space-y-5">
        <h3 id="deltas-heading" className="type-eyebrow">
          This week vs. this scenario
        </h3>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Regime Shift Card */}
          <div className="weather-surface p-4 flex flex-col justify-between">
            <p className="type-eyebrow text-slate-400">Conditions</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400 line-through">
                {getRegimePublicLabel(liveAssessment.regime)}
              </span>
              <span className="text-slate-500">→</span>
              <span
                className={`text-sm font-bold tracking-wider px-2.5 py-1 rounded ${
                  regimeShifted
                    ? "bg-sky-500/20 text-sky-200 border border-sky-400/40 shadow-[0_0_8px_rgba(56,189,248,0.25)]"
                    : "bg-slate-800 text-slate-200"
                }`}
              >
                {getRegimePublicLabel(simulatedAssessment.regime)}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              {regimeShifted ? "The call would change" : "Same call as this week"}
            </p>
          </div>

          {/* Funding Pressure Card */}
          <div className="weather-surface p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="type-eyebrow text-slate-400">{ruleMetricLabel.tightness}</p>
              <span
                className={`text-xs font-mono font-semibold ${
                  tightnessDelta > 0
                    ? "text-rose-400"
                    : tightnessDelta < 0
                    ? "text-emerald-400"
                    : "text-slate-400"
                }`}
              >
                {formatDelta(tightnessDelta, " pts")}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-100">
                {simulatedAssessment.scores.tightness}
              </span>
              <span className="text-xs text-slate-400 font-mono">/ 100</span>
              {simulatedAssessment.scores.tightnessSaturated && (
                <span className="text-[10px] text-amber-300 font-mono">· ceiling</span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              This week: {liveAssessment.scores.tightness}
            </p>
          </div>

          {/* Risk Appetite Card */}
          <div className="weather-surface p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="type-eyebrow text-slate-400">{ruleMetricLabel.riskAppetite}</p>
              <span
                className={`text-xs font-mono font-semibold ${
                  riskAppetiteDelta > 0
                    ? "text-emerald-400"
                    : riskAppetiteDelta < 0
                    ? "text-rose-400"
                    : "text-slate-400"
                }`}
              >
                {formatDelta(riskAppetiteDelta, " pts")}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-100">
                {simulatedAssessment.scores.riskAppetite}
              </span>
              <span className="text-xs text-slate-400 font-mono">/ 100</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              This week: {liveAssessment.scores.riskAppetite}
            </p>
          </div>
        </div>
      </section>

      {/* Simulated Operating Mandate & Playbook Deltas */}
      <section aria-labelledby="playbook-deltas-heading" className="weather-panel p-6 space-y-6">
        <div>
          <h3 id="playbook-deltas-heading" className="type-section text-slate-100">
            What you&apos;d stop and start in this scenario
          </h3>
        </div>

        {simulatedPlaybook.playbook && (
          <div className="weather-surface p-4 border-l-4 border-sky-400">
            <p className="type-eyebrow text-sky-200">The call in this scenario</p>
            <p className="mt-1 text-base font-semibold text-slate-100">
              &quot;{simulatedPlaybook.playbook.mandate}&quot;
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Tone: {simulatedPlaybook.playbook.tone} · {simulatedPlaybook.playbook.insight}
            </p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Stop Items */}
          <div className="weather-surface p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-rose-400" />
              What to STOP in this scenario
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              {simulatedPlaybook.stopItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Start Items */}
          <div className="weather-surface p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              What to START in this scenario
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              {simulatedPlaybook.startItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Operating Levers Table */}
        <div className="space-y-3">
          <h4 className="type-eyebrow text-slate-400">
            Rules by area in this scenario
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th scope="col" className="py-2 pr-3 w-1/5">Area</th>
                  <th scope="col" className="py-2 pr-3 w-2/5">{DECISION_CONTRACT_LABELS.action.actionNow}</th>
                  <th scope="col" className="py-2 pr-3 w-2/5">{DECISION_CONTRACT_LABELS.threshold.pauseIf}</th>
                </tr>
              </thead>
              <tbody>
                {simulatedPlaybook.operatingLevers.map((lever) => (
                  <tr key={lever.lever} className="border-b border-slate-800/50 last:border-0">
                    <td className="py-2.5 pr-3 font-semibold text-slate-200">
                      {lever.label}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-300 leading-relaxed">
                      {lever.actionNow}
                    </td>
                    <td className="py-2.5 pr-3 text-amber-200/90 leading-relaxed">
                      {lever.triggerThreshold}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
