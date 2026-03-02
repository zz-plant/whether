/**
 * Counterfactual panel to explore how rate and curve changes would alter the regime.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NumberField } from "@base-ui/react/number-field";
import { Slider } from "@base-ui/react/slider";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  classifyRegime,
  computeRiskAppetiteScore,
  computeTightnessScore,
  getRegimeProfile,
  type RegimeAssessment,
} from "../../../lib/regimeEngine";
import { DataProvenanceStrip, type DataProvenance } from "../../components/dataProvenanceStrip";
import { SectionPanelHeader } from "../../components/sectionPanelHeader";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatSigned = (value: number, suffix = "") =>
  `${value >= 0 ? "+" : ""}${value}${suffix}`;

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
    router.push(`${pathname}?${nextSearch}` as Route, { scroll: false });
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
  const hasScenarioShift = rateShiftBps !== 0 || slopeShiftBps !== 0;
  const tightnessDelta = adjustedTightness - assessment.scores.tightness;
  const riskAppetiteDelta = adjustedRiskAppetite - assessment.scores.riskAppetite;

  return (
    <section id="counterfactuals" aria-labelledby="counterfactuals-title" className="mt-10">
      <div className="weather-panel p-6">
        <SectionPanelHeader
          label="Counterfactual view"
          title="Test narratives before committing to them"
          titleId="counterfactuals-title"
          description={
            <>
              Adjust the base rate and curve slope to preview how the regime and constraints would
              respond.
            </>
          }
          aside={
            <>
              <span
                className={`weather-chip rounded-full border px-2 py-1 text-[10px] font-semibold tracking-[0.18em] ${
                  hasScenarioShift
                    ? "border-amber-500/60 text-amber-200"
                    : "border-slate-700 text-slate-300"
                }`}
              >
                {hasScenarioShift ? "SIMULATED" : "BASELINE"}
              </span>
              <DataProvenanceStrip provenance={provenance} />
            </>
          }
        />
        {hasScenarioShift ? (
          <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
              Assumptions locked
            </p>
            <p className="mt-2">
              Base rate {formatSigned(rateShiftBps, "bps")}, curve slope{" "}
              {formatSigned(slopeShiftBps, "bps")}. Treat this as simulated guidance.
            </p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="weather-surface p-4">
            <p className="type-label text-slate-400">Scenario sliders</p>
            <div className="mt-4 space-y-5">
              <div>
                <p className="type-kicker">
                  Base rate shift (bps)
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Slider.Root
                    id="rate-shift"
                    min={-200}
                    max={200}
                    step={25}
                    value={rateShiftBps}
                    onValueChange={(value) => setRateShiftBps(value as number)}
                    className="w-full"
                  >
                    <Slider.Control className="relative flex h-2 w-full items-center">
                      <Slider.Track className="relative h-2 w-full rounded-full bg-slate-800">
                        <Slider.Indicator className="absolute h-full rounded-full bg-sky-500/70" />
                      </Slider.Track>
                      <Slider.Thumb
                        className="absolute -top-1.5 h-5 w-5 rounded-full border border-slate-700/80 bg-slate-950 shadow-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
                        getAriaLabel={() => "Base rate shift in basis points"}
                      />
                    </Slider.Control>
                  </Slider.Root>
                  <NumberField.Root
                    min={-200}
                    max={200}
                    step={25}
                    value={rateShiftBps}
                    onValueChange={(value) =>
                      setRateShiftBps(clamp(value ?? 0, -200, 200))
                    }
                  >
                    <NumberField.Group>
                      <NumberField.Input
                        className="weather-input min-h-[44px] w-24 px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
                        aria-label="Base rate shift in basis points"
                      />
                    </NumberField.Group>
                  </NumberField.Root>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Current base rate: {baseRate.toFixed(2)}% → Scenario:{" "}
                  {adjustedBaseRate.toFixed(2)}%.
                </p>
              </div>
              <div>
                <p className="type-kicker">
                  Curve slope shift (bps)
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Slider.Root
                    id="slope-shift"
                    min={-200}
                    max={200}
                    step={25}
                    value={slopeShiftBps}
                    onValueChange={(value) => setSlopeShiftBps(value as number)}
                    className="w-full"
                  >
                    <Slider.Control className="relative flex h-2 w-full items-center">
                      <Slider.Track className="relative h-2 w-full rounded-full bg-slate-800">
                        <Slider.Indicator className="absolute h-full rounded-full bg-sky-500/70" />
                      </Slider.Track>
                      <Slider.Thumb
                        className="absolute -top-1.5 h-5 w-5 rounded-full border border-slate-700/80 bg-slate-950 shadow-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
                        getAriaLabel={() => "Curve slope shift in basis points"}
                      />
                    </Slider.Control>
                  </Slider.Root>
                  <NumberField.Root
                    min={-200}
                    max={200}
                    step={25}
                    value={slopeShiftBps}
                    onValueChange={(value) =>
                      setSlopeShiftBps(clamp(value ?? 0, -200, 200))
                    }
                  >
                    <NumberField.Group>
                      <NumberField.Input
                        className="weather-input min-h-[44px] w-24 px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
                        aria-label="Curve slope shift in basis points"
                      />
                    </NumberField.Group>
                  </NumberField.Root>
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
            <p className="mt-4 text-xs font-semibold tracking-[0.12em] text-slate-400">
              Scenario deltas
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li className="flex gap-2">
                <span className="text-slate-500">•</span>
                <span>
                  Base rate shift: {formatSigned(rateShiftBps, "bps")}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-slate-500">•</span>
                <span>
                  Curve slope shift: {formatSigned(slopeShiftBps, "bps")}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-slate-500">•</span>
                <span>
                  Tightness change: {formatSigned(Number(tightnessDelta.toFixed(1)))}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-slate-500">•</span>
                <span>
                  Risk appetite change: {formatSigned(Number(riskAppetiteDelta.toFixed(1)))}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-slate-500">•</span>
                <span>
                  Regime {assessment.regime === adjustedRegime ? "unchanged" : "shift"}:{" "}
                  {assessment.regime} → {adjustedRegime}
                </span>
              </li>
            </ul>
            <p className="mt-4 text-xs font-semibold tracking-[0.12em] text-slate-400">
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
