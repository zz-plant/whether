/**
 * Thresholds panel to tune market climate classification and log overrides.
 * Keeps URL-driven state and audit trail visible for operators.
 */
"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Field } from "@base-ui/react/field";
import { NumberField } from "@base-ui/react/number-field";
import { Collapsible } from "@base-ui/react/collapsible";
import { Popover } from "@base-ui/react/popover";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RegimeThresholds } from "../../lib/regimeEngine";
import { DEFAULT_THRESHOLDS } from "../../lib/regimeEngine";
import { buildThresholdSearchParams, THRESHOLD_PARAM_KEYS } from "../../lib/thresholds";
import { DataProvenanceStrip, type DataProvenance } from "./dataProvenanceStrip";

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
  source: "manual" | "reset";
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
    errors.tightnessRegime = "Tightness threshold must be between 0 and 100.";
  }
  if (Number.isNaN(risk) || risk < 0 || risk > 100) {
    errors.riskAppetiteRegime = "Risk appetite threshold must be between 0 and 100.";
  }

  return errors;
};

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
  const [draft, setDraft] = useState<ThresholdDraft>(() => buildDraft(currentThresholds));
  const [errors, setErrors] = useState<ThresholdErrorMap>({});
  const [auditLog, setAuditLog] = useState<ThresholdAuditEntry[]>([]);
  const [isPending, startTransition] = useTransition();
  const baseRateRef = useRef<HTMLInputElement | null>(null);
  const tightnessRef = useRef<HTMLInputElement | null>(null);
  const riskRef = useRef<HTMLInputElement | null>(null);
  const storageKey = "whether.thresholdDraft";
  const auditKey = "whether.thresholdAudit";
  const errorIds = {
    baseRateTightness: "threshold-base-rate-error",
    tightnessRegime: "threshold-tightness-error",
    riskAppetiteRegime: "threshold-risk-error",
  };
  const appliedDefaults = DEFAULT_THRESHOLDS;

  useEffect(() => {
    setDraft(buildDraft(currentThresholds));
  }, [currentThresholds]);

  useEffect(() => {
    const hasUrlThresholds =
      searchParams.has(THRESHOLD_PARAM_KEYS.baseRate) ||
      searchParams.has(THRESHOLD_PARAM_KEYS.tightness) ||
      searchParams.has(THRESHOLD_PARAM_KEYS.risk);
    if (hasUrlThresholds) {
      return;
    }
    const storedDraft = window.localStorage.getItem(storageKey);
    if (!storedDraft) {
      return;
    }
    try {
      const parsed = JSON.parse(storedDraft) as ThresholdDraft;
      setDraft(parsed);
      const nextErrors = validateDraft(parsed);
      if (Object.keys(nextErrors).length === 0) {
        const nextParams = new URLSearchParams(searchParams.toString());
        buildThresholdSearchParams(buildThresholds(parsed), appliedDefaults, nextParams);
        router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
      }
    } catch {
      // Ignore storage parse errors to keep console clean.
    }
  }, [appliedDefaults, pathname, router, searchParams]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    const storedAudit = window.localStorage.getItem(auditKey);
    if (!storedAudit) {
      return;
    }
    try {
      const parsed = JSON.parse(storedAudit) as ThresholdAuditEntry[];
      setAuditLog(parsed);
    } catch {
      // Ignore audit parse errors to keep console clean.
    }
  }, []);

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
    setAuditLog(nextAudit);
    window.localStorage.setItem(auditKey, JSON.stringify(nextAudit));
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
    const defaultDraft = buildDraft(appliedDefaults);
    setDraft(defaultDraft);
    setErrors({});
    startTransition(() => {
      updateUrl(appliedDefaults, "reset");
    });
  };

  const updateDraft = (key: keyof ThresholdDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Market climate thresholds</p>
            <h3 id="thresholds-title" className="type-section text-slate-100">
              Tune classification guardrails
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Thresholds are URL-driven for deterministic back/forward behavior and auditability.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-xs font-semibold tracking-[0.12em] text-slate-400">
            <span>
              Defaults: {appliedDefaults.baseRateTightness}% ·{" "}
              {appliedDefaults.tightnessRegime}/{appliedDefaults.riskAppetiteRegime}
            </span>
            <Popover.Root>
              <Popover.Trigger
                type="button"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-800/70 px-4 py-2 text-[10px] font-semibold tracking-[0.18em] text-slate-300 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700/70 text-[9px] text-slate-400">
                  ?
                </span>
                Threshold logic
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner side="bottom" align="end" sideOffset={12}>
                  <Popover.Popup className="w-72 rounded-2xl border border-slate-800/80 bg-slate-950/95 p-4 text-xs text-slate-300 shadow-xl">
                    <Popover.Title className="text-xs font-semibold tracking-[0.14em] text-slate-100">
                      How these thresholds work
                    </Popover.Title>
                    <Popover.Description className="mt-2 text-xs text-slate-400">
                      Thresholds define when a score flips the climate label. Adjust them to
                      reflect your risk tolerance, then share the URL for audit-ready review.
                    </Popover.Description>
                    <ul className="mt-3 space-y-2 text-xs text-slate-300">
                      <li className="flex gap-2">
                        <span className="text-slate-500">•</span>
                        <span>Lower numbers mean earlier alerts and stricter guardrails.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-slate-500">•</span>
                        <span>Higher numbers delay changes until signals are extreme.</span>
                      </li>
                    </ul>
                    <Popover.Close className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-full border border-slate-800/70 px-3 py-2 text-[10px] font-semibold tracking-[0.18em] text-slate-300 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation">
                      Close
                    </Popover.Close>
                    <Popover.Arrow className="h-3 w-3 translate-y-[1px] rotate-45 rounded-[3px] bg-slate-950/95" />
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
            <DataProvenanceStrip provenance={provenance} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-[1fr,1fr,1fr,auto]">
          <Field.Root className="space-y-2 text-xs font-semibold tracking-[0.12em] text-slate-400">
            <Field.Label>Base rate threshold (%)</Field.Label>
            <NumberField.Root
              id="threshold-base-rate"
              name={THRESHOLD_PARAM_KEYS.baseRate}
              min={0}
              max={10}
              step={0.01}
              value={
                draft.baseRateTightness === ""
                  ? null
                  : Number.isNaN(Number(draft.baseRateTightness))
                    ? null
                    : Number(draft.baseRateTightness)
              }
              onValueChange={(value) =>
                updateDraft("baseRateTightness", value === null ? "" : value.toString())
              }
            >
              <NumberField.Group>
                <NumberField.Input
                  ref={baseRateRef}
                  inputMode="decimal"
                  onBlur={() => handleBlur("baseRateTightness")}
                  aria-invalid={Boolean(errors.baseRateTightness)}
                  aria-describedby={
                    errors.baseRateTightness ? errorIds.baseRateTightness : undefined
                  }
                  className="weather-input min-h-[44px] w-full px-3 py-2 text-base"
                />
              </NumberField.Group>
            </NumberField.Root>
            <Field.Error
              id={errorIds.baseRateTightness}
              match={Boolean(errors.baseRateTightness)}
              className="min-h-[18px] text-xs text-amber-200"
            >
              {errors.baseRateTightness ?? ""}
            </Field.Error>
          </Field.Root>
          <Field.Root className="space-y-2 text-xs font-semibold tracking-[0.12em] text-slate-400">
            <Field.Label>Tightness score threshold</Field.Label>
            <NumberField.Root
              id="threshold-tightness"
              name={THRESHOLD_PARAM_KEYS.tightness}
              min={0}
              max={100}
              step={0.01}
              value={
                draft.tightnessRegime === ""
                  ? null
                  : Number.isNaN(Number(draft.tightnessRegime))
                    ? null
                    : Number(draft.tightnessRegime)
              }
              onValueChange={(value) =>
                updateDraft("tightnessRegime", value === null ? "" : value.toString())
              }
            >
              <NumberField.Group>
                <NumberField.Input
                  ref={tightnessRef}
                  inputMode="numeric"
                  onBlur={() => handleBlur("tightnessRegime")}
                  aria-invalid={Boolean(errors.tightnessRegime)}
                  aria-describedby={
                    errors.tightnessRegime ? errorIds.tightnessRegime : undefined
                  }
                  className="weather-input min-h-[44px] w-full px-3 py-2 text-base"
                />
              </NumberField.Group>
            </NumberField.Root>
            <Field.Error
              id={errorIds.tightnessRegime}
              match={Boolean(errors.tightnessRegime)}
              className="min-h-[18px] text-xs text-amber-200"
            >
              {errors.tightnessRegime ?? ""}
            </Field.Error>
          </Field.Root>
          <Field.Root className="space-y-2 text-xs font-semibold tracking-[0.12em] text-slate-400">
            <Field.Label>Risk appetite score</Field.Label>
            <NumberField.Root
              id="threshold-risk"
              name={THRESHOLD_PARAM_KEYS.risk}
              min={0}
              max={100}
              step={0.01}
              value={
                draft.riskAppetiteRegime === ""
                  ? null
                  : Number.isNaN(Number(draft.riskAppetiteRegime))
                    ? null
                    : Number(draft.riskAppetiteRegime)
              }
              onValueChange={(value) =>
                updateDraft("riskAppetiteRegime", value === null ? "" : value.toString())
              }
            >
              <NumberField.Group>
                <NumberField.Input
                  ref={riskRef}
                  inputMode="numeric"
                  onBlur={() => handleBlur("riskAppetiteRegime")}
                  aria-invalid={Boolean(errors.riskAppetiteRegime)}
                  aria-describedby={
                    errors.riskAppetiteRegime ? errorIds.riskAppetiteRegime : undefined
                  }
                  className="weather-input min-h-[44px] w-full px-3 py-2 text-base"
                />
              </NumberField.Group>
            </NumberField.Root>
            <Field.Error
              id={errorIds.riskAppetiteRegime}
              match={Boolean(errors.riskAppetiteRegime)}
              className="min-h-[18px] text-xs text-amber-200"
            >
              {errors.riskAppetiteRegime ?? ""}
            </Field.Error>
          </Field.Root>
          <div className="flex items-end gap-3">
            <button
              type="submit"
              disabled={isPending}
              aria-busy={isPending}
              className="weather-button inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
            >
              {isPending ? (
                <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
              ) : null}
              {isPending ? "Applying" : "Apply thresholds"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={isPending}
              aria-busy={isPending}
              className="weather-button inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-400 transition-colors hover:border-sky-300/70 hover:text-slate-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
            >
              {isPending ? (
                <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
              ) : null}
              {isPending ? "Resetting" : "Reset"}
            </button>
          </div>
        </form>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr,1fr]">
          <div className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Applied thresholds</p>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <p>
                Base rate threshold:{" "}
                <span className="mono text-slate-100">{formattedCurrent.baseRateTightness}%</span>
              </p>
              <p>
                Tightness threshold:{" "}
                <span className="mono text-slate-100">{formattedCurrent.tightnessRegime}</span>
              </p>
              <p>
                Risk appetite threshold:{" "}
                <span className="mono text-slate-100">{formattedCurrent.riskAppetiteRegime}</span>
              </p>
            </div>
          </div>
          <div className="weather-surface p-4">
            <Collapsible.Root defaultOpen>
              <Collapsible.Trigger
                type="button"
                className="min-h-[44px] text-xs font-semibold tracking-[0.12em] text-slate-400 transition-colors hover:text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 touch-manipulation"
              >
                Audit trail (recent overrides)
              </Collapsible.Trigger>
              <Collapsible.Panel className="mt-3">
                {auditLog.length ? (
                  <ul className="space-y-3 text-xs text-slate-400">
                    {auditLog.map((entry) => (
                      <li key={`${entry.timestamp}-${entry.source}`}>
                        <p className="text-xs font-semibold tracking-[0.12em] text-slate-500">
                          {entry.source === "reset" ? "Reset" : "Override"} ·{" "}
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
                  <p className="text-xs text-slate-500">
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
