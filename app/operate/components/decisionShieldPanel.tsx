/**
 * Decision Shield panel for applying the weekly call to a specific operator decision.
 * Keeps verdict output shareable and grounded in sensor-driven signals.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Field } from "@base-ui/react/field";
import { Fieldset } from "@base-ui/react/fieldset";
import { Form } from "@base-ui/react/form";
import { Input } from "@base-ui/react/input";
import { Toast } from "@base-ui/react/toast";
import { LabeledSelectField, type LabeledSelectOption } from "../../components/labeledSelectField";
import { usePathname, useSearchParams } from "next/navigation";
import {
  evaluateDecision,
  formatDecisionAction,
  stressTestDecisionPlan,
  compareDecisionPlans,
  isBusinessModel,
  type DecisionAction,
  type DecisionCategory,
  type DecisionOutput,
  type LifecycleStage,
  type CompanyFinancialProfile,
} from "../../../lib/decisionShield";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import type { DecisionMemoryEntry } from "../../../lib/decisionMemory";
import { publicDecisionLabels } from "../../../lib/report/reportFormatting";
import { ClipboardActionRow } from "../../components/clipboardActionRow";
import { DataProvenanceStrip, type DataProvenance } from "../../components/dataProvenanceStrip";
import {
  getClipboardUiState,
  useClipboardCopy,
  type ClipboardCopyState,
} from "../../components/useClipboardCopy";
import { createOpaqueId, usePersistentClientId } from "../../components/clientIdentity";
import { usePersistedQuerySelections } from "./usePersistedQuerySelections";
import {
  actionOptions,
  buildShareText,
  categoryOptions,
  formatOptionLabel,
  lifecycleOptions,
  parseParam,
  verdictStyles,
} from "./decisionShieldUtils";

const decisionShieldFieldConfigs = {
  lifecycle: {
    queryParam: "lifecycle",
    parse: (value: string | null) => parseParam(value, lifecycleOptions),
    serialize: (value: LifecycleStage) => value,
  },
  category: {
    queryParam: "category",
    parse: (value: string | null) => parseParam(value, categoryOptions),
    serialize: (value: DecisionCategory) => value,
  },
  action: {
    queryParam: "action",
    parse: (value: string | null) => parseParam(value, actionOptions),
    serialize: (value: DecisionAction) => value,
  },
} as const;

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

export const DecisionShieldPanel = ({
  assessment,
  provenance,
}: {
  assessment: RegimeAssessment;
  provenance: DataProvenance;
}) => {
  const {
    state: { lifecycle, category, action },
    setField,
  } = usePersistedQuerySelections({
    initialState: {
      lifecycle: "GROWTH" as LifecycleStage,
      category: "HIRING" as DecisionCategory,
      action: "HIRE" as DecisionAction,
    },
    storageKey: "whether.decisionShield",
    fields: decisionShieldFieldConfigs,
  });
  const [presets, setPresets] = useState<
    Array<{
      id: string;
      name: string;
      lifecycle: LifecycleStage;
      category: DecisionCategory;
      action: DecisionAction;
      createdAt: string;
    }>
  >([]);
  const [presetName, setPresetName] = useState("");
  const [presetError, setPresetError] = useState<string | null>(null);
  const [presetStatus, setPresetStatus] = useState<string | null>(null);
  const [memoryStatus, setMemoryStatus] = useState<string | null>(null);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const legacyPresetStorageKey = "whether.decisionShieldPresets";
  const { add } = Toast.useToastManager();
  const presetInputRef = useRef<HTMLInputElement | null>(null);
  const { status, error, errorReason, activeTarget, copiedTarget, copyToClipboard } = useClipboardCopy();
  const lastClipboardStatusRef = useRef<ClipboardCopyState["status"]>("idle");
  const lastAttemptedTargetRef = useRef<"verdict" | "link" | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const clientId = usePersistentClientId();
  const presetStorageKey = clientId ? `whether.decisionShieldPresets:${clientId}` : null;

  const [planMode, setPlanMode] = useState<"dropdown" | "natural_language" | "compare">("natural_language");
  const [planText, setPlanText] = useState("We want to hire 3 senior full-stack engineers ($540k annual burn) and sign a 2-year cloud reservation.");
  const [planBText, setPlanBText] = useState("We want to hire 2 contractors for 6 months on milestone deliverables and use monthly rolling compute.");
  const [runwayMonths, setRunwayMonths] = useState<number | undefined>(14);
  const [businessModel, setBusinessModel] = useState<"VC_BACKED" | "BOOTSTRAPPED">("VC_BACKED");

  const companyProfile = useMemo<CompanyFinancialProfile>(() => ({
    runwayMonths,
    businessModel,
    grossMarginPct: 75,
  }), [runwayMonths, businessModel]);

  const stressTestResult = useMemo(
    () => stressTestDecisionPlan(assessment, { planText, lifecycle, companyProfile }),
    [assessment, planText, lifecycle, companyProfile]
  );

  const comparisonResult = useMemo(
    () => compareDecisionPlans(assessment, planText, planBText, companyProfile),
    [assessment, planText, planBText, companyProfile]
  );

  const output = useMemo(
    () => evaluateDecision(assessment, { lifecycle, category, action }),
    [assessment, lifecycle, category, action]
  );
  const shareText = useMemo(
    () => buildShareText(assessment, lifecycle, category, action, output),
    [assessment, lifecycle, category, action, output]
  );

  useEffect(() => {
    if (!presetStorageKey) {
      return;
    }
    try {
      const stored = window.localStorage.getItem(presetStorageKey)
        ?? window.localStorage.getItem(legacyPresetStorageKey);
      if (!stored) {
        setPresets([]);
        return;
      }
      const parsed = JSON.parse(stored) as typeof presets;
      if (Array.isArray(parsed)) {
        setPresets(parsed);
      }
    } catch {
      setPresets([]);
      // Intentionally ignore storage restore errors to keep console clean.
    }
  }, [legacyPresetStorageKey, presetStorageKey]);

  useEffect(() => {
    if (!presetStorageKey) {
      return;
    }
    try {
      window.localStorage.setItem(presetStorageKey, JSON.stringify(presets));
    } catch {
      // Intentionally ignore storage persistence errors to keep console clean.
    }
  }, [presetStorageKey, presets]);

  useEffect(() => {
    if (!presetStatus) {
      return;
    }
    const timeout = window.setTimeout(() => setPresetStatus(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [presetStatus]);

  const handlePresetSave = () => {
    if (!presetName.trim()) {
      setPresetError("Name your preset so it can be reused.");
      presetInputRef.current?.focus();
      return;
    }
    const nextPreset = {
      id: createOpaqueId(),
      name: presetName.trim(),
      lifecycle,
      category,
      action,
      createdAt: new Date().toISOString(),
    };
    setPresets((prev) => [nextPreset, ...prev].slice(0, 8));
    setPresetName("");
    setPresetError(null);
    setPresetStatus("Preset saved.");
  };

  const handlePresetApply = (presetId: string) => {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }
    setField("lifecycle", preset.lifecycle);
    setField("category", preset.category);
    setField("action", preset.action);
    setPresetStatus("Preset applied.");
  };

  const handlePresetDelete = (presetId: string) => {
    const presetToDelete = presets.find((p) => p.id === presetId);
    if (!presetToDelete) return;

    if (confirm(`Delete preset "${presetToDelete.name}"? This cannot be undone.`)) {
      setPresets((prev) => prev.filter((item) => item.id !== presetId));
      setPresetStatus(`Preset "${presetToDelete.name}" deleted.`);
    }
  };

  const handlePresetBlur = () => {
    if (!presetName.trim()) {
      setPresetError("Name your preset so it can be reused.");
    } else {
      setPresetError(null);
    }
  };

  const handleCopy = async () => {
    if (status === "copying") {
      return;
    }
    lastAttemptedTargetRef.current = "verdict";
    await copyToClipboard(shareText, "verdict");
  };

  const handleCopyLink = async () => {
    if (status === "copying") {
      return;
    }
    const link = `${window.location.origin}${pathname}?${searchParams.toString()}`;
    lastAttemptedTargetRef.current = "link";
    await copyToClipboard(link, "link");
  };



  const handleSaveToDecisionMemory = () => {
    if (isSavingMemory) {
      return;
    }
    if (!clientId) {
      setMemoryStatus("Preparing your operator profile. Try saving again in a second.");
      return;
    }

    setIsSavingMemory(true);
    setMemoryStatus("Saving to Decision Memory…");

    void fetch("/api/decision-memory", {
      method: "POST",
      headers: { "content-type": "application/json", "x-whether-client-id": clientId },
      body: JSON.stringify({
        clientId,
        recordDate: provenance.recordDateLabel,
        decision: { lifecycle, category, action },
        outcome: {
          verdict: output.verdict,
          summary: output.summary,
          guardrail: output.guardrail,
          reversalTrigger: output.reversalTrigger,
        },
        assessment,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          setMemoryStatus("Failed to save Decision Memory entry.");
          return;
        }

        // Mirror the entry the server actually created. Minting a second id here
        // would make the same save appear twice once the panel merges by id.
        const { entry } = (await response.json()) as { entry?: DecisionMemoryEntry };
        if (entry) {
          try {
            const entryKey = `whether.decisionMemory:${clientId}`;
            const currentLocalRaw = window.localStorage.getItem(entryKey);
            const currentLocal = currentLocalRaw
              ? (JSON.parse(currentLocalRaw) as DecisionMemoryEntry[])
              : [];
            window.localStorage.setItem(
              entryKey,
              JSON.stringify([entry, ...currentLocal].slice(0, 64)),
            );
          } catch (e) {
            console.error("Local storage memory save error:", e);
          }
        }

        window.dispatchEvent(new CustomEvent("whether-decision-memory-updated"));
        setMemoryStatus("Decision Memory entry saved.");
      })
      .catch(() => {
        setMemoryStatus("Failed to save Decision Memory entry.");
      })
      .finally(() => {
        setIsSavingMemory(false);
      });
  };

  useEffect(() => {
    if (status === lastClipboardStatusRef.current) {
      return;
    }
    if (status === "copied") {
      if (copiedTarget === "verdict") {
        add({
          title: "Decision Shield copied",
          description: "The verdict is ready to paste.",
          type: "success",
        });
      }
      if (copiedTarget === "link") {
        add({
          title: "Link copied",
          description: "Share this Decision Shield URL with your team.",
          type: "success",
        });
      }
    }
    if (status === "error") {
      const isBlocked = errorReason === "unavailable";
      const onLink = lastAttemptedTargetRef.current === "link";
      add({
        title: isBlocked ? "Clipboard blocked" : "Copy failed",
        description: onLink
          ? isBlocked
            ? "Copy the URL from your browser address bar."
            : "Clipboard access failed. Try copying the URL manually."
          : isBlocked
            ? "Select the verdict text to share it manually."
            : "Clipboard access failed. Try copying manually.",
        type: "error",
      });
    }
    lastClipboardStatusRef.current = status;
  }, [add, copiedTarget, errorReason, status]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setMemoryStatus(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [memoryStatus]);

  const presetHintId = "preset-limit-hint";

  return (
    <section id="decision-shield" aria-labelledby="decision-shield-title" className="mt-10">
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="type-label text-slate-400">Decision check</p>
            <h3 id="decision-shield-title" className="type-section text-slate-100">
              Is this move safe right now?
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Apply this week&apos;s call to a specific decision, then share the readout with your team.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <ClipboardActionRow
              label="Copy verdict"
              state={getClipboardUiState("verdict", { status, error, activeTarget, copiedTarget })}
              buttonVariant="pill"
              buttonLabels={{
                copying: (
                  <>
                    <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
                    <span>Copying</span>
                  </>
                ),
              }}
              buttonClassName="gap-2"
              onClick={handleCopy}
            />
            <ClipboardActionRow
              label="Copy link"
              state={getClipboardUiState("link", { status, error, activeTarget, copiedTarget })}
              buttonVariant="pill"
              buttonLabels={{ copied: "Link copied" }}
              onClick={handleCopyLink}
            />
            <button
              type="button"
              onClick={handleSaveToDecisionMemory}
              disabled={isSavingMemory || !clientId}
              aria-busy={isSavingMemory}
              className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-400"
            >
              {isSavingMemory ? "Saving" : !clientId ? "Preparing memory" : "Save to memory"}
            </button>
            <DataProvenanceStrip provenance={provenance} />
          </div>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {copiedTarget === "verdict"
            ? "Verdict copied to clipboard."
            : copiedTarget === "link"
              ? "Decision Shield link copied to clipboard."
              : error
                ? "Clipboard unavailable."
                : ""}
        </p>
        <div className="mt-2 min-h-[20px] text-xs text-amber-200" role="status" aria-live="polite">
          {error && lastAttemptedTargetRef.current === "link" ? "Clipboard blocked. Copy the URL from your browser address bar." : ""}
        </div>
        <div className="mt-1 min-h-[20px] text-xs text-slate-300" role="status" aria-live="polite">
          {memoryStatus ?? ""}
        </div>
        <div className="mt-4 min-h-[260px]">
          {error && lastAttemptedTargetRef.current === "verdict" ? (
            <div className="rounded-md border border-amber-400/40 bg-amber-500/10 p-4 text-xs text-amber-100">
              <p className="text-xs font-semibold tracking-[0.12em] text-amber-200">
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
        </div>

        <div className="mt-6 space-y-5">
          {/* Mode Switcher */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <button
              type="button"
              onClick={() => setPlanMode("natural_language")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                planMode === "natural_language"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              ⚡ Stress-Test Freeform Plan
            </button>
            <button
              type="button"
              onClick={() => setPlanMode("compare")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                planMode === "compare"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              ⚖️ Compare Plan A vs Plan B
            </button>
            <button
              type="button"
              onClick={() => setPlanMode("dropdown")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                planMode === "dropdown"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              🎛️ Standard Selectors
            </button>
          </div>

          {planMode === "natural_language" && (
            <div className="weather-surface p-5 border border-sky-500/30 bg-slate-900/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">Plan stress test</h4>
                  <p className="text-fluid-xs text-slate-400">
                    Paste any planned hiring, infra, or contract decision. Tested against live macro tightness &amp; curve slope.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-fluid-xs text-slate-300">
                    <span className="text-slate-400">Runway:</span>
                    <select
                      value={runwayMonths ?? 14}
                      onChange={(e) => setRunwayMonths(Number(e.target.value))}
                      className="bg-slate-800 text-slate-200 rounded px-2 py-1 text-xs border border-slate-700 font-mono"
                    >
                      <option value={6}>6 mos (&lt;12m warning)</option>
                      <option value={10}>10 mos (tight)</option>
                      <option value={14}>14 mos (standard)</option>
                      <option value={18}>18 mos (safe)</option>
                      <option value={24}>24+ mos (buffered)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5 text-fluid-xs text-slate-300">
                    <span className="text-slate-400">Model:</span>
                    <select
                      value={businessModel}
                      onChange={(event) => {
                        if (isBusinessModel(event.target.value)) {
                          setBusinessModel(event.target.value);
                        }
                      }}
                      className="bg-slate-800 text-slate-200 rounded px-2 py-1 text-xs border border-slate-700"
                    >
                      <option value="VC_BACKED">VC-Backed</option>
                      <option value="BOOTSTRAPPED">Bootstrapped</option>
                    </select>
                  </div>
                </div>
              </div>

              <textarea
                value={planText}
                onChange={(e) => setPlanText(e.target.value)}
                rows={3}
                className="weather-input w-full p-3 font-mono text-xs text-slate-100 placeholder-slate-500 rounded-lg border border-slate-700 bg-slate-950/80 focus:border-sky-500 focus:outline-none"
                placeholder="e.g. We want to hire 4 engineers and sign a 2-year cloud commitment with AWS..."
              />

              {/* Stress Test Audit Output */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/90 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-sm ${
                      stressTestResult.verdict === "SAFE"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : stressTestResult.verdict === "RISKY"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    }`}>
                      {stressTestResult.verdict}
                    </span>
                    <span className="text-fluid-xs text-slate-300 font-semibold">
                      Category: {stressTestResult.detectedCategory}
                    </span>
                  </div>
                  {stressTestResult.financialImpactSummary && (
                    <span className="text-fluid-nano text-slate-400 font-mono">
                      {stressTestResult.financialImpactSummary}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <p className="text-fluid-nano text-slate-400 uppercase font-semibold tracking-wider">Fragile Assumptions Identified:</p>
                  <ul className="space-y-1">
                    {stressTestResult.fragileAssumptions.map((assumption, idx) => (
                      <li key={idx} className="text-fluid-xs text-amber-200/90 flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{assumption}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-slate-800 pt-2.5 grid sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-fluid-nano text-slate-400 uppercase font-semibold tracking-wider">Bounded Guardrail:</p>
                    <p className="text-fluid-xs text-slate-200 mt-0.5">{stressTestResult.boundedGuardrail}</p>
                  </div>
                  <div>
                    <p className="text-fluid-nano text-sky-400 uppercase font-semibold tracking-wider">Macro-Safe Staging Compromise:</p>
                    <p className="text-fluid-xs text-sky-200 mt-0.5">{stressTestResult.reversibleAlternative}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {planMode === "compare" && (
            <div className="weather-surface p-5 border border-sky-500/30 bg-slate-900/50 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-100">Compare two plans</h4>
                <p className="text-fluid-xs text-slate-400">
                  Audit two alternative initiatives to determine which path carries lower macro vulnerability.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">Plan A</label>
                  <textarea
                    value={planText}
                    onChange={(e) => setPlanText(e.target.value)}
                    rows={3}
                    className="weather-input w-full p-2.5 font-mono text-xs text-slate-100 rounded-lg border border-slate-700 bg-slate-950/80"
                  />
                  <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-lg">
                    <span className={`px-2 py-0.5 text-fluid-nano font-bold rounded ${
                      comparisonResult.planA.verdict === "SAFE" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                    }`}>
                      Verdict: {comparisonResult.planA.verdict}
                    </span>
                    <p className="text-fluid-xs text-slate-300 mt-1.5">{comparisonResult.planA.reversibleAlternative}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">Plan B</label>
                  <textarea
                    value={planBText}
                    onChange={(e) => setPlanBText(e.target.value)}
                    rows={3}
                    className="weather-input w-full p-2.5 font-mono text-xs text-slate-100 rounded-lg border border-slate-700 bg-slate-950/80"
                  />
                  <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-lg">
                    <span className={`px-2 py-0.5 text-fluid-nano font-bold rounded ${
                      comparisonResult.planB.verdict === "SAFE" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                    }`}>
                      Verdict: {comparisonResult.planB.verdict}
                    </span>
                    <p className="text-fluid-xs text-slate-300 mt-1.5">{comparisonResult.planB.reversibleAlternative}</p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-sky-950/30 border border-sky-500/30 rounded-lg flex items-center justify-between">
                <span className="text-fluid-xs text-sky-300 font-semibold">
                  🏆 Recommendation: {comparisonResult.comparativeRecommendation}
                </span>
              </div>
            </div>
          )}

          {planMode === "dropdown" && (
            <>
              <div className="weather-surface p-4">
                <p className="type-label text-slate-400">
                  Weekly call context → Decision verdict → Why now → {publicDecisionLabels.threshold} → {publicDecisionLabels.reversal}
                </p>
              </div>
              <Fieldset.Root className="grid min-w-0 gap-4 border-0 p-0 lg:grid-cols-3">
                <Fieldset.Legend className="sr-only">Choose the lifecycle, category, and action for this decision</Fieldset.Legend>
                <LabeledSelectField
                  label="Lifecycle"
                  value={lifecycle}
                  onValueChange={(value) => setField("lifecycle", value)}
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
            </>
          )}

          <div className="weather-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="type-label text-slate-400">Saved scenarios</p>
                <p className="mt-2 text-sm text-slate-300">
                  Store common Decision Shield inputs as presets for faster reviews.
                </p>
              </div>
              <p id={presetHintId} className="text-xs text-slate-400">
                Max 8 presets
              </p>
            </div>
            <Form onFormSubmit={handlePresetSave} className="mt-4">
              <Fieldset.Root className="flex min-w-0 flex-wrap items-start gap-3 border-0 p-0">
                <Fieldset.Legend className="sr-only">Save a reusable Decision Shield preset</Fieldset.Legend>
                <Field.Root className="flex w-full flex-col gap-2 text-xs font-semibold tracking-[0.12em] text-slate-400 sm:max-w-xs">
                  <Field.Label nativeLabel={false} render={<span />}>Preset name</Field.Label>
                  <Input
                    ref={presetInputRef}
                    type="text"
                    value={presetName}
                    onChange={(event) => setPresetName(event.target.value)}
                    onBlur={handlePresetBlur}
                    aria-invalid={Boolean(presetError)}
                    aria-describedby={[presetError ? "preset-error" : null, presetHintId]
                      .filter(Boolean)
                      .join(" ")}
                    className="weather-input min-h-[44px] w-full px-3 py-2 text-base transition-colors hover:border-sky-500/70"
                  />
                </Field.Root>
                <button
                  type="submit"
                  className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100"
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
            <p className="sr-only" role="status" aria-live="polite">
              {presetStatus ?? ""}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {presets.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No presets yet. Save one to reuse this scenario in future reviews.
                </p>
              ) : (
                presets.map((preset) => (
                  <div key={preset.id} className="rounded-lg border border-slate-800/60 p-3">
                    <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
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
                        className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-1 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetDelete(preset.id)}
                        className="weather-pill inline-flex min-h-[44px] items-center justify-center border border-rose-400/40 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-rose-200 transition-colors hover:border-rose-300/70 hover:text-rose-100"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
            <div className="weather-surface p-4">
              <p className="type-label text-slate-400">Decision verdict</p>
              <div
                className={`mt-3 inline-flex items-center rounded-sm border px-3 py-1 text-xs font-semibold tracking-[0.12em] ${verdictStyles[output.verdict]}`}
              >
                {output.verdict}
              </div>
              <p className="mt-3 type-data text-slate-200 break-words">{output.summary}</p>
              <p className="mt-3 text-xs text-slate-400">
                Copy-ready board update based on current signals; outcomes remain uncertain.
              </p>
            </div>
            <div className="weather-surface p-4">
              <p className="type-label text-slate-400">Why (signals)</p>
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
              <div className="flex items-center gap-2">
                <p className="type-label text-slate-400">{publicDecisionLabels.threshold}</p>
                <span title="Pause new hiring, long-term commitments, and major spend increases if this threshold is crossed." className="text-slate-400 cursor-help text-sm">ⓘ</span>
              </div>
              <p className="mt-3 type-data text-slate-300 break-words">{output.guardrail}</p>
            </div>
            <div className="weather-surface p-4">
              <p className="type-label text-slate-400">{publicDecisionLabels.reversal}</p>
              <p className="mt-3 type-data text-slate-300 break-words">
                {output.reversalTrigger}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
