/**
 * Counterfactual panel to explore how rate and curve changes would alter the regime.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  classifyRegime,
  computeRiskAppetiteScore,
  computeTightnessScore,
  getRegimeProfile,
  type RegimeAssessment,
} from "../../lib/regimeEngine";
import { DataProvenanceStrip, type DataProvenance } from "./dataProvenanceStrip";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseNumericParam = (value: string | null) => {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const CounterfactualPanel = ({
  assessment,
  provenance,
}: {
  assessment: RegimeAssessment;
  provenance: DataProvenance;
}) => {
  const [rateShiftBps, setRateShiftBps] = useState(0);
  const [slopeShiftBps, setSlopeShiftBps] = useState(0);
  const storageKey = "whether.counterfactual";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const restoredFromStorage = useRef(false);

  const urlRateShift = useMemo(() => parseNumericParam(searchParams.get("cfRateBps")), [searchParams]);
  const urlSlopeShift = useMemo(
    () => parseNumericParam(searchParams.get("cfSlopeBps")),
    [searchParams]
  );
  const hasAnyUrlSelection =
    searchParams.has("cfRateBps") || searchParams.has("cfSlopeBps");
  const hasValidUrlSelection = urlRateShift !== null || urlSlopeShift !== null;

  useEffect(() => {
    if (hasValidUrlSelection) {
      if (urlRateShift !== null && urlRateShift !== rateShiftBps) {
        setRateShiftBps(urlRateShift);
      }
      if (urlSlopeShift !== null && urlSlopeShift !== slopeShiftBps) {
        setSlopeShiftBps(urlSlopeShift);
      }
      return;
    }
    if (hasAnyUrlSelection) {
      return;
    }
    if (restoredFromStorage.current) {
      return;
    }
    restoredFromStorage.current = true;
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as { rateShiftBps?: number; slopeShiftBps?: number };
      if (typeof parsed.rateShiftBps === "number") {
        setRateShiftBps(parsed.rateShiftBps);
      }
      if (typeof parsed.slopeShiftBps === "number") {
        setSlopeShiftBps(parsed.slopeShiftBps);
      }
    } catch {
      // Intentionally ignore storage restore errors to keep console clean.
    }
  }, [
    hasAnyUrlSelection,
    hasValidUrlSelection,
    rateShiftBps,
    slopeShiftBps,
    storageKey,
    urlRateShift,
    urlSlopeShift,
  ]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ rateShiftBps, slopeShiftBps })
      );
    } catch {
      // Intentionally ignore storage persistence errors to keep console clean.
    }
  }, [rateShiftBps, slopeShiftBps, storageKey]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("cfRateBps", String(rateShiftBps));
    nextParams.set("cfSlopeBps", String(slopeShiftBps));
    const nextSearch = nextParams.toString();
    if (nextSearch === searchParams.toString()) {
      return;
    }
    router.push(`${pathname}?${nextSearch}`, { scroll: false });
  }, [pathname, rateShiftBps, router, searchParams, slopeShiftBps]);

  const baseRate = assessment.scores.baseRate;
  const curveSlope = assessment.scores.curveSlope ?? 0;
  const adjustedBaseRate = clamp(baseRate + rateShiftBps / 100, 0, 15);
  const adjustedSlope = clamp(curveSlope + slopeShiftBps / 100, -5, 5);
  const adjustedTightness = computeTightnessScore(
    adjustedBaseRate,
    adjustedSlope,
    assessment.thresholds.baseRateTightness
  );
  const adjustedRiskAppetite = computeRiskAppetiteScore(adjustedSlope);
  const adjustedRegime = classifyRegime(
    adjustedTightness,
    adjustedRiskAppetite,
    assessment.thresholds
  );
  const adjustedProfile = getRegimeProfile(adjustedRegime);
  const currentProfile = getRegimeProfile(assessment.regime);

  return (
    <section id="counterfactuals" aria-labelledby="counterfactuals-title" className="mt-10">
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Counterfactual view</p>
            <h3 id="counterfactuals-title" className="type-section text-slate-100">
              Test narratives before committing to them
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Adjust the base rate and curve slope to preview how the regime and constraints would
              respond.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <DataProvenanceStrip provenance={provenance} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="weather-surface p-4">
            <p className="type-label text-slate-400">Scenario sliders</p>
            <div className="mt-4 space-y-5">
              <div>
                <label htmlFor="rate-shift" className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Base rate shift (bps)
                </label>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input
                    id="rate-shift"
                    type="range"
                    min={-200}
                    max={200}
                    step={25}
                    value={rateShiftBps}
                    onChange={(event) => setRateShiftBps(Number(event.target.value))}
                    className="h-2 w-full cursor-pointer accent-sky-400"
                  />
                  <input
                    type="number"
                    min={-200}
                    max={200}
                    step={25}
                    value={rateShiftBps}
                    onChange={(event) =>
                      setRateShiftBps(clamp(Number(event.target.value) || 0, -200, 200))
                    }
                    className="weather-input min-h-[44px] w-24 px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
                    aria-label="Base rate shift in basis points"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Current base rate: {baseRate.toFixed(2)}% → Scenario:{" "}
                  {adjustedBaseRate.toFixed(2)}%.
                </p>
              </div>
              <div>
                <label htmlFor="slope-shift" className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Curve slope shift (bps)
                </label>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input
                    id="slope-shift"
                    type="range"
                    min={-200}
                    max={200}
                    step={25}
                    value={slopeShiftBps}
                    onChange={(event) => setSlopeShiftBps(Number(event.target.value))}
                    className="h-2 w-full cursor-pointer accent-sky-400"
                  />
                  <input
                    type="number"
                    min={-200}
                    max={200}
                    step={25}
                    value={slopeShiftBps}
                    onChange={(event) =>
                      setSlopeShiftBps(clamp(Number(event.target.value) || 0, -200, 200))
                    }
                    className="weather-input min-h-[44px] w-24 px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
                    aria-label="Curve slope shift in basis points"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Current slope: {curveSlope.toFixed(2)}% → Scenario:{" "}
                  {adjustedSlope.toFixed(2)}%.
                </p>
              </div>
            </div>
          </div>
          <div className="weather-surface p-4">
            <p className="type-label text-slate-400">Counterfactual output</p>
            <p className="mt-3 text-sm text-slate-200">
              Scenario regime: <span className="text-slate-100">{adjustedRegime}</span>
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Tightness {adjustedTightness}/100 · Risk appetite {adjustedRiskAppetite}/100
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-400">
              Scenario constraints
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {adjustedProfile.constraints.map((constraint) => (
                <li key={constraint} className="flex gap-2">
                  <span className="text-slate-500">•</span>
                  <span className="break-words">{constraint}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="weather-surface p-4">
            <p className="type-label text-slate-400">Current regime</p>
            <p className="mt-3 text-sm text-slate-200">{assessment.regime}</p>
            <p className="mt-2 text-xs text-slate-500">{currentProfile.description}</p>
          </div>
          <div className="weather-surface p-4">
            <p className="type-label text-slate-400">Scenario narrative</p>
            <p className="mt-3 text-sm text-slate-200">{adjustedProfile.description}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
