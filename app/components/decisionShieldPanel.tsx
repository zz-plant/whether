/**
 * Decision Shield panel for validating operator actions against the current regime.
 * Keeps verdict output shareable and grounded in sensor-driven signals.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [lifecycle, setLifecycle] = useState<LifecycleStage>("GROWTH");
  const [category, setCategory] = useState<DecisionCategory>("HIRING");
  const [action, setAction] = useState<DecisionAction>("HIRE");
  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const storageKey = "whether.decisionShield";

  const output = useMemo(
    () => evaluateDecision(assessment, { lifecycle, category, action }),
    [assessment, lifecycle, category, action]
  );
  const shareText = useMemo(
    () => buildShareText(assessment, lifecycle, category, action, output),
    [assessment, lifecycle, category, action, output]
  );

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as {
        lifecycle?: LifecycleStage;
        category?: DecisionCategory;
        action?: DecisionAction;
      };
      if (parsed.lifecycle) {
        setLifecycle(parsed.lifecycle);
      }
      if (parsed.category) {
        setCategory(parsed.category);
      }
      if (parsed.action) {
        setAction(parsed.action);
      }
    } catch (error) {
      console.warn("Unable to restore Decision Shield state.", error);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ lifecycle, category, action })
      );
    } catch (error) {
      console.warn("Unable to persist Decision Shield state.", error);
    }
  }, [action, category, lifecycle, storageKey]);

  useEffect(() => {
    setCopyError(false);
  }, [lifecycle, category, action]);

  const handleCopy = async () => {
    if (isCopying) {
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

  return (
    <section id="decision-shield" aria-labelledby="decision-shield-title" className="mt-10">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Decision Shield</p>
            <h3 id="decision-shield-title" className="text-xl font-semibold text-slate-100">
              Validate an action
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              Pressure-test the next move against current regime physics, then share the verdict.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            disabled={isCopying}
            aria-busy={isCopying}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition-colors hover:border-slate-500 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
          >
            {isCopying ? (
              <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
            ) : null}
            {copied ? "Copied" : isCopying ? "Copying" : "Copy verdict"}
          </button>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {copied ? "Verdict copied to clipboard." : copyError ? "Clipboard blocked." : ""}
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
              className="mt-3 w-full rounded-lg border border-amber-400/30 bg-slate-950/80 p-3 font-mono text-base text-amber-100"
            />
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            Lifecycle
            <select
              value={lifecycle}
              onChange={(event) => setLifecycle(event.target.value as LifecycleStage)}
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
              onChange={(event) => setCategory(event.target.value as DecisionCategory)}
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
              onChange={(event) => setAction(event.target.value as DecisionAction)}
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
            <p className="mt-3 text-sm text-slate-200 break-words">{output.summary}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {output.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="text-slate-500">•</span>
                  <span className="break-words">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Guardrail</p>
              <p className="mt-3 text-sm text-slate-300 break-words">{output.guardrail}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Reversal trigger</p>
              <p className="mt-3 text-sm text-slate-300 break-words">{output.reversalTrigger}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
