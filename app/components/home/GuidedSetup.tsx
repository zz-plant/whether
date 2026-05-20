"use client";

import { useState, useEffect } from "react";

const DISMISS_KEY = "whether_setup_done";

const STAGES = [
  { key: "pre-seed", label: "Pre-seed", desc: "Validating product-market fit" },
  { key: "seed", label: "Seed", desc: "Building repeatable pipeline" },
  { key: "series-a", label: "Series A", desc: "Scaling proven channels" },
  { key: "series-b-plus", label: "Series B+", desc: "Managing growth efficiency" },
  { key: "public", label: "Public", desc: "Managing shareholder expectations" },
] as const;

const SENSITIVITIES = [
  { key: "high", label: "High", desc: "Heavily affected by rate changes (fintech, real estate, capital-intensive)" },
  { key: "medium", label: "Medium", desc: "Moderately affected (most SaaS, services)" },
  { key: "low", label: "Low", desc: "Minimally affected (bootstrapped, cash-rich)" },
] as const;

type Step = "stage" | "sensitivity" | "done";

export function GuidedSetup({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState<Step>("stage");
  const [stage, setStage] = useState("");
  const [sensitivity, setSensitivity] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) setDone(true);
    } catch { /* localStorage unavailable — show guided setup */ }
  }, []);

  const saveAndNext = () => {
    if (step === "stage") {
      document.cookie = `whether-company-stage=${stage};path=/;max-age=31536000`;
      setStep("sensitivity");
    } else if (step === "sensitivity") {
      document.cookie = `whether-rate-sensitivity=${sensitivity};path=/;max-age=31536000`;
      localStorage.setItem("whether.config.stage", stage);
      localStorage.setItem("whether-rate-sensitivity", sensitivity);
      localStorage.setItem(DISMISS_KEY, "1");
      setDone(true);
      onComplete?.();
    }
  };

  const skip = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDone(true);
    onComplete?.();
  };

  if (done) return null;

  return (
    <div className="rounded-lg border border-sky-500/30 bg-sky-950/20 px-5 py-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-400/20 text-[10px] font-bold text-sky-100">
          {step === "stage" ? "1" : step === "sensitivity" ? "2" : "✓"}
        </span>
        <p className="text-sm font-semibold text-sky-100">
          {step === "stage"
            ? "What stage is your company?"
            : "How rate-sensitive is your business?"}
        </p>
        <span className="text-fluid-micro text-slate-500 ml-auto">
          Step {step === "stage" ? "1" : "2"} of 2
        </span>
      </div>

      {step === "stage" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {STAGES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setStage(s.key)}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                stage === s.key
                  ? "border-sky-400/60 bg-sky-500/14 text-sky-100"
                  : "border-slate-700/60 bg-slate-950/40 text-slate-300 hover:border-sky-500/40"
              }`}
            >
              <span className="block text-sm font-semibold">{s.label}</span>
              <span className="block text-fluid-micro text-slate-500 mt-0.5">{s.desc}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid gap-2">
          {SENSITIVITIES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSensitivity(s.key)}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                sensitivity === s.key
                  ? "border-sky-400/60 bg-sky-500/14 text-sky-100"
                  : "border-slate-700/60 bg-slate-950/40 text-slate-300 hover:border-sky-500/40"
              }`}
            >
              <span className="block text-sm font-semibold">{s.label}</span>
              <span className="block text-fluid-micro text-slate-500 mt-0.5">{s.desc}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={skip}
          className="text-fluid-micro text-slate-500 hover:text-slate-300 transition-colors"
        >
          Skip — use defaults
        </button>
        <button
          type="button"
          onClick={saveAndNext}
          disabled={step === "stage" ? !stage : !sensitivity}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            (step === "stage" && stage) || (step === "sensitivity" && sensitivity)
              ? "bg-sky-500/20 border border-sky-400/40 text-sky-100 hover:bg-sky-500/30"
              : "bg-slate-800/40 border border-slate-700/60 text-slate-500 cursor-not-allowed"
          }`}
        >
          {step === "stage" ? "Next →" : "See my brief →"}
        </button>
      </div>
    </div>
  );
}
