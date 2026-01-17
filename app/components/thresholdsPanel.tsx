/**
 * Thresholds panel to tune regime classification and log overrides.
 * Keeps URL-driven state and audit trail visible for operators.
 */
"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
    errors.tightnessRegime = "Tightness regime threshold must be between 0 and 100.";
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
    router.push(`${pathname}?${nextParams.toString()}`, { scroll: false });
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
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Regime thresholds</p>
            <h3 id="thresholds-title" className="type-section text-slate-100">
              Tune classification guardrails
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Thresholds are URL-driven for deterministic back/forward behavior and auditability.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            <span>
              Defaults: {appliedDefaults.baseRateTightness}% ·{" "}
              {appliedDefaults.tightnessRegime}/{appliedDefaults.riskAppetiteRegime}
            </span>
            <DataProvenanceStrip provenance={provenance} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-[1fr,1fr,1fr,auto]">
          <label
            htmlFor="threshold-base-rate"
            className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-400"
          >
            Base rate threshold (%)
            <input
              ref={baseRateRef}
              id="threshold-base-rate"
              name={THRESHOLD_PARAM_KEYS.baseRate}
              inputMode="decimal"
              value={draft.baseRateTightness}
              onChange={(event) => updateDraft("baseRateTightness", event.target.value)}
              onBlur={() => handleBlur("baseRateTightness")}
              aria-invalid={Boolean(errors.baseRateTightness)}
              aria-describedby={errors.baseRateTightness ? errorIds.baseRateTightness : undefined}
              className="min-h-[44px] w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-base text-slate-100"
            />
            <span className="min-h-[18px] text-[11px] text-amber-200">
              {errors.baseRateTightness ? (
                <span id={errorIds.baseRateTightness}>{errors.baseRateTightness}</span>
              ) : null}
            </span>
          </label>
          <label
            htmlFor="threshold-tightness"
            className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-400"
          >
            Tightness regime score
            <input
              ref={tightnessRef}
              id="threshold-tightness"
              name={THRESHOLD_PARAM_KEYS.tightness}
              inputMode="numeric"
              value={draft.tightnessRegime}
              onChange={(event) => updateDraft("tightnessRegime", event.target.value)}
              onBlur={() => handleBlur("tightnessRegime")}
              aria-invalid={Boolean(errors.tightnessRegime)}
              aria-describedby={errors.tightnessRegime ? errorIds.tightnessRegime : undefined}
              className="min-h-[44px] w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-base text-slate-100"
            />
            <span className="min-h-[18px] text-[11px] text-amber-200">
              {errors.tightnessRegime ? (
                <span id={errorIds.tightnessRegime}>{errors.tightnessRegime}</span>
              ) : null}
            </span>
          </label>
          <label
            htmlFor="threshold-risk"
            className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-400"
          >
            Risk appetite score
            <input
              ref={riskRef}
              id="threshold-risk"
              name={THRESHOLD_PARAM_KEYS.risk}
              inputMode="numeric"
              value={draft.riskAppetiteRegime}
              onChange={(event) => updateDraft("riskAppetiteRegime", event.target.value)}
              onBlur={() => handleBlur("riskAppetiteRegime")}
              aria-invalid={Boolean(errors.riskAppetiteRegime)}
              aria-describedby={errors.riskAppetiteRegime ? errorIds.riskAppetiteRegime : undefined}
              className="min-h-[44px] w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-base text-slate-100"
            />
            <span className="min-h-[18px] text-[11px] text-amber-200">
              {errors.riskAppetiteRegime ? (
                <span id={errorIds.riskAppetiteRegime}>{errors.riskAppetiteRegime}</span>
              ) : null}
            </span>
          </label>
          <div className="flex items-end gap-3">
            <button
              type="submit"
              disabled={isPending}
              aria-busy={isPending}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition-colors hover:border-slate-500 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
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
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-800 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
            >
              {isPending ? (
                <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
              ) : null}
              {isPending ? "Resetting" : "Reset"}
            </button>
          </div>
        </form>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr,1fr]">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Applied thresholds</p>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <p>
                Base rate threshold:{" "}
                <span className="mono text-slate-100">{formattedCurrent.baseRateTightness}%</span>
              </p>
              <p>
                Tightness regime threshold:{" "}
                <span className="mono text-slate-100">{formattedCurrent.tightnessRegime}</span>
              </p>
              <p>
                Risk appetite threshold:{" "}
                <span className="mono text-slate-100">{formattedCurrent.riskAppetiteRegime}</span>
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Audit trail</p>
            {auditLog.length ? (
              <ul className="mt-3 space-y-3 text-xs text-slate-400">
                {auditLog.map((entry) => (
                  <li key={`${entry.timestamp}-${entry.source}`}>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
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
              <p className="mt-3 text-xs text-slate-500">
                No overrides logged yet. Defaults are active.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
