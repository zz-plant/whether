/**
 * Thresholds panel: move the lines the call is judged against, and keep the
 * recent changes visible. The lines live in the URL so a shared link matches.
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Fieldset } from "@base-ui/react/fieldset";
import { Form } from "@base-ui/react/form";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toRoute, type Route } from "../../../lib/navigation/routeType";
import type { RegimeThresholds } from "../../../lib/regimeEngine";
import { DEFAULT_THRESHOLDS } from "../../../lib/regimeEngine";
import { buildThresholdSearchParams, THRESHOLD_PARAM_KEYS } from "../../../lib/thresholds";
import { SectionPanelHeader } from "../../components/sectionPanelHeader";
import { SpinnerIcon } from "../../components/uiIcons";
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
    errors.baseRateTightness = "The short-term borrowing rate line must be between 0 and 10.";
  }
  if (Number.isNaN(tightness) || tightness < 0 || tightness > 100) {
    errors.tightnessRegime = "The funding pressure line must be between 0 and 100.";
  }
  if (Number.isNaN(risk) || risk < 0 || risk > 100) {
    errors.riskAppetiteRegime = "The risk appetite line must be between 0 and 100.";
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

/* The panel's disclosure look, once. The summary is a control, so it takes the
   control radius (ui-ux-standards §XIV); the chevron, target and focus ring
   come from `weather-auto-chevron`. */
const DISCLOSURE_CLASS = "weather-auto-chevron";
const DISCLOSURE_SUMMARY_CLASS =
  "rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2 text-fluid-xs font-semibold text-slate-300";

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
}: {
  currentThresholds: RegimeThresholds;
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
      detail: "The published lines.",
      thresholds: appliedDefaults,
    },
    {
      id: "early-alert",
      label: "Sooner warnings",
      detail: "Lines closer to today's scores, so the call changes sooner.",
      thresholds: {
        baseRateTightness: 4.5,
        tightnessRegime: 48,
        riskAppetiteRegime: 52,
      },
    },
    {
      id: "strict",
      label: "Slower to change",
      detail: "Lines further out, so the call changes only on a bigger move.",
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
    if (!confirm("Reset all thresholds to defaults? Your custom lines will be replaced.")) {
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
    <section id="thresholds" aria-labelledby="thresholds-title" className="mt-4">
      <div>
        <SectionPanelHeader
          label="Lines that change the call"
          title="Adjust when the call changes"
          titleId="thresholds-title"
          description="These values decide when the call changes. They stay in the URL so shared links match."
          aside={
            /* A labelled value, not a control: it was set in `weather-pill`,
               which is the class the page's pill-shaped links press. */
            <dl className="flex items-baseline gap-1.5 text-fluid-xs">
              <dt className="text-slate-400">Defaults:</dt>
              {/* Each number named: "3.5% · 70/50" asked the reader to know
                  which score each figure belonged to. */}
              <dd className="font-semibold tabular-nums text-slate-200">
                rate {appliedDefaults.baseRateTightness}% · funding pressure {appliedDefaults.tightnessRegime} ·
                risk appetite {appliedDefaults.riskAppetiteRegime}
              </dd>
            </dl>
          }
        />

        <div className="mt-6 space-y-4">
          <div className="weather-surface p-4">
            <p className="type-eyebrow">Quick presets</p>
            <p className="mt-2 text-sm text-slate-300">
              Start with one preset, then expand the detailed controls only if you need your own lines.
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

          {/* Three disclosures on this panel, one contract: native `<details>`
              under `weather-auto-chevron`. They were three Base UI collapsibles
              styled three different ways, two with a focus ring in a colour
              nothing else on the page uses. */}
          <details className={DISCLOSURE_CLASS}>
            <summary className={DISCLOSURE_SUMMARY_CLASS}>Edit exact numbers</summary>
            <div className="pt-4">
              <Form onFormSubmit={handleSubmit} className="grid gap-4">
                <Fieldset.Root className="grid min-w-0 gap-4 border-0 p-0 lg:grid-cols-[1fr,1fr,1fr,auto]">
                  <Fieldset.Legend className="sr-only">Set threshold guardrails</Fieldset.Legend>
                  <ThresholdNumberField
                    id="threshold-base-rate"
                    name={THRESHOLD_PARAM_KEYS.baseRate}
                    label="Short-term borrowing rate line (%)"
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
                    label="Funding pressure line (0–100)"
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
                    label="Risk appetite line (0–100)"
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
                      {isPending ? <SpinnerIcon className="h-3 w-3" /> : null}
                      {isPending ? "Applying" : "Apply lines"}
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={isPending}
                      aria-busy={isPending}
                      className="weather-button inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-400 transition-colors hover:border-sky-300/70 hover:text-slate-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-400"
                    >
                      {isPending ? <SpinnerIcon className="h-3 w-3" /> : null}
                      {isPending ? "Resetting" : "Reset"}
                    </button>
                  </div>
                </Fieldset.Root>
              </Form>
            </div>
          </details>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr,1fr]">
          <div className="weather-surface p-4">
            <p className="type-eyebrow">Applied thresholds</p>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <p>
                Short-term borrowing rate line:{" "}
                <span className="mono text-slate-100">{formattedCurrent.baseRateTightness}%</span>
              </p>
              <p>
                Funding pressure line (0–100):{" "}
                <span className="mono text-slate-100">{formattedCurrent.tightnessRegime}</span>
              </p>
              <p>
                Risk appetite line (0–100):{" "}
                <span className="mono text-slate-100">{formattedCurrent.riskAppetiteRegime}</span>
              </p>
            </div>
          </div>
          <div className="weather-surface p-4">
            {/* The explanation used to sit behind two clicks: a collapsible
                "How this works" whose body was a popover trigger, "How the
                watch lines work", whose popup held two bullet points. The two
                lines print here. */}
            <details className={DISCLOSURE_CLASS}>
              <summary className={DISCLOSURE_SUMMARY_CLASS}>How this works</summary>
              <div className="mt-3 space-y-3 text-xs text-slate-300">
                <p className="text-slate-400">
                  These lines decide when a score changes the call. Move them to match your own
                  risk tolerance, then share this link.
                </p>
                {/* The two scores cross their lines in opposite directions, so "lower
                    changes the call sooner" was true of funding pressure and backwards
                    for risk appetite — the "Sooner warnings" preset raises that line. */}
                <ul className="list-disc space-y-1 pl-4">
                  <li>A lower funding pressure line, or a higher risk appetite line, changes the call sooner.</li>
                  <li>Moving either the other way waits for a bigger move.</li>
                </ul>
              </div>
            </details>
          </div>
          <div className="weather-surface p-4">
            <details open className={DISCLOSURE_CLASS}>
              <summary className={DISCLOSURE_SUMMARY_CLASS}>Recent changes</summary>
              <div className="mt-3">
                {auditLog.length ? (
                  <ul className="space-y-3 text-xs text-slate-400">
                    {auditLog.map((entry) => (
                      <li key={`${entry.timestamp}-${entry.source}`}>
                        <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                          {entry.source === "reset" ? "Reset" : entry.source === "preset" ? "Preset" : "Edited"} ·{" "}
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
                    Using the defaults.
                  </p>
                )}
              </div>
            </details>
          </div>
        </div>
      </div>
    </section>
  );
};
