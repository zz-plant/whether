/**
 * Assumption Lock panel to freeze posture assumptions and surface them as an operational banner.
 */
"use client";

import { useEffect, useState } from "react";
import { Field } from "@base-ui/react/field";
import { Select } from "@base-ui/react/select";
import { formatDateUTC } from "../../../lib/formatters";
import { SectionPanelHeader } from "../../components/sectionPanelHeader";
import { usePersistedQuerySelections } from "./usePersistedQuerySelections";

type AssumptionOption<T extends string> = {
  value: T;
  label: string;
  description: string;
};

type RiskPosture = "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";
type ThresholdTolerance = "STRICT" | "STANDARD" | "FLEXIBLE";
type InterpretationStance = "LITERAL" | "CONTEXTUAL" | "FORWARD_LEANING";

const riskPostureOptions: AssumptionOption<RiskPosture>[] = [
  {
    value: "CONSERVATIVE",
    label: "Conservative",
    description: "Assume capital stays tight; prioritize downside protection.",
  },
  {
    value: "BALANCED",
    label: "Balanced",
    description: "Operate on the published signals with no bias.",
  },
  {
    value: "AGGRESSIVE",
    label: "Aggressive",
    description: "Lean into upside; accept more volatility in execution.",
  },
];

const thresholdOptions: AssumptionOption<ThresholdTolerance>[] = [
  {
    value: "STRICT",
    label: "Strict",
    description: "Treat threshold crossings as immediate trigger points.",
  },
  {
    value: "STANDARD",
    label: "Standard",
    description: "Default tolerance aligned with current thresholds.",
  },
  {
    value: "FLEXIBLE",
    label: "Flexible",
    description: "Allow more buffer before shifting posture.",
  },
];

const stanceOptions: AssumptionOption<InterpretationStance>[] = [
  {
    value: "LITERAL",
    label: "Literal",
    description: "Use signal readouts as-is with no narrative overlay.",
  },
  {
    value: "CONTEXTUAL",
    label: "Contextual",
    description: "Blend Treasury signals with policy and market context.",
  },
  {
    value: "FORWARD_LEANING",
    label: "Forward-leaning",
    description: "Bias toward the next expected rate regime.",
  },
];

const parseOption = <T extends string>(
  value: string | null,
  options: AssumptionOption<T>[]
): T | null => options.find((option) => option.value === value)?.value ?? null;

const formatDate = (value: string | null) => (value ? formatDateUTC(value) : null);

const assumptionFieldConfigs = {
  riskPosture: {
    queryParam: "assumptionRisk",
    parse: (value: string | null) => parseOption(value, riskPostureOptions),
    serialize: (value: RiskPosture) => value,
  },
  thresholdTolerance: {
    queryParam: "assumptionTolerance",
    parse: (value: string | null) => parseOption(value, thresholdOptions),
    serialize: (value: ThresholdTolerance) => value,
  },
  interpretationStance: {
    queryParam: "assumptionStance",
    parse: (value: string | null) => parseOption(value, stanceOptions),
    serialize: (value: InterpretationStance) => value,
  },
  lockedAt: {
    queryParam: "assumptionLockedAt",
    parse: (value: string | null) => value,
    serialize: (value: string | null) => value,
  },
} as const;

export const AssumptionLockPanel = () => {
  const {
    state: {
      riskPosture,
      thresholdTolerance,
      interpretationStance,
      lockedAt,
    },
    setField,
  } = usePersistedQuerySelections({
    initialState: {
      riskPosture: "BALANCED" as RiskPosture,
      thresholdTolerance: "STANDARD" as ThresholdTolerance,
      interpretationStance: "LITERAL" as InterpretationStance,
      lockedAt: null as string | null,
    },
    storageKey: "whether.assumptions",
    fields: assumptionFieldConfigs,
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleLock = () => {
    const nextLockedAt = new Date().toISOString();
    setField("lockedAt", nextLockedAt);
    setStatusMessage("Assumptions locked.");
  };

  const handleUnlock = () => {
    setField("lockedAt", null);
    setStatusMessage("Assumptions unlocked.");
  };

  const lockedLabel = formatDate(lockedAt);
  const lockedBanner = lockedLabel
    ? `Operating under locked assumptions from ${lockedLabel}.`
    : null;

  return (
    <section id="assumption-locking" aria-labelledby="assumption-locking-title" className="mt-10">
      <div className="weather-panel p-6">
        <SectionPanelHeader
          label="Assumption locking"
          title="Freeze the posture your team is operating under"
          titleId="assumption-locking-title"
          description={
            <>
              Lock the posture assumptions to keep debate explicit and prevent silent drift between
              teams.
            </>
          }
          aside={
            <>
              <p className="text-right text-xs text-slate-400">
                Risk posture, threshold tolerance, and stance are stored in the URL.
              </p>
              <p className="text-right text-xs text-slate-400">
                Use the banner to confirm the lock during reviews.
              </p>
            </>
          }
        />

        {lockedBanner ? (
          <div className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <p className="text-xs font-semibold tracking-[0.12em] text-emerald-200">
              Locked assumption banner
            </p>
            <p className="mt-2 text-sm text-emerald-100">{lockedBanner}</p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="weather-surface p-4">
            <Field.Root className="space-y-3">
              <Field.Label className="type-label text-slate-400" nativeLabel={false}>
                Risk posture
              </Field.Label>
              <Select.Root
                id="assumption-risk"
                value={riskPosture}
                onValueChange={(value) => setField("riskPosture", value as RiskPosture)}
              >
                <Select.Trigger className="weather-input flex min-h-[44px] w-full items-center justify-between px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200">
                  <Select.Value placeholder="Select risk posture" />
                  <Select.Icon className="text-slate-400">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                      <path
                        d="M7 10l5 5 5-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner side="bottom" align="start" sideOffset={8}>
                    <Select.Popup className="min-w-[220px] rounded-xl border border-slate-800/80 bg-slate-950/95 p-1 text-sm text-slate-100 shadow-xl">
                      <Select.List className="max-h-64 overflow-y-auto">
                        {riskPostureOptions.map((option) => (
                          <Select.Item
                            key={option.value}
                            value={option.value}
                            className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition-colors data-[highlighted]:bg-slate-800/70 data-[selected]:text-emerald-200"
                          >
                            <Select.ItemText>{option.label}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.List>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
              <p className="text-sm text-slate-300">
                {riskPostureOptions.find((option) => option.value === riskPosture)?.description}
              </p>
            </Field.Root>
          </div>
          <div className="weather-surface p-4">
            <Field.Root className="space-y-3">
              <Field.Label className="type-label text-slate-400" nativeLabel={false}>
                Threshold tolerance
              </Field.Label>
              <Select.Root
                id="assumption-threshold"
                value={thresholdTolerance}
                onValueChange={(value) => setField("thresholdTolerance", value as ThresholdTolerance)}
              >
                <Select.Trigger className="weather-input flex min-h-[44px] w-full items-center justify-between px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200">
                  <Select.Value placeholder="Select tolerance" />
                  <Select.Icon className="text-slate-400">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                      <path
                        d="M7 10l5 5 5-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner side="bottom" align="start" sideOffset={8}>
                    <Select.Popup className="min-w-[220px] rounded-xl border border-slate-800/80 bg-slate-950/95 p-1 text-sm text-slate-100 shadow-xl">
                      <Select.List className="max-h-64 overflow-y-auto">
                        {thresholdOptions.map((option) => (
                          <Select.Item
                            key={option.value}
                            value={option.value}
                            className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition-colors data-[highlighted]:bg-slate-800/70 data-[selected]:text-emerald-200"
                          >
                            <Select.ItemText>{option.label}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.List>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
              <p className="text-sm text-slate-300">
                {thresholdOptions.find((option) => option.value === thresholdTolerance)?.description}
              </p>
            </Field.Root>
          </div>
          <div className="weather-surface p-4">
            <Field.Root className="space-y-3">
              <Field.Label className="type-label text-slate-400" nativeLabel={false}>
                Interpretation stance
              </Field.Label>
              <Select.Root
                id="assumption-stance"
                value={interpretationStance}
                onValueChange={(value) => setField("interpretationStance", value as InterpretationStance)}
              >
                <Select.Trigger className="weather-input flex min-h-[44px] w-full items-center justify-between px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200">
                  <Select.Value placeholder="Select stance" />
                  <Select.Icon className="text-slate-400">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                      <path
                        d="M7 10l5 5 5-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner side="bottom" align="start" sideOffset={8}>
                    <Select.Popup className="min-w-[220px] rounded-xl border border-slate-800/80 bg-slate-950/95 p-1 text-sm text-slate-100 shadow-xl">
                      <Select.List className="max-h-64 overflow-y-auto">
                        {stanceOptions.map((option) => (
                          <Select.Item
                            key={option.value}
                            value={option.value}
                            className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition-colors data-[highlighted]:bg-slate-800/70 data-[selected]:text-emerald-200"
                          >
                            <Select.ItemText>{option.label}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.List>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
              <p className="text-sm text-slate-300">
                {stanceOptions.find((option) => option.value === interpretationStance)?.description}
              </p>
            </Field.Root>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {lockedAt ? (
            <button
              type="button"
              onClick={handleUnlock}
              className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-rose-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200 touch-manipulation"
            >
              Unlock assumptions
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLock}
              className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-emerald-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 touch-manipulation"
            >
              Lock assumptions
            </button>
          )}
          <p className="text-sm text-slate-400">
            {lockedAt ? "Locked." : "Not locked yet."}
          </p>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {statusMessage ?? ""}
        </p>
      </div>
    </section>
  );
};
