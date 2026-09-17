/**
 * Thresholds panel to tune capital posture classification and log overrides.
 * Keeps URL-driven state and audit trail visible for operators.
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Fieldset } from "@base-ui/react/fieldset";
import { Form } from "@base-ui/react/form";
import { Collapsible } from "@base-ui/react/collapsible";
import { Popover } from "@base-ui/react/popover";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toRoute, type Route } from "../../../lib/navigation/routeType";
import type { RegimeThresholds } from "../../../lib/regimeEngine";
import { DEFAULT_THRESHOLDS } from "../../../lib/regimeEngine";
import { buildThresholdSearchParams, THRESHOLD_PARAM_KEYS } from "../../../lib/thresholds";
import { DataProvenanceStrip, type DataProvenance } from "../../components/dataProvenanceStrip";
import { SectionPanelHeader } from "../../components/sectionPanelHeader";
import { createBrowserSource, useBrowserSource } from "../../components/browserSource";
import { ThresholdNumberField } from "./ThresholdNumberField";

type ThresholdDraft = {
  baseRateTightness: string;
  tightnessRegime: string;
  riskAppetiteRegime: string;
};

type ThresholdErrorMap = Partial<Record<keyof ThresholdDraft, string>>;

type ThresholdAuditEntry = {
  timestamp: string;
  previous: RegimeThresholds;
  next: RegimeThresholds;
  source: "manual" | "reset" | "preset";
};

const formatNumber = (value: number) => Number(value.toFixed(2));

const buildDraft = (thresholds: RegimeThresholds): ThresholdDraft => ({
  baseRateTightness: thresholds.baseRateTightness.toString(),
  tightnessRegime: thresholds.tightnessRegime.toString(),
  riskAppetiteRegime: thresholds.riskAppetiteRegime.toString(),
});

const parseDraft = (draft: ThresholdDraft) => {
  const baseRate = Number(draft.baseRateTightness);
  const tightness = Number(draft.tightnessRegime);
  const risk = Number(draft.riskAppetiteRegime);
  return { baseRate, tightness, risk };
};

const validateDraft = (draft: ThresholdDraft): ThresholdErrorMap => {
  const errors: ThresholdErrorMap = {};
  const { baseRate, tightness, risk } = parseDraft(draft);

  if (Number.isNaN(baseRate) || baseRate < 0 || baseRate > 10) {
    errors.baseRateTightness = "Base rate threshold must be between 0 and 10.";
  }
  if (Number.isNaN(tightness) || tightness < 0 || tightness > 100) {
    errors.tightnessRegime = "Funding-pressure threshold must be between 0 and 100.";
  }
  if (Number.isNaN(risk) || risk < 0 || risk > 100) {
    errors.riskAppetiteRegime = "Risk appetite threshold must be between 0 and 100.";
  }

  return errors;
};

const STORAGE_KEY = "whether.thresholdDraft";
const AUDIT_KEY = "whether.thresholdAudit";

const isThresholdDraft = (value: unknown): value is ThresholdDraft => {
  if (typeof value !== "object" || value === null) return false;
  const candidate: Record<string, unknown> = { ...value };
  return (
    typeof candidate.baseRateTightness === "string"
    && typeof candidate.tightnessRegime === "string"
    && typeof candidate.riskAppetiteRegime === "string"
  );
};

const isAuditEntry = (value: unknown): value is ThresholdAuditEntry => {
  if (typeof value !== "object" || value === null) return false;
  const candidate: Record<string, unknown> = { ...value };
  return typeof candidate.timestamp === "string" && typeof candidate.source === "string";
};

/* Both slots read through a store rather than assigned into state from a mount
   effect. Checked rather than cast on the way in: each is whatever an older
   build of this panel wrote, and a draft with a missing field renders an
   uncontrolled input while an audit entry without a timestamp renders "Invalid
   Date" into the trail the panel exists to keep. */
const storedDraftSource = createBrowserSource<ThresholdDraft | null>({
  read: () => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      const parsed: unknown = JSON.parse(stored);
      return isThresholdDraft(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },
  serverValue: null,
});

const NO_AUDIT: ThresholdAuditEntry[] = [];

const storedAuditSource = createBrowserSource<ThresholdAuditEntry[]>({
  read: () => {
    try {
      const stored = window.localStorage.getItem(AUDIT_KEY);
      if (!stored) return NO_AUDIT;
      const parsed: unknown = JSON.parse(stored);
      if (!Array.isArray(parsed)) return NO_AUDIT;
      const entries = parsed.filter(isAuditEntry);
      return entries.length > 0 ? entries : NO_AUDIT;
    } catch {
      return NO_AUDIT;
    }
  },
  serverValue: NO_AUDIT,
});

const buildThresholds = (draft: ThresholdDraft): RegimeThresholds => {
  const { baseRate, tightness, risk } = parseDraft(draft);
  return {
    baseRateTightness: formatNumber(baseRate),
    tightnessRegime: formatNumber(tightness),
    riskAppetiteRegime: formatNumber(risk),
  };
};

export const ThresholdsPanel = ({
  currentThresholds,
  provenance,
}: {
  currentThresholds: RegimeThresholds;
  provenance: DataProvenance;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [errors, setErrors] = useState<ThresholdErrorMap>({});
  // Null until the panel appends one; the stored trail is the default.
  const [appendedAudit, setAppendedAudit] = useState<ThresholdAuditEntry[] | null>(null);
  const storedAudit = useBrowserSource(storedAuditSource);
  const auditLog = appendedAudit ?? storedAudit;
  const storedDraft = useBrowserSource(storedDraftSource);
  const [isPending, startTransition] = useTransition();
  const baseRateRef = useRef<HTMLInputElement | null>(null);
  const tightnessRef = useRef<HTMLInputElement | null>(null);
  const riskRef = useRef<HTMLInputElement | null>(null);
  const errorIds = {
    baseRateTightness: "threshold-base-rate-error",
    tightnessRegime: "threshold-tightness-error",
    riskAppetiteRegime: "threshold-risk-error",
  };
  const appliedDefaults = DEFAULT_THRESHOLDS;
  const thresholdPresets = [
    {
      id: "balanced",
      label: "Standard",
      detail: "Default guardrails aligned with baseline regime behavior.",
      thresholds: appliedDefaults,
    },
    {
      id: "early-alert",
      label: "Sooner warnings",
      detail: "Trip earlier so teams react sooner to tightening conditions.",
      thresholds: {
        baseRateTightness: 4.5,
        tightnessRegime: 48,
        riskAppetiteRegime: 52,
      },
    },
    {
      id: "strict",
      label: "Harder to flip",
      detail: "Require stronger moves before the posture label flips.",
      thresholds: {
        baseRateTightness: 6,
        tightnessRegime: 56,
        riskAppetiteRegime: 44,
      },
    },
  ] as const;

  /*
   * Where the form's values come from, in order: what the reader has typed
   * since the URL last moved, then the draft this browser saved if the URL
   * names no thresholds, then the thresholds themselves.
   *
   * All three used to arrive as `setDraft` from an effect — one watching the
   * prop, one reading storage — so the panel rendered the old values first and
   * corrected them on a second pass. Edits are stamped with the baseline they
   * were made against instead, which is what makes "the URL moved, so the form
   * follows it" a fact about this render rather than a later assignment.
   */
  const hasUrlThresholds =
    searchParams.has(THRESHOLD_PARAM_KEYS.baseRate) ||
    searchParams.has(THRESHOLD_PARAM_KEYS.tightness) ||
    searchParams.has(THRESHOLD_PARAM_KEYS.risk);
  const baselineDraft = !hasUrlThresholds && storedDraft ? storedDraft : buildDraft(currentThresholds);
  const baselineKey = JSON.stringify(baselineDraft);
  const [editedDraft, setEditedDraft] = useState<{ baseline: string; value: ThresholdDraft } | null>(null);
  const draft = editedDraft?.baseline === baselineKey ? editedDraft.value : baselineDraft;
  const setDraft = useCallback(
    (value: ThresholdDraft) => setEditedDraft({ baseline: baselineKey, value }),
    [baselineKey],
  );

  /* Restoring the saved draft is a navigation, not a state assignment: the URL
     is where these thresholds live, so putting them back there is what makes the
     rest of the page agree with the form. Once, and only while the URL names
     none — a draft that fails validation is shown but not published. */
  const restoredFromStorage = useRef(false);
  useEffect(() => {
    if (restoredFromStorage.current || hasUrlThresholds || !storedDraft) return;
    if (Object.keys(validateDraft(storedDraft)).length > 0) return;
    restoredFromStorage.current = true;
    const nextParams = new URLSearchParams(searchParams.toString());
    buildThresholdSearchParams(buildThresholds(storedDraft), appliedDefaults, nextParams);
    router.replace(toRoute(`${pathname}?${nextParams.toString()}`), { scroll: false });
  }, [appliedDefaults, hasUrlThresholds, pathname, router, searchParams, storedDraft]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  const formattedCurrent = useMemo(() => buildDraft(currentThresholds), [currentThresholds]);

  const updateUrl = (nextThresholds: RegimeThresholds, source: ThresholdAuditEntry["source"]) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    buildThresholdSearchParams(nextThresholds, appliedDefaults, nextParams);
    router.push(`${pathname}?${nextParams.toString()}` as Route, { scroll: false });
    const entry: ThresholdAuditEntry = {
      timestamp: new Date().toISOString(),
      previous: currentThresholds,
      next: nextThresholds,
      source,
    };
    const nextAudit = [entry, ...auditLog].slice(0, 8);
    setAppendedAudit(nextAudit);
    window.localStorage.setItem(AUDIT_KEY, JSON.stringify(nextAudit));
  };

  const focusFirstInvalid = (nextErrors: ThresholdErrorMap) => {
    if (nextErrors.baseRateTightness) {
      baseRateRef.current?.focus();
      return;
    }
    if (nextErrors.tightnessRegime) {
      tightnessRef.current?.focus();
      return;
    }
    if (nextErrors.riskAppetiteRegime) {
      riskRef.current?.focus();
    }
  };

  const handleSubmit = () => {
    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalid(nextErrors);
      return;
    }
    startTransition(() => {
      updateUrl(buildThresholds(draft), "manual");
    });
  };

  const handleReset = () => {
    if (!confirm("Reset all thresholds to defaults? Your custom watch-line settings will be replaced.")) {
      return;
    }
    const defaultDraft = buildDraft(appliedDefaults);
    setDraft(defaultDraft);
    setErrors({});
    startTransition(() => {
      updateUrl(appliedDefaults, "reset");
    });
  };

  const handlePresetApply = (presetThresholds: RegimeThresholds) => {
    const nextDraft = buildDraft(presetThresholds);
    setDraft(nextDraft);
    setErrors({});
    startTransition(() => {
      updateUrl(presetThresholds, "preset");
    });
  };

  const updateDraft = (key: keyof ThresholdDraft, value: string) => {
    setDraft({ ...draft, [key]: value });
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleBlur = (key: keyof ThresholdDraft) => {
    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);
    if (nextErrors[key]) {
      focusFirstInvalid(nextErrors);
    }
  };

  return (
    <section id="thresholds" aria-labelledby="thresholds-title" className="mt-10">
      <div className="weather-panel p-6">
        <SectionPanelHeader
          label="Watch-line settings"
          title="Adjust when the regime label changes"
          titleId="thresholds-title"
          description="These values decide when the regime label changes. They stay in the URL so shared links match."
          aside={
            <span className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-fluid-xs font-semibold tracking-[0.1em] text-slate-200">
              Defaults: {appliedDefaults.baseRateTightness}% ·{" "}
              {appliedDefaults.tightnessRegime}/{appliedDefaults.riskAppetiteRegime}
            </span>
          }
        />

        <div className="mt-6 space-y-4">
          <div className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Quick presets</p>
            <p className="mt-2 text-sm text-slate-300">
              Start with one preset, then expand the detailed controls only if you need custom watch lines.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {thresholdPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetApply(preset.thresholds)}
                  disabled={isPending}
                  aria-busy={isPending}
                  className="weather-button inline-flex min-h-[44px] w-full flex-col items-start justify-center gap-1 px-4 py-3 text-left text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-400"
                >
                  <span className="text-slate-100">{preset.label}</span>
                  <span className="text-fluid-xs font-medium tracking-[0.08em] text-slate-400">
                    {preset.detail}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Collapsible.Root>
            <Collapsible.Trigger
              type="button"
              className="weather-button inline-flex min-h-[44px] items-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.14em] text-slate-300 transition-colors hover:border-sky-300/70 hover:text-slate-100"
            >
              Edit exact numbers
              <span className="text-fluid-micro text-slate-400">Show / hide</span>
            </Collapsible.Trigger>
            <Collapsible.Panel className="pt-4">
              <Form onFormSubmit={handleSubmit} className="grid gap-4">
                <Fieldset.Root className="grid min-w-0 gap-4 border-0 p-0 lg:grid-cols-[1fr,1fr,1fr,auto]">
                  <Fieldset.Legend className="sr-only">Set threshold guardrails</Fieldset.Legend>
                  <ThresholdNumberField
                    id="threshold-base-rate"
                    name={THRESHOLD_PARAM_KEYS.baseRate}
                    label="Base-rate watch line (%)"
                    min={0}
                    max={10}
                    step={0.01}
                    value={draft.baseRateTightness}
                    onValueChange={(value) => updateDraft("baseRateTightness", value)}
                    onBlur={() => handleBlur("baseRateTightness")}
                    inputMode="decimal"
                    inputRef={baseRateRef}
                    error={errors.baseRateTightness}
                    errorId={errorIds.baseRateTightness}
                  />
                  <ThresholdNumberField
                    id="threshold-tightness"
                    name={THRESHOLD_PARAM_KEYS.tightness}
                    label="Funding-pressure score line"
                    min={0}
                    max={100}
                    step={0.01}
                    value={draft.tightnessRegime}
                    onValueChange={(value) => updateDraft("tightnessRegime", value)}
                    onBlur={() => handleBlur("tightnessRegime")}
                    inputMode="numeric"
                    inputRef={tightnessRef}
                    error={errors.tightnessRegime}
                    errorId={errorIds.tightnessRegime}
                  />
                  <ThresholdNumberField
                    id="threshold-risk"
                    name={THRESHOLD_PARAM_KEYS.risk}
                    label="Risk-appetite score line"
                    min={0}
                    max={100}
                    step={0.01}
                    value={draft.riskAppetiteRegime}
                    onValueChange={(value) => updateDraft("riskAppetiteRegime", value)}
                    onBlur={() => handleBlur("riskAppetiteRegime")}
                    inputMode="numeric"
                    inputRef={riskRef}
                    error={errors.riskAppetiteRegime}
                    errorId={errorIds.riskAppetiteRegime}
                  />
                  <div className="flex items-end gap-3">
                    <button
                      type="submit"
                      disabled={isPending}
                      aria-busy={isPending}
                      className="weather-button inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-400"
                    >
                      {isPending ? (
                        <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
                      ) : null}
                      {isPending ? "Applying" : "Apply watch lines"}
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={isPending}
                      aria-busy={isPending}
                      className="weather-button inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-400 transition-colors hover:border-sky-300/70 hover:text-slate-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-400"
                    >
                      {isPending ? (
                        <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
                      ) : null}
                      {isPending ? "Resetting" : "Reset"}
                    </button>
                  </div>
                </Fieldset.Root>
              </Form>
            </Collapsible.Panel>
          </Collapsible.Root>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr,1fr]">
          <div className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Applied thresholds</p>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <p>
                Base rate threshold:{" "}
                <span className="mono text-slate-100">{formattedCurrent.baseRateTightness}%</span>
              </p>
              <p>
                Funding-pressure threshold:{" "}
                <span className="mono text-slate-100">{formattedCurrent.tightnessRegime}</span>
              </p>
              <p>
                Risk appetite threshold:{" "}
                <span className="mono text-slate-100">{formattedCurrent.riskAppetiteRegime}</span>
              </p>
            </div>
          </div>
          <div className="weather-surface p-4">
            <Collapsible.Root>
              <Collapsible.Trigger
                type="button"
                className="min-h-[44px] text-xs font-semibold tracking-[0.12em] text-slate-400 transition-colors hover:text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
              >
                How this works
              </Collapsible.Trigger>
              <Collapsible.Panel className="mt-3 space-y-4">
                <Popover.Root>
                  <Popover.Trigger
                    type="button"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-sm border border-slate-800/70 px-4 py-2 text-fluid-micro font-semibold tracking-[0.18em] text-slate-300 transition-colors hover:border-sky-400/70 hover:text-slate-100"
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-slate-700/70 text-[9px] text-slate-400">
                      ?
                    </span>
                    How the watch lines work
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Positioner side="bottom" align="start" sideOffset={12}>
                      <Popover.Popup className="w-72 rounded-lg border border-slate-800/80 bg-slate-950/95 p-4 text-xs text-slate-300 shadow-xl">
                        <Popover.Title className="text-xs font-semibold tracking-[0.14em] text-slate-100">
                          How these thresholds work
                        </Popover.Title>
                        <Popover.Description className="mt-2 text-xs text-slate-400">
                          Thresholds define when a score flips the posture label. Adjust them to
                          reflect your risk tolerance, then share the URL for audit-ready review.
                        </Popover.Description>
                        <ul className="mt-3 space-y-2 text-xs text-slate-300">
                          <li className="flex gap-2">
                            <span className="text-slate-400">•</span>
                            <span>Lower numbers mean earlier alerts and stricter guardrails.</span>
                          </li>
                          <li className="flex gap-2">
                            <span className="text-slate-400">•</span>
                            <span>Higher numbers delay changes until signals are extreme.</span>
                          </li>
                        </ul>
                        <Popover.Close className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-sm border border-slate-800/70 px-3 py-2 text-fluid-micro font-semibold tracking-[0.18em] text-slate-300 transition-colors hover:border-sky-400/70 hover:text-slate-100">
                          Close
                        </Popover.Close>
                        <Popover.Arrow className="h-3 w-3 translate-y-[1px] rotate-45 rounded-[3px] bg-slate-950/95" />
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
                <DataProvenanceStrip provenance={provenance} />
              </Collapsible.Panel>
            </Collapsible.Root>
          </div>
          <div className="weather-surface p-4">
            <Collapsible.Root defaultOpen>
              <Collapsible.Trigger
                type="button"
                className="min-h-[44px] text-xs font-semibold tracking-[0.12em] text-slate-400 transition-colors hover:text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
              >
                Audit trail (recent overrides)
              </Collapsible.Trigger>
              <Collapsible.Panel className="mt-3">
                {auditLog.length ? (
                  <ul className="space-y-3 text-xs text-slate-400">
                    {auditLog.map((entry) => (
                      <li key={`${entry.timestamp}-${entry.source}`}>
                        <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                          {entry.source === "reset" ? "Reset" : entry.source === "preset" ? "Preset" : "Override"} ·{" "}
                          {new Date(entry.timestamp).toLocaleString("en-US", {
                            timeStyle: "short",
                            dateStyle: "medium",
                          })}
                        </p>
                        <p className="mt-1 text-slate-300">
                          {entry.previous.baseRateTightness}% → {entry.next.baseRateTightness}% ·{" "}
                          {entry.previous.tightnessRegime}/{entry.previous.riskAppetiteRegime} →{" "}
                          {entry.next.tightnessRegime}/{entry.next.riskAppetiteRegime}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400">
                    No overrides logged yet. Defaults are active.
                  </p>
                )}
              </Collapsible.Panel>
            </Collapsible.Root>
          </div>
        </div>
      </div>
    </section>
  );
};
