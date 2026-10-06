/**
 * Decision Shield panel for applying the weekly call to a specific operator decision.
 * Keeps verdict output shareable and grounded in sensor-driven signals.
 */
"use client";

import { useMemo } from "react";
import { Fieldset } from "@base-ui/react/fieldset";
import { LabeledSelectField, type LabeledSelectOption } from "../../components/labeledSelectField";
import type {
  DecisionAction,
  DecisionCategory,
  LifecycleStage,
} from "../../../lib/decisionShield";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import { publicDecisionLabels } from "../../../lib/report/reportFormatting";
import { ClipboardActionRow } from "../../components/clipboardActionRow";
import { SegmentedControl, type SegmentedOption } from "../../components/ui/segmentedControl";
import { SpinnerIcon } from "../../components/uiIcons";
import { getClipboardUiState } from "../../components/useClipboardCopy";
import { ComparePlansMode, PlanStressTestMode } from "./decisionShieldPlanModes";
import { RecordDecisionButton } from "./recordDecisionButton";
import { DecisionShieldPresetsSection } from "./decisionShieldPresetsSection";
import { useDecisionShieldState, type PlanMode } from "./useDecisionShieldState";
import {
  actionOptions,
  categoryOptions,
  hiringPauseApplies,
  lifecycleOptions,
  verdictStyles,
} from "./decisionShieldUtils";

const lifecycleSelectOptions: LabeledSelectOption<LifecycleStage>[] = lifecycleOptions.map((option) => ({
  value: option.value,
  label: option.label,
}));

const categorySelectOptions: LabeledSelectOption<DecisionCategory>[] = categoryOptions.map((option) => ({
  value: option.value,
  label: option.label,
}));

const actionSelectOptions: LabeledSelectOption<DecisionAction>[] = actionOptions.map((option) => ({
  value: option.value,
  label: option.label,
}));

const planModeOptions: readonly SegmentedOption<PlanMode>[] = [
  { key: "natural_language", label: "Describe a plan" },
  { key: "compare", label: "Compare two plans" },
  { key: "dropdown", label: "Pick from a list" },
];

export const DecisionShieldPanel = ({
  assessment,
  recordDate,
}: {
  assessment: RegimeAssessment;
  /** The reading this verdict was computed against, stored with anything recorded. */
  recordDate: string;
}) => {
  const {
    lifecycle,
    category,
    action,
    setField,
    selectLifecycle,
    applyPresetSelection,
    planMode,
    setPlanMode,
    planText,
    setPlanText,
    planBText,
    setPlanBText,
    businessModel,
    setBusinessModel,
    profile,
    setProfileField,
    planReady,
    comparisonReady,
    stressTestResult,
    comparisonResult,
    output,
    buildLedgerPayload,
    shareText,
    handleCopy,
    handleCopyLink,
    clipboardState,
    lastAttemptedTarget,
  } = useDecisionShieldState({ assessment, recordDate });

  const currentSelection = useMemo(
    () => ({ lifecycle, category, action }),
    [lifecycle, category, action]
  );

  return (
    /* The body only. The plan page's step already asks the question and names the
       moves; this panel used to ask it again in its own header, put Copy verdict,
       Copy link and Record above the input — before there was a verdict to copy —
       and print a provenance block the page's trust line already states. */
    <section id="decision-shield" aria-label="Test a decision">
      <div>
        {/* The toast above is the one announcement of a copy result; two
            live regions restating it read every outcome three times. */}
        {clipboardState.error && lastAttemptedTarget === "verdict" ? (
          <div className="mt-4 rounded-md border border-amber-400/40 bg-amber-500/10 p-4 text-xs text-amber-100">
            <p className="text-xs font-semibold text-amber-200">
              Clipboard blocked
            </p>
            <p className="mt-2 text-amber-100/90">
              Select and copy the verdict below to share it manually.
            </p>
            <textarea
              readOnly
              value={shareText}
              rows={8}
              aria-label="Copy-ready Decision Shield verdict"
              className="mt-3 w-full rounded-lg border border-amber-400/30 bg-slate-950/80 p-3 font-mono text-base text-amber-100"
            />
          </div>
        ) : null}

        <div className="space-y-5">
          {/* Mode Switcher */}
          <div className="border-b border-slate-800 pb-3">
            <SegmentedControl
              options={planModeOptions}
              value={planMode}
              onSelect={setPlanMode}
              ariaLabel="How to describe the decision"
            />
          </div>

          {planMode === "natural_language" && (
            <PlanStressTestMode
              planText={planText}
              setPlanText={setPlanText}
              planReady={planReady}
              profile={profile}
              setProfileField={setProfileField}
              businessModel={businessModel}
              setBusinessModel={setBusinessModel}
              stressTestResult={stressTestResult}
            />
          )}

          {planMode === "compare" && (
            <ComparePlansMode
              planText={planText}
              setPlanText={setPlanText}
              planBText={planBText}
              setPlanBText={setPlanBText}
              planReady={planReady}
              comparisonReady={comparisonReady}
              comparisonResult={comparisonResult}
            />
          )}

          {planMode === "dropdown" && (
            <>
              <div className="weather-surface p-4">
                <p className="type-label text-slate-400">
                  Pick a stage, an area, and an action. The verdict below says whether the move is safe this week, what would pause it, and what would reopen it.
                </p>
              </div>
              <Fieldset.Root className="grid min-w-0 gap-4 border-0 p-0 lg:grid-cols-3">
                <Fieldset.Legend className="sr-only">Choose the lifecycle, category, and action for this decision</Fieldset.Legend>
                <LabeledSelectField
                  label="Lifecycle"
                  value={lifecycle}
                  onValueChange={selectLifecycle}
                  options={lifecycleSelectOptions}
                  placeholder="Select lifecycle"
                  triggerClassName="weather-input flex min-h-[44px] w-full items-center justify-between px-3 py-2 text-base transition-colors hover:border-sky-500/70"
                />
                <LabeledSelectField
                  label="Category"
                  value={category}
                  onValueChange={(value) => setField("category", value)}
                  options={categorySelectOptions}
                  placeholder="Select category"
                  triggerClassName="weather-input flex min-h-[44px] w-full items-center justify-between px-3 py-2 text-base transition-colors hover:border-sky-500/70"
                />
                <LabeledSelectField
                  label="Action"
                  value={action}
                  onValueChange={(value) => setField("action", value)}
                  options={actionSelectOptions}
                  placeholder="Select action"
                  triggerClassName="weather-input flex min-h-[44px] w-full items-center justify-between px-3 py-2 text-base transition-colors hover:border-sky-500/70"
                />
              </Fieldset.Root>

              <DecisionShieldPresetsSection
                currentSelection={currentSelection}
                onApplyPreset={applyPresetSelection}
              />

              <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
                <div className="weather-surface p-4">
                  <p className="type-label text-slate-400">Decision verdict</p>
                  <div
                    className={`mt-3 inline-flex items-center rounded-sm border px-3 py-1 text-xs font-semibold ${verdictStyles[output.verdict]}`}
                  >
                    {output.verdict}
                  </div>
                  <p className="mt-3 type-data text-slate-200 break-words">{output.summary}</p>
                  <p className="mt-3 text-xs text-slate-400">
                    A summary you can paste. It says what the reading was, not what will happen.
                  </p>
                </div>
                <div className="weather-surface p-4">
                  <p className="type-label text-slate-400">Why</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {output.bullets.slice(0, 4).map((bullet) => (
                      <li key={bullet} className="flex gap-2">
                        <span className="text-slate-400">•</span>
                        <span className="break-words">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="weather-surface p-4">
                  <p className="type-label text-slate-400">{publicDecisionLabels.threshold}</p>
                  <p className="mt-3 type-data text-slate-300 break-words">{output.guardrail}</p>
                  {/* Printed, not tucked behind a hover glyph a touch screen never shows. */}
                  {hiringPauseApplies(action) ? (
                    <p className="mt-2 text-xs text-slate-400">
                      Pause new hiring, long-term commitments, and major spend increases if this line is crossed.
                    </p>
                  ) : null}
                </div>
                <div className="weather-surface p-4">
                  <p className="type-label text-slate-400">{publicDecisionLabels.reversal}</p>
                  <p className="mt-3 type-data text-slate-300 break-words">
                    {output.reversalTrigger}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* What to do with the verdict, after it: copy it, link to it, or keep it
              on the record against this week's reading. */}
          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] pt-4">
            <ClipboardActionRow
              label="Copy verdict"
              state={getClipboardUiState("verdict", clipboardState)}
              buttonVariant="pill"
              stateIcons={{ copying: <SpinnerIcon className="h-3 w-3" /> }}
              onClick={handleCopy}
            />
            <ClipboardActionRow
              label="Copy link"
              state={getClipboardUiState("link", clipboardState)}
              buttonVariant="pill"
              buttonLabels={{ copied: "Link copied" }}
              onClick={handleCopyLink}
            />
            <RecordDecisionButton buildPayload={buildLedgerPayload} />
          </div>
        </div>
      </div>
    </section>
  );
};
