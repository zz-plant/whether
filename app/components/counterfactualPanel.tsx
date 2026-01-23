/**
 * Counterfactual panel to explore how rate and curve changes would alter the regime.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NumberField } from "@base-ui/react/number-field";
import { Slider } from "@base-ui/react/slider";
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
  const [rateShiftBpsA, setRateShiftBpsA] = useState(0);
  const [slopeShiftBpsA, setSlopeShiftBpsA] = useState(0);
  const [rateShiftBpsB, setRateShiftBpsB] = useState(0);
  const [slopeShiftBpsB, setSlopeShiftBpsB] = useState(0);
  const storageKey = "whether.counterfactual.scenarios";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const restoredFromStorage = useRef(false);

  const urlRateShiftA = useMemo(
    () => parseNumericParam(searchParams.get("cfRateBpsA")),
    [searchParams]
  );
  const urlSlopeShiftA = useMemo(
    () => parseNumericParam(searchParams.get("cfSlopeBpsA")),
    [searchParams]
  );
  const urlRateShiftB = useMemo(
    () => parseNumericParam(searchParams.get("cfRateBpsB")),
    [searchParams]
  );
  const urlSlopeShiftB = useMemo(
    () => parseNumericParam(searchParams.get("cfSlopeBpsB")),
    [searchParams]
  );
  const hasAnyUrlSelection =
    searchParams.has("cfRateBpsA") ||
    searchParams.has("cfSlopeBpsA") ||
    searchParams.has("cfRateBpsB") ||
    searchParams.has("cfSlopeBpsB");
  const hasValidUrlSelection =
    urlRateShiftA !== null ||
    urlSlopeShiftA !== null ||
    urlRateShiftB !== null ||
    urlSlopeShiftB !== null;

  useEffect(() => {
    if (hasValidUrlSelection) {
      if (urlRateShiftA !== null && urlRateShiftA !== rateShiftBpsA) {
        setRateShiftBpsA(urlRateShiftA);
      }
      if (urlSlopeShiftA !== null && urlSlopeShiftA !== slopeShiftBpsA) {
        setSlopeShiftBpsA(urlSlopeShiftA);
      }
      if (urlRateShiftB !== null && urlRateShiftB !== rateShiftBpsB) {
        setRateShiftBpsB(urlRateShiftB);
      }
      if (urlSlopeShiftB !== null && urlSlopeShiftB !== slopeShiftBpsB) {
        setSlopeShiftBpsB(urlSlopeShiftB);
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
      const parsed = JSON.parse(stored) as {
        rateShiftBpsA?: number;
        slopeShiftBpsA?: number;
        rateShiftBpsB?: number;
        slopeShiftBpsB?: number;
      };
      if (typeof parsed.rateShiftBpsA === "number") {
        setRateShiftBpsA(parsed.rateShiftBpsA);
      }
      if (typeof parsed.slopeShiftBpsA === "number") {
        setSlopeShiftBpsA(parsed.slopeShiftBpsA);
      }
      if (typeof parsed.rateShiftBpsB === "number") {
        setRateShiftBpsB(parsed.rateShiftBpsB);
      }
      if (typeof parsed.slopeShiftBpsB === "number") {
        setSlopeShiftBpsB(parsed.slopeShiftBpsB);
      }
    } catch {
      // Intentionally ignore storage restore errors to keep console clean.
    }
  }, [
    hasAnyUrlSelection,
    hasValidUrlSelection,
    rateShiftBpsA,
    rateShiftBpsB,
    slopeShiftBpsA,
    slopeShiftBpsB,
    storageKey,
    urlRateShiftA,
    urlRateShiftB,
    urlSlopeShiftA,
    urlSlopeShiftB,
  ]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          rateShiftBpsA,
          slopeShiftBpsA,
          rateShiftBpsB,
          slopeShiftBpsB,
        })
      );
    } catch {
      // Intentionally ignore storage persistence errors to keep console clean.
    }
  }, [rateShiftBpsA, rateShiftBpsB, slopeShiftBpsA, slopeShiftBpsB, storageKey]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("cfRateBpsA", String(rateShiftBpsA));
    nextParams.set("cfSlopeBpsA", String(slopeShiftBpsA));
    nextParams.set("cfRateBpsB", String(rateShiftBpsB));
    nextParams.set("cfSlopeBpsB", String(slopeShiftBpsB));
    const nextSearch = nextParams.toString();
    if (nextSearch === searchParams.toString()) {
      return;
    }
    router.push(`${pathname}?${nextSearch}`, { scroll: false });
  }, [
    pathname,
    rateShiftBpsA,
    rateShiftBpsB,
    router,
    searchParams,
    slopeShiftBpsA,
    slopeShiftBpsB,
  ]);

  const baseRate = assessment.scores.baseRate;
  const curveSlope = assessment.scores.curveSlope ?? 0;
  const buildScenario = (rateShiftBps: number, slopeShiftBps: number) => {
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
    return {
      baseRate: adjustedBaseRate,
      slope: adjustedSlope,
      tightness: adjustedTightness,
      riskAppetite: adjustedRiskAppetite,
      regime: adjustedRegime,
      profile: getRegimeProfile(adjustedRegime),
    };
  };
  const scenarioA = buildScenario(rateShiftBpsA, slopeShiftBpsA);
  const scenarioB = buildScenario(rateShiftBpsB, slopeShiftBpsB);
  const tightnessDelta = scenarioB.tightness - scenarioA.tightness;
  const riskDelta = scenarioB.riskAppetite - scenarioA.riskAppetite;
  const regimeDelta =
    scenarioA.regime === scenarioB.regime
      ? "No change"
      : `${scenarioA.regime} → ${scenarioB.regime}`;
  const addedConstraints = scenarioB.profile.constraints.filter(
    (constraint) => !scenarioA.profile.constraints.includes(constraint)
  );
  const removedConstraints = scenarioA.profile.constraints.filter(
    (constraint) => !scenarioB.profile.constraints.includes(constraint)
  );
  const currentProfile = getRegimeProfile(assessment.regime);
  const formatDelta = (value: number) => (value > 0 ? `+${value}` : `${value}`);

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
              Compare two macro narratives side by side by adjusting base rates and curve slopes.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <DataProvenanceStrip provenance={provenance} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="weather-surface p-4">
            <div className="flex items-center justify-between">
              <p className="type-label text-slate-400">Scenario A</p>
              <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">A</p>
            </div>
            <div className="mt-4 space-y-5">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  Base rate shift (bps)
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Slider.Root
                    id="rate-shift-a"
                    min={-200}
                    max={200}
                    step={25}
                    value={rateShiftBpsA}
                    onValueChange={(value) => setRateShiftBpsA(value as number)}
                    className="w-full"
                  >
                    <Slider.Control className="relative flex h-2 w-full items-center">
                      <Slider.Track className="relative h-2 w-full rounded-full bg-slate-800">
                        <Slider.Indicator className="absolute h-full rounded-full bg-sky-500/70" />
                      </Slider.Track>
                      <Slider.Thumb
                        className="absolute -top-1.5 h-5 w-5 rounded-full border border-slate-700/80 bg-slate-950 shadow-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
                        getAriaLabel={() => "Scenario A base rate shift in basis points"}
                      />
                    </Slider.Control>
                  </Slider.Root>
                  <NumberField.Root
                    min={-200}
                    max={200}
                    step={25}
                    value={rateShiftBpsA}
                    onValueChange={(value) =>
                      setRateShiftBpsA(clamp(value ?? 0, -200, 200))
                    }
                  >
                    <NumberField.Group>
                      <NumberField.Input
                        className="weather-input min-h-[44px] w-24 px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
                        aria-label="Scenario A base rate shift in basis points"
                      />
                    </NumberField.Group>
                  </NumberField.Root>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Current base rate: {baseRate.toFixed(2)}% → Scenario A:{" "}
                  {scenarioA.baseRate.toFixed(2)}%.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  Curve slope shift (bps)
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Slider.Root
                    id="slope-shift-a"
                    min={-200}
                    max={200}
                    step={25}
                    value={slopeShiftBpsA}
                    onValueChange={(value) => setSlopeShiftBpsA(value as number)}
                    className="w-full"
                  >
                    <Slider.Control className="relative flex h-2 w-full items-center">
                      <Slider.Track className="relative h-2 w-full rounded-full bg-slate-800">
                        <Slider.Indicator className="absolute h-full rounded-full bg-sky-500/70" />
                      </Slider.Track>
                      <Slider.Thumb
                        className="absolute -top-1.5 h-5 w-5 rounded-full border border-slate-700/80 bg-slate-950 shadow-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
                        getAriaLabel={() => "Scenario A curve slope shift in basis points"}
                      />
                    </Slider.Control>
                  </Slider.Root>
                  <NumberField.Root
                    min={-200}
                    max={200}
                    step={25}
                    value={slopeShiftBpsA}
                    onValueChange={(value) =>
                      setSlopeShiftBpsA(clamp(value ?? 0, -200, 200))
                    }
                  >
                    <NumberField.Group>
                      <NumberField.Input
                        className="weather-input min-h-[44px] w-24 px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
                        aria-label="Scenario A curve slope shift in basis points"
                      />
                    </NumberField.Group>
                  </NumberField.Root>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Current slope: {curveSlope.toFixed(2)}% → Scenario A:{" "}
                  {scenarioA.slope.toFixed(2)}%.
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-lg border border-slate-800/70 bg-slate-950/60 p-3">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Scenario A output
              </p>
              <p className="mt-3 text-sm text-slate-200">
                Regime: <span className="text-slate-100">{scenarioA.regime}</span>
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Tightness {scenarioA.tightness}/100 · Risk appetite {scenarioA.riskAppetite}/100
              </p>
              <p className="mt-4 text-xs font-semibold tracking-[0.12em] text-slate-400">
                Scenario A constraints
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {scenarioA.profile.constraints.map((constraint) => (
                  <li key={constraint} className="flex gap-2">
                    <span className="text-slate-500">•</span>
                    <span className="break-words">{constraint}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-slate-500">{scenarioA.profile.description}</p>
            </div>
          </div>
          <div className="weather-surface p-4">
            <div className="flex items-center justify-between">
              <p className="type-label text-slate-400">Scenario B</p>
              <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">B</p>
            </div>
            <div className="mt-4 space-y-5">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  Base rate shift (bps)
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Slider.Root
                    id="rate-shift-b"
                    min={-200}
                    max={200}
                    step={25}
                    value={rateShiftBpsB}
                    onValueChange={(value) => setRateShiftBpsB(value as number)}
                    className="w-full"
                  >
                    <Slider.Control className="relative flex h-2 w-full items-center">
                      <Slider.Track className="relative h-2 w-full rounded-full bg-slate-800">
                        <Slider.Indicator className="absolute h-full rounded-full bg-fuchsia-500/70" />
                      </Slider.Track>
                      <Slider.Thumb
                        className="absolute -top-1.5 h-5 w-5 rounded-full border border-slate-700/80 bg-slate-950 shadow-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-200"
                        getAriaLabel={() => "Scenario B base rate shift in basis points"}
                      />
                    </Slider.Control>
                  </Slider.Root>
                  <NumberField.Root
                    min={-200}
                    max={200}
                    step={25}
                    value={rateShiftBpsB}
                    onValueChange={(value) =>
                      setRateShiftBpsB(clamp(value ?? 0, -200, 200))
                    }
                  >
                    <NumberField.Group>
                      <NumberField.Input
                        className="weather-input min-h-[44px] w-24 px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-200"
                        aria-label="Scenario B base rate shift in basis points"
                      />
                    </NumberField.Group>
                  </NumberField.Root>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Current base rate: {baseRate.toFixed(2)}% → Scenario B:{" "}
                  {scenarioB.baseRate.toFixed(2)}%.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  Curve slope shift (bps)
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Slider.Root
                    id="slope-shift-b"
                    min={-200}
                    max={200}
                    step={25}
                    value={slopeShiftBpsB}
                    onValueChange={(value) => setSlopeShiftBpsB(value as number)}
                    className="w-full"
                  >
                    <Slider.Control className="relative flex h-2 w-full items-center">
                      <Slider.Track className="relative h-2 w-full rounded-full bg-slate-800">
                        <Slider.Indicator className="absolute h-full rounded-full bg-fuchsia-500/70" />
                      </Slider.Track>
                      <Slider.Thumb
                        className="absolute -top-1.5 h-5 w-5 rounded-full border border-slate-700/80 bg-slate-950 shadow-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-200"
                        getAriaLabel={() => "Scenario B curve slope shift in basis points"}
                      />
                    </Slider.Control>
                  </Slider.Root>
                  <NumberField.Root
                    min={-200}
                    max={200}
                    step={25}
                    value={slopeShiftBpsB}
                    onValueChange={(value) =>
                      setSlopeShiftBpsB(clamp(value ?? 0, -200, 200))
                    }
                  >
                    <NumberField.Group>
                      <NumberField.Input
                        className="weather-input min-h-[44px] w-24 px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-200"
                        aria-label="Scenario B curve slope shift in basis points"
                      />
                    </NumberField.Group>
                  </NumberField.Root>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Current slope: {curveSlope.toFixed(2)}% → Scenario B:{" "}
                  {scenarioB.slope.toFixed(2)}%.
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-lg border border-slate-800/70 bg-slate-950/60 p-3">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Scenario B output
              </p>
              <p className="mt-3 text-sm text-slate-200">
                Regime: <span className="text-slate-100">{scenarioB.regime}</span>
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Tightness {scenarioB.tightness}/100 · Risk appetite {scenarioB.riskAppetite}/100
              </p>
              <p className="mt-4 text-xs font-semibold tracking-[0.12em] text-slate-400">
                Scenario B constraints
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {scenarioB.profile.constraints.map((constraint) => (
                  <li key={constraint} className="flex gap-2">
                    <span className="text-slate-500">•</span>
                    <span className="break-words">{constraint}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-slate-500">{scenarioB.profile.description}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 weather-surface p-4">
          <p className="type-label text-slate-400">Scenario delta summary</p>
          <div className="mt-3 grid gap-4 lg:grid-cols-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Score movement (B - A)
              </p>
              <p className="mt-3 text-sm text-slate-200">
                Tightness: <span className="text-slate-100">{formatDelta(tightnessDelta)}</span>
              </p>
              <p className="mt-2 text-sm text-slate-200">
                Risk appetite:{" "}
                <span className="text-slate-100">{formatDelta(riskDelta)}</span>
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Regime comparison
              </p>
              <p className="mt-3 text-sm text-slate-200">{regimeDelta}</p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Constraint deltas
              </p>
              <div className="mt-3 space-y-3 text-sm text-slate-300">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Added in Scenario B</p>
                  {addedConstraints.length ? (
                    <ul className="mt-2 space-y-1">
                      {addedConstraints.map((constraint) => (
                        <li key={constraint} className="flex gap-2">
                          <span className="text-slate-500">+</span>
                          <span className="break-words">{constraint}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">No additions</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Removed in Scenario B</p>
                  {removedConstraints.length ? (
                    <ul className="mt-2 space-y-1">
                      {removedConstraints.map((constraint) => (
                        <li key={constraint} className="flex gap-2">
                          <span className="text-slate-500">−</span>
                          <span className="break-words">{constraint}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">No removals</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="weather-surface p-4">
            <p className="type-label text-slate-400">Current regime</p>
            <p className="mt-3 text-sm text-slate-200">{assessment.regime}</p>
            <p className="mt-2 text-xs text-slate-500">{currentProfile.description}</p>
          </div>
          <div className="weather-surface p-4">
            <p className="type-label text-slate-400">Scenario narrative lens</p>
            <p className="mt-3 text-sm text-slate-200">
              Compare the guidance across scenarios before committing to a posture shift.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Use the delta summary above to spot where constraints diverge.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
