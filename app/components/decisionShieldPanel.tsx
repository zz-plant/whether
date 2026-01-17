/**
 * Decision Shield panel for validating operator actions against the current regime.
 * Keeps verdict output shareable and grounded in sensor-driven signals.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  evaluateDecision,
  type DecisionAction,
  type DecisionCategory,
  type DecisionOutput,
  type LifecycleStage,
} from "../../lib/decisionShield";
import type { RegimeAssessment } from "../../lib/regimeEngine";

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
];

const actionOptions: { value: DecisionAction; label: string }[] = [
  { value: "HIRE", label: "Hire" },
  { value: "REWRITE", label: "Rewrite" },
  { value: "LAUNCH", label: "Launch" },
  { value: "DISCOUNT", label: "Discount" },
  { value: "EXPAND", label: "Expand" },
];

const verdictStyles: Record<DecisionOutput["verdict"], string> = {
  SAFE: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  RISKY: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  DANGEROUS: "border-rose-400/40 bg-rose-500/10 text-rose-200",
};

const buildShareText = (
  assessment: RegimeAssessment,
  lifecycle: LifecycleStage,
  category: DecisionCategory,
  action: DecisionAction,
  output: DecisionOutput
) => {
  const lines = [
    "Decision Shield — Whether Report",
    `Regime: ${assessment.regime}`,
    `Lifecycle: ${lifecycle}`,
    `Category: ${category}`,
    `Action: ${action}`,
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

export const DecisionShieldPanel = ({ assessment }: { assessment: RegimeAssessment }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlLifecycle = searchParams.get("lifecycle");
  const urlCategory = searchParams.get("category");
  const urlAction = searchParams.get("action");
  const initialLifecycle =
    lifecycleOptions.find((option) => option.value === urlLifecycle)?.value ?? "GROWTH";
  const initialCategory =
    categoryOptions.find((option) => option.value === urlCategory)?.value ?? "HIRING";
  const initialAction = actionOptions.find((option) => option.value === urlAction)?.value ?? "HIRE";
  const [lifecycle, setLifecycle] = useState<LifecycleStage>(initialLifecycle);
  const [category, setCategory] = useState<DecisionCategory>(initialCategory);
  const [action, setAction] = useState<DecisionAction>(initialAction);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const output = useMemo(
    () => evaluateDecision(assessment, { lifecycle, category, action }),
    [assessment, lifecycle, category, action]
  );
  const shareText = useMemo(
    () => buildShareText(assessment, lifecycle, category, action, output),
    [assessment, lifecycle, category, action, output]
  );

  useEffect(() => {
    setCopyError(false);
  }, [lifecycle, category, action]);

  const updateQueryParam = (
    nextLifecycle: LifecycleStage,
    nextCategory: DecisionCategory,
    nextAction: DecisionAction
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("lifecycle", nextLifecycle);
    params.set("category", nextCategory);
    params.set("action", nextAction);
    router.push(`?${params.toString()}`);
  };

  useEffect(() => {
    const stored = sessionStorage.getItem("decision-shield-state");
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as {
        lifecycle?: LifecycleStage;
        category?: DecisionCategory;
        action?: DecisionAction;
      };
      let nextLifecycle = lifecycle;
      let nextCategory = category;
      let nextAction = action;
      if (parsed.lifecycle && !urlLifecycle) {
        nextLifecycle = parsed.lifecycle;
        setLifecycle(parsed.lifecycle);
      }
      if (parsed.category && !urlCategory) {
        nextCategory = parsed.category;
        setCategory(parsed.category);
      }
      if (parsed.action && !urlAction) {
        nextAction = parsed.action;
        setAction(parsed.action);
      }
      if (!urlLifecycle || !urlCategory || !urlAction) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("lifecycle", nextLifecycle);
        params.set("category", nextCategory);
        params.set("action", nextAction);
        router.replace(`?${params.toString()}`);
      }
    } catch {
      sessionStorage.removeItem("decision-shield-state");
    }
  }, [category, lifecycle, action, router, searchParams, urlAction, urlCategory, urlLifecycle]);

  useEffect(() => {
    sessionStorage.setItem(
      "decision-shield-state",
      JSON.stringify({ lifecycle, category, action })
    );
  }, [action, category, lifecycle]);

  const handleCopy = async () => {
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

  return (
    <section className="mt-10">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Decision Shield</p>
            <h3 className="text-xl font-semibold text-slate-100">Validate an action</h3>
            <p className="mt-2 text-sm text-slate-300">
              Pressure-test the next move against current regime physics, then share the verdict.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            disabled={isCopying}
            aria-busy={isCopying}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition-colors hover:border-slate-500 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isCopying ? (
              <>
                <span
                  aria-hidden="true"
                  className="h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-transparent"
                />
                Copying
              </>
            ) : copied ? (
              "Copied"
            ) : (
              "Copy verdict"
            )}
          </button>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {isCopying
            ? "Copying verdict."
            : copied
              ? "Verdict copied to clipboard."
              : copyError
                ? "Clipboard blocked."
                : ""}
        </p>
        {copyError ? (
          <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-xs text-amber-100">
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
              className="mt-3 w-full origin-top-left rounded-lg border border-amber-400/30 bg-slate-950/80 p-3 font-mono text-base text-amber-100 [transform:scale(0.9)]"
            />
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            Lifecycle
            <select
              value={lifecycle}
              onChange={(event) => {
                const nextLifecycle = event.target.value as LifecycleStage;
                setLifecycle(nextLifecycle);
                updateQueryParam(nextLifecycle, category, action);
              }}
              className="min-h-[44px] w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-base text-slate-100 transition-colors hover:border-slate-700"
            >
              {lifecycleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            Category
            <select
              value={category}
              onChange={(event) => {
                const nextCategory = event.target.value as DecisionCategory;
                setCategory(nextCategory);
                updateQueryParam(lifecycle, nextCategory, action);
              }}
              className="min-h-[44px] w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-base text-slate-100 transition-colors hover:border-slate-700"
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            Action
            <select
              value={action}
              onChange={(event) => {
                const nextAction = event.target.value as DecisionAction;
                setAction(nextAction);
                updateQueryParam(lifecycle, category, nextAction);
              }}
              className="min-h-[44px] w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-base text-slate-100 transition-colors hover:border-slate-700"
            >
              {actionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr,1fr]">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Verdict</p>
            <div
              className={`mt-3 inline-flex items-center rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${verdictStyles[output.verdict]}`}
            >
              {output.verdict}
            </div>
            <p className="mt-3 text-sm text-slate-200">{output.summary}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {output.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="text-slate-500">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Guardrail</p>
              <p className="mt-3 text-sm text-slate-300">{output.guardrail}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Reversal trigger</p>
              <p className="mt-3 text-sm text-slate-300">{output.reversalTrigger}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
