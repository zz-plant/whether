"use client";

import { Field } from "@base-ui/react/field";
import { Fieldset } from "@base-ui/react/fieldset";
import { Form } from "@base-ui/react/form";
import { Input } from "@base-ui/react/input";
import { formatDecisionAction } from "../../../lib/decisionShield";
import {
  categoryOptions,
  formatOptionLabel,
  lifecycleOptions,
} from "./decisionShieldUtils";
import {
  useDecisionShieldPresets,
  type CurrentSelection,
} from "./useDecisionShieldPresets";

const PRESET_HINT_ID = "preset-limit-hint";

const STARTER_SCENARIOS: readonly {
  name: string;
  lifecycle: CurrentSelection["lifecycle"];
  category: CurrentSelection["category"];
  action: CurrentSelection["action"];
}[] = [
  {
    name: "Procurement: Vendor discount vs yield",
    lifecycle: "GROWTH",
    category: "PRICING",
    action: "DISCOUNT",
  },
  {
    name: "Engineering: Tech debt refactor window",
    lifecycle: "GROWTH",
    category: "ROADMAP",
    action: "REWRITE",
  },
  {
    name: "Talent: Strategic senior hire",
    lifecycle: "GROWTH",
    category: "HIRING",
    action: "HIRE",
  },
  {
    name: "Capital: Discretionary spend control",
    lifecycle: "GROWTH",
    category: "RESTRUCTURING",
    action: "RESTRUCTURE",
  },
];

export const DecisionShieldPresetsSection = ({
  currentSelection,
  onApplyPreset,
}: {
  currentSelection: CurrentSelection;
  onApplyPreset: (preset: CurrentSelection) => void;
}) => {
  const {
    presets,
    presetName,
    setPresetName,
    presetError,
    presetStatus,
    presetInputRef,
    handlePresetSave,
    handlePresetApply,
    handlePresetDelete,
    handlePresetBlur,
  } = useDecisionShieldPresets({ currentSelection, onApplyPreset });

  return (
    <div className="weather-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="type-label text-slate-400">Saved scenarios</p>
          <p className="mt-2 text-sm text-slate-300">
            Save these settings to come back to them.
          </p>
        </div>
        <p id={PRESET_HINT_ID} className="text-xs text-slate-400">
          Max 8 presets
        </p>
      </div>
      <Form onFormSubmit={handlePresetSave} className="mt-4">
        <Fieldset.Root className="flex min-w-0 flex-wrap items-start gap-3 border-0 p-0">
          <Fieldset.Legend className="sr-only">Save a reusable Decision Shield preset</Fieldset.Legend>
          <Field.Root className="flex w-full flex-col gap-2 text-xs font-semibold text-slate-400 sm:max-w-xs">
            <Field.Label nativeLabel={false} render={<span />}>Preset name</Field.Label>
            <Input
              ref={presetInputRef}
              type="text"
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
              onBlur={handlePresetBlur}
              aria-invalid={Boolean(presetError)}
              aria-describedby={[presetError ? "preset-error" : null, PRESET_HINT_ID]
                .filter(Boolean)
                .join(" ")}
              className="weather-input min-h-[44px] w-full px-3 py-2 text-base transition-colors hover:border-sky-500/70"
            />
          </Field.Root>
          <button
            type="submit"
            className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold transition-colors hover:border-sky-400/70 hover:text-slate-100"
          >
            Save preset
          </button>
        </Fieldset.Root>
      </Form>
      <div className="mt-2 min-h-[20px]">
        {presetError ? (
          <p id="preset-error" className="text-xs text-amber-200">
            {presetError}
          </p>
        ) : null}
      </div>
      <output className="sr-only" aria-live="polite">
        {presetStatus ?? ""}
      </output>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {presets.length === 0 ? (
          <div className="col-span-full space-y-3">
            <p className="text-sm text-slate-400">
              No presets yet. Save one to come back to this decision.
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-fluid-nano text-slate-400">Or load a starter scenario:</span>
              {STARTER_SCENARIOS.map((starter) => (
                <button
                  key={starter.name}
                  type="button"
                  onClick={() => onApplyPreset(starter)}
                  className="inline-flex items-center rounded-sm border border-slate-700/80 bg-slate-900/90 px-2.5 py-0.5 text-fluid-nano font-medium text-slate-300 transition-colors hover:border-sky-500/50 hover:bg-slate-800 hover:text-sky-200"
                >
                  {starter.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          presets.map((preset) => (
            <div key={preset.id} className="rounded-lg border border-slate-800/60 p-3">
              <p className="text-xs font-semibold text-slate-400">
                {preset.name}
              </p>
              <p className="mt-2 text-sm text-slate-200">
                {formatOptionLabel(preset.lifecycle, lifecycleOptions)} ·{" "}
                {formatOptionLabel(preset.category, categoryOptions)} ·{" "}
                {formatDecisionAction(preset.action)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handlePresetApply(preset.id)}
                  className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-1 text-xs font-semibold text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetDelete(preset.id)}
                  className="weather-pill inline-flex min-h-[44px] items-center justify-center !border-rose-400/40 px-3 py-1 text-xs font-semibold text-rose-200 transition-colors hover:!border-rose-300/70 hover:text-rose-100"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
