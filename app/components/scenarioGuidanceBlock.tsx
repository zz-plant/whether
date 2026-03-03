"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { computeScenarioOutcome } from "../../lib/counterfactual/scenario";
import type { RegimeAssessment } from "../../lib/regimeEngine";
import { operatingCallsByRegime, type OperatingCall } from "../../lib/report/operatingCalls";

const scenarioPresets = [
  {
    id: "baseline",
    label: "Baseline",
    detail: "No macro shift",
    rateShiftBps: 0,
    slopeShiftBps: 0,
  },
  {
    id: "rates-up-50",
    label: "Rates +50bps",
    detail: "Funding cost rises",
    rateShiftBps: 50,
    slopeShiftBps: -10,
  },
  {
    id: "demand-softening",
    label: "Demand softening",
    detail: "Buyer caution increases",
    rateShiftBps: 25,
    slopeShiftBps: -35,
  },
  {
    id: "hiring-freeze",
    label: "Hiring freeze",
    detail: "Management enforces constraint",
    rateShiftBps: 75,
    slopeShiftBps: -50,
  },
] as const;

type ScenarioId = (typeof scenarioPresets)[number]["id"];

const isScenarioId = (value: string | null): value is ScenarioId =>
  Boolean(value && scenarioPresets.some((scenario) => scenario.id === value));

export const ScenarioGuidanceBlock = ({
  assessment,
  baselineCalls,
}: {
  assessment: RegimeAssessment;
  baselineCalls: OperatingCall;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scenarioFromUrl = searchParams.get("scenario");
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId>(
    isScenarioId(scenarioFromUrl) ? scenarioFromUrl : "baseline",
  );

  useEffect(() => {
    if (!isScenarioId(scenarioFromUrl)) {
      if (selectedScenario !== "baseline") {
        setSelectedScenario("baseline");
      }
      return;
    }

    if (scenarioFromUrl !== selectedScenario) {
      setSelectedScenario(scenarioFromUrl);
    }
  }, [scenarioFromUrl, selectedScenario]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (selectedScenario === "baseline") {
      nextParams.delete("scenario");
    } else {
      nextParams.set("scenario", selectedScenario);
    }
    const nextSearch = nextParams.toString();
    if (nextSearch === searchParams.toString()) {
      return;
    }
    const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    router.push(nextUrl as Route, { scroll: false });
  }, [pathname, router, searchParams, selectedScenario]);

  const activeScenario = useMemo(
    () => scenarioPresets.find((scenario) => scenario.id === selectedScenario) ?? scenarioPresets[0],
    [selectedScenario],
  );
  const scenarioOutcome = computeScenarioOutcome(assessment, {
    rateShiftBps: activeScenario.rateShiftBps,
    slopeShiftBps: activeScenario.slopeShiftBps,
  });
  const scenarioCalls = operatingCallsByRegime[scenarioOutcome.adjustedRegime];

  return (
    <section className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-4" aria-label="Scenario comparison">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Scenario control</p>
          <p className="mt-1 text-sm text-slate-300">Compare baseline guidance with a compact counterfactual.</p>
        </div>
        <p className="text-xs text-slate-400">Scenario regime: {scenarioOutcome.adjustedRegime}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {scenarioPresets.map((scenario) => {
          const isSelected = scenario.id === selectedScenario;
          return (
            <button
              key={scenario.id}
              type="button"
              onClick={() => setSelectedScenario(scenario.id)}
              className={`min-h-[44px] rounded-full border px-3 py-2 text-xs font-semibold tracking-[0.08em] touch-manipulation transition-colors ${
                isSelected
                  ? "border-sky-300 bg-sky-500/20 text-sky-100"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
              aria-pressed={isSelected}
            >
              {scenario.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-slate-400">{activeScenario.detail}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <article className="rounded-lg border border-slate-700/70 bg-slate-900/50 p-3" aria-label="Baseline guidance">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Baseline guidance</p>
          <ul className="mt-2 space-y-2 text-sm text-slate-200">
            <li>• Hiring: {baselineCalls.hiring}</li>
            <li>• Roadmap: {baselineCalls.roadmap}</li>
            <li>• Spend: {baselineCalls.spend}</li>
          </ul>
        </article>
        <article className="rounded-lg border border-sky-500/40 bg-slate-900/50 p-3" aria-label="Scenario-adjusted guidance">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">Scenario-adjusted guidance</p>
          <ul className="mt-2 space-y-2 text-sm text-slate-100">
            <li>• Hiring: {scenarioCalls.hiring}</li>
            <li>• Roadmap: {scenarioCalls.roadmap}</li>
            <li>• Spend: {scenarioCalls.spend}</li>
          </ul>
        </article>
      </div>
    </section>
  );
};
