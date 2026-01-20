/**
 * Decision Shield panel for validating operator actions against the current market climate.
 * Keeps verdict output shareable and grounded in sensor-driven signals.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  evaluateDecision,
  formatDecisionAction,
  type DecisionAction,
  type DecisionCategory,
  type DecisionOutput,
  type LifecycleStage,
} from "../../lib/decisionShield";
import type { RegimeAssessment } from "../../lib/regimeEngine";
import { DataProvenanceStrip, type DataProvenance } from "./dataProvenanceStrip";

const lifecycleOptions: { value: LifecycleStage; label: string }[] = [
  { value: "DISCOVERY", label: "Discovery" },
  { value: "GROWTH", label: "Growth" },
  { value: "SCALE", label: "Scale" },
  { value: "MATURE", label: "Mature" },
];

const categoryOptions: { value: DecisionCategory; label: string }[] = [
  { value: "HIRING", label: "Hiring" },
  { value: "ROADMAP", label: "Roadmap" },
  { value: "PRICING", label: "Pricing" },
  { value: "INFRASTRUCTURE", label: "Infrastructure" },
  { value: "M_AND_A", label: "M&A" },
  { value: "GEOGRAPHIC_EXPANSION", label: "Geographic expansion" },
  { value: "RESTRUCTURING", label: "Restructuring" },
];

const actionOptions: { value: DecisionAction; label: string }[] = [
  { value: "HIRE", label: "Hire" },
  { value: "REWRITE", label: "Rewrite" },
  { value: "LAUNCH", label: "Launch" },
  { value: "DISCOUNT", label: "Discount" },
  { value: "EXPAND", label: "Expand" },
  { value: "ACQUIRE", label: "Acquire" },
  { value: "DIVEST", label: "Divest" },
  { value: "INFRA_SPEND", label: "Infra spend" },
  { value: "REGIONAL_EXPANSION", label: "Regional expansion" },
  { value: "RESTRUCTURE", label: "Restructure" },
];

const verdictStyles: Record<DecisionOutput["verdict"], string> = {
  SAFE: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  RISKY: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  DANGEROUS: "border-rose-400/40 bg-rose-500/10 text-rose-200",
};

const formatOptionLabel = <T extends string>(
  value: T,
  options: { value: T; label: string }[]
) => options.find((option) => option.value === value)?.label ?? value;

const buildShareText = (
  assessment: RegimeAssessment,
  lifecycle: LifecycleStage,
  category: DecisionCategory,
  action: DecisionAction,
  output: DecisionOutput
) => {
  const lines = [
    "Decision Shield — Whether Report",
    `Market climate: ${assessment.regime}`,
    `Lifecycle: ${formatOptionLabel(lifecycle, lifecycleOptions)}`,
    `Category: ${formatOptionLabel(category, categoryOptions)}`,
    `Action: ${formatDecisionAction(action)}`,
    `Verdict: ${output.verdict}`,
    "",
    `Summary: ${output.summary}`,
    "",
    "Signals:",
    ...output.bullets.map((bullet) => `- ${bullet}`),
    "",
    `Guardrail: ${output.guardrail}`,
    `Reversal trigger: ${output.reversalTrigger}`,
  ];

  return lines.join("\n");
};

const parseParam = <T extends string>(
  value: string | null,
  options: { value: T; label: string }[]
): T | null => options.find((option) => option.value === value)?.value ?? null;

export const DecisionShieldPanel = ({
  assessment,
  provenance,
}: {
  assessment: RegimeAssessment;
  provenance: DataProvenance;
}) => {
  const [lifecycle, setLifecycle] = useState<LifecycleStage>("GROWTH");
  const [category, setCategory] = useState<DecisionCategory>("HIRING");
  const [action, setAction] = useState<DecisionAction>("HIRE");
  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkCopyError, setLinkCopyError] = useState(false);
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
  const storageKey = "whether.decisionShield";
  const presetStorageKey = "whether.decisionShieldPresets";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const restoredFromStorage = useRef(false);
  const presetInputRef = useRef<HTMLInputElement | null>(null);

  const urlLifecycle = useMemo(
    () => parseParam(searchParams.get("lifecycle"), lifecycleOptions),
    [searchParams]
  );
  const urlCategory = useMemo(
    () => parseParam(searchParams.get("category"), categoryOptions),
    [searchParams]
  );
  const urlAction = useMemo(
    () => parseParam(searchParams.get("action"), actionOptions),
    [searchParams]
  );
  const hasAnyUrlSelection =
    searchParams.has("lifecycle") ||
    searchParams.has("category") ||
    searchParams.has("action");
  const hasValidUrlSelection = Boolean(urlLifecycle || urlCategory || urlAction);

  const output = useMemo(
    () => evaluateDecision(assessment, { lifecycle, category, action }),
    [assessment, lifecycle, category, action]
  );
  const shareText = useMemo(
    () => buildShareText(assessment, lifecycle, category, action, output),
    [assessment, lifecycle, category, action, output]
  );

  useEffect(() => {
    if (hasValidUrlSelection) {
      if (urlLifecycle && urlLifecycle !== lifecycle) {
        setLifecycle(urlLifecycle);
      }
      if (urlCategory && urlCategory !== category) {
        setCategory(urlCategory);
      }
      if (urlAction && urlAction !== action) {
        setAction(urlAction);
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
        lifecycle?: string;
        category?: string;
        action?: string;
      };
      const storedLifecycle = parseParam(parsed.lifecycle ?? null, lifecycleOptions);
      const storedCategory = parseParam(parsed.category ?? null, categoryOptions);
      const storedAction = parseParam(parsed.action ?? null, actionOptions);
      if (storedLifecycle) {
        setLifecycle(storedLifecycle);
      }
      if (storedCategory) {
        setCategory(storedCategory);
      }
      if (storedAction) {
        setAction(storedAction);
      }
    } catch {
      // Intentionally ignore storage restore errors to keep console clean.
    }
  }, [
    action,
    category,
    hasAnyUrlSelection,
    hasValidUrlSelection,
    lifecycle,
    storageKey,
    urlAction,
    urlCategory,
    urlLifecycle,
  ]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(presetStorageKey);
      if (!stored) {
        return;
      }
      const parsed = JSON.parse(stored) as typeof presets;
      if (Array.isArray(parsed)) {
        setPresets(parsed);
      }
    } catch {
      // Intentionally ignore storage restore errors to keep console clean.
    }
  }, [presetStorageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ lifecycle, category, action })
      );
    } catch {
      // Intentionally ignore storage persistence errors to keep console clean.
    }
  }, [action, category, lifecycle, storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(presetStorageKey, JSON.stringify(presets));
    } catch {
      // Intentionally ignore storage persistence errors to keep console clean.
    }
  }, [presetStorageKey, presets]);

  useEffect(() => {
    const currentLifecycle = searchParams.get("lifecycle");
    const currentCategory = searchParams.get("category");
    const currentAction = searchParams.get("action");
    if (
      currentLifecycle === lifecycle &&
      currentCategory === category &&
      currentAction === action
    ) {
      return;
    }
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("lifecycle", lifecycle);
    nextParams.set("category", category);
    nextParams.set("action", action);
    router.push(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }, [action, category, lifecycle, pathname, router, searchParams]);

  useEffect(() => {
    setCopyError(false);
    setLinkCopyError(false);
    setLinkCopied(false);
  }, [lifecycle, category, action]);

  useEffect(() => {
    if (!presetStatus) {
      return;
    }
    const timeout = window.setTimeout(() => setPresetStatus(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [presetStatus]);

  const resolvePresetId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const handlePresetSave = () => {
    if (!presetName.trim()) {
      setPresetError("Name your preset so it can be reused.");
      presetInputRef.current?.focus();
      return;
    }
    const nextPreset = {
      id: resolvePresetId(),
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
    setLifecycle(preset.lifecycle);
    setCategory(preset.category);
    setAction(preset.action);
    setPresetStatus("Preset applied.");
  };

  const handlePresetDelete = (presetId: string) => {
    setPresets((prev) => prev.filter((item) => item.id !== presetId));
    setPresetStatus("Preset removed.");
  };

  const handlePresetBlur = () => {
    if (!presetName.trim()) {
      setPresetError("Name your preset so it can be reused.");
    } else {
      setPresetError(null);
    }
  };

  const handleCopy = async () => {
    if (isCopying) {
      return;
    }
    if (!navigator.clipboard?.writeText) {
      setCopyError(true);
      setCopied(false);
      return;
    }
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyError(true);
    } finally {
      setIsCopying(false);
    }
  };

  const handleCopyLink = async () => {
    if (isCopying) {
      return;
    }
    if (!navigator.clipboard?.writeText) {
      setLinkCopyError(true);
      setLinkCopied(false);
      return;
    }
    setIsCopying(true);
    try {
      const link = `${window.location.origin}${pathname}?${searchParams.toString()}`;
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setLinkCopyError(false);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setLinkCopied(false);
      setLinkCopyError(true);
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <section id="decision-shield" aria-labelledby="decision-shield-title" className="mt-10">
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="type-label text-slate-400">Decision Shield</p>
            <h3 id="decision-shield-title" className="type-section text-slate-100">
              Validate an action
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Pressure-test the next move against current market climate physics, then share the verdict.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <button
              type="button"
              onClick={handleCopy}
              disabled={isCopying}
              aria-busy={isCopying}
              className="weather-pill inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
            >
              {isCopying ? (
                <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
              ) : null}
              {copied ? "Copied" : isCopying ? "Copying" : "Copy verdict"}
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={isCopying}
              aria-busy={isCopying}
              className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
            >
              {linkCopied ? "Link copied" : isCopying ? "Copying" : "Copy link"}
            </button>
            <DataProvenanceStrip provenance={provenance} />
          </div>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {copied
            ? "Verdict copied to clipboard."
            : linkCopied
              ? "Decision Shield link copied to clipboard."
              : copyError || linkCopyError
                ? "Clipboard blocked."
                : ""}
        </p>
        <div className="mt-2 min-h-[20px] text-xs text-amber-200" role="status" aria-live="polite">
          {linkCopyError ? "Clipboard blocked. Copy the URL from your browser address bar." : ""}
        </div>
        <div className="mt-4 min-h-[260px]">
          {copyError ? (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-xs text-amber-100">
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200">
                Clipboard blocked
              </p>
              <p className="mt-2 text-amber-100/90">
                Select and copy the verdict below to share it manually.
              </p>
              <textarea
                readOnly
                value={shareText}
                rows={8}
                className="mt-3 w-full rounded-lg border border-amber-400/30 bg-slate-950/80 p-3 font-mono text-base text-amber-100 touch-manipulation"
              />
            </div>
          ) : null}
        </div>

        <div className="mt-6 space-y-4">
          <div className="weather-surface p-4">
            <p className="type-label text-slate-400">
              Inputs → Verdict → Why → Guardrail → Reversal trigger
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <label
                htmlFor="decision-lifecycle"
                className="type-label text-slate-400"
              >
                Lifecycle
              </label>
              <select
                id="decision-lifecycle"
                value={lifecycle}
                onChange={(event) => setLifecycle(event.target.value as LifecycleStage)}
                className="weather-input min-h-[44px] w-full px-3 py-2 text-base transition-colors hover:border-sky-500/70 touch-manipulation"
              >
                {lifecycleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="decision-category"
                className="type-label text-slate-400"
              >
                Category
              </label>
              <select
                id="decision-category"
                value={category}
                onChange={(event) => setCategory(event.target.value as DecisionCategory)}
                className="weather-input min-h-[44px] w-full px-3 py-2 text-base transition-colors hover:border-sky-500/70 touch-manipulation"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="decision-action"
                className="type-label text-slate-400"
              >
                Action
              </label>
              <select
                id="decision-action"
                value={action}
                onChange={(event) => setAction(event.target.value as DecisionAction)}
                className="weather-input min-h-[44px] w-full px-3 py-2 text-base transition-colors hover:border-sky-500/70 touch-manipulation"
              >
                {actionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="weather-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="type-label text-slate-400">Saved scenarios</p>
                <p className="mt-2 text-sm text-slate-300">
                  Store common Decision Shield inputs as presets for faster reviews.
                </p>
              </div>
              <p className="text-xs text-slate-500">Max 8 presets</p>
            </div>
            <div className="mt-4 flex flex-wrap items-start gap-3">
              <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                Preset name
                <input
                  ref={presetInputRef}
                  type="text"
                  value={presetName}
                  onChange={(event) => setPresetName(event.target.value)}
                  onBlur={handlePresetBlur}
                  aria-invalid={Boolean(presetError)}
                  aria-describedby={presetError ? "preset-error" : undefined}
                  className="weather-input min-h-[44px] w-full px-3 py-2 text-base transition-colors hover:border-sky-500/70 touch-manipulation"
                />
              </label>
              <button
                type="button"
                onClick={handlePresetSave}
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs uppercase tracking-[0.2em] transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
              >
                Save preset
              </button>
            </div>
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
                <p className="text-sm text-slate-500">
                  No presets yet. Save one to reuse this scenario in future reviews.
                </p>
              ) : (
                presets.map((preset) => (
                  <div key={preset.id} className="rounded-lg border border-slate-800/60 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
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
                        className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetDelete(preset.id)}
                        className="weather-pill inline-flex min-h-[44px] items-center justify-center border border-rose-400/40 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-rose-200 transition-colors hover:border-rose-300/70 hover:text-rose-100 touch-manipulation"
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
              <p className="type-label text-slate-400">Verdict</p>
              <div
                className={`mt-3 inline-flex items-center rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${verdictStyles[output.verdict]}`}
              >
                {output.verdict}
              </div>
              <p className="mt-3 type-data text-slate-200 break-words">{output.summary}</p>
              <p className="mt-3 text-xs text-slate-500">Copy-ready, shareable verdict.</p>
            </div>
            <div className="weather-surface p-4">
              <p className="type-label text-slate-400">Why (signals)</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {output.bullets.slice(0, 4).map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="text-slate-500">•</span>
                    <span className="break-words">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="weather-surface p-4">
              <p className="type-label text-slate-400">Guardrail</p>
              <p className="mt-3 type-data text-slate-300 break-words">{output.guardrail}</p>
            </div>
            <div className="weather-surface p-4">
              <p className="type-label text-slate-400">Reversal trigger</p>
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
