"use client";

import { useState, useEffect, useCallback } from "react";

const COOKIE_STAGE = "whether-company-stage";
const COOKIE_RATE_SENSITIVITY = "whether-rate-sensitivity";
const COOKIE_DISMISSED = "whether-context-dismissed";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

type CompanyStage = "pre-seed" | "seed" | "series-a" | "series-b-plus" | "public";
type RateSensitivity = "high" | "medium" | "low";

const STAGE_KEYS: readonly CompanyStage[] = [
  "pre-seed",
  "seed",
  "series-a",
  "series-b-plus",
  "public",
];

const RATE_KEYS: readonly RateSensitivity[] = ["high", "medium", "low"];

function isValidStage(value: string | null): CompanyStage | null {
  if (!value) return null;
  switch (value) {
    case "pre-seed":
    case "seed":
    case "series-a":
    case "series-b-plus":
    case "public":
      return value;
    default:
      return null;
  }
}

function isValidSensitivity(value: string | null): RateSensitivity | null {
  if (!value) return null;
  switch (value) {
    case "high":
    case "medium":
    case "low":
      return value;
    default:
      return null;
  }
}

const STAGE_LABELS: Record<CompanyStage, string> = {
  "pre-seed": "Pre-seed",
  "seed": "Seed",
  "series-a": "Series A",
  "series-b-plus": "Series B+",
  "public": "Public",
};

const STAGE_SHORT: Record<CompanyStage, string> = {
  "pre-seed": "Pre-seed",
  "seed": "Seed",
  "series-a": "Series A",
  "series-b-plus": "Series B+",
  "public": "Public",
};

const RATE_LABELS: Record<RateSensitivity, { label: string; detail: string }> = {
  high: { label: "High", detail: "Rates directly impact revenue, cost of capital, or customer demand (fintech, real estate, lending, capital-intensive)" },
  medium: { label: "Medium", detail: "Rates matter for fundraising and hiring pace, but not day-to-day operations" },
  low: { label: "Low", detail: "Rates have limited direct impact (bootstrapped SaaS, consumer apps, services)" },
};

const setCookie = (name: string, value: string, days: number) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${days}; SameSite=Lax`;
};

const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

export function getOperatorContextServer(): {
  companyStage: CompanyStage | null;
  rateSensitivity: RateSensitivity | null;
  dismissed: boolean;
} | null {
  // Server-side — context is read from cookies on the request.
  // This is a client utility; actual server reading requires cookie parsing in the route handler.
  return null;
}

/**
 * Client-side hook and context for operator personalization.
 * Exports the raw cookie reader/writer so server components can read from request headers.
 */
export function useOperatorContext(): {
  companyStage: CompanyStage | null;
  rateSensitivity: RateSensitivity | null;
  dismissed: boolean;
  showQuestions: boolean;
  setContext: (stage: CompanyStage, sensitivity: RateSensitivity) => void;
  dismissQuestions: () => void;
} {
  const [companyStage, setCompanyStage] = useState<CompanyStage | null>(null);
  const [rateSensitivity, setRateSensitivity] = useState<RateSensitivity | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stageRaw = getCookie(COOKIE_STAGE);
    const sensitivityRaw = getCookie(COOKIE_RATE_SENSITIVITY);
    const dismissedCookie = getCookie(COOKIE_DISMISSED);
    setCompanyStage(isValidStage(stageRaw));
    setRateSensitivity(isValidSensitivity(sensitivityRaw));
    setDismissed(dismissedCookie === "1");
  }, []);

  const setContext = useCallback((stage: CompanyStage, sensitivity: RateSensitivity) => {
    setCookie(COOKIE_STAGE, stage, COOKIE_MAX_AGE);
    setCookie(COOKIE_RATE_SENSITIVITY, sensitivity, COOKIE_MAX_AGE);
    setCookie(COOKIE_DISMISSED, "1", COOKIE_MAX_AGE);
    setCompanyStage(stage);
    setRateSensitivity(sensitivity);
    setDismissed(true);
  }, []);

  const dismissQuestions = useCallback(() => {
    setCookie(COOKIE_DISMISSED, "1", COOKIE_MAX_AGE);
    setDismissed(true);
  }, []);

  const showQuestions = !companyStage && !rateSensitivity && !dismissed;

  return { companyStage, rateSensitivity, dismissed, showQuestions, setContext, dismissQuestions };
}

export const OperatorContextBanner = ({
  companyStage,
  rateSensitivity,
  showQuestions,
  setContext,
  dismissQuestions,
}: ReturnType<typeof useOperatorContext>) => {
  const [step, setStep] = useState<"stage" | "sensitivity">("stage");
  const [selectedStage, setSelectedStage] = useState<CompanyStage | null>(null);

  if (!showQuestions) return null;

  const handleStageSelect = (stage: CompanyStage) => {
    setSelectedStage(stage);
    setStep("sensitivity");
  };

  const handleSensitivitySelect = (sensitivity: RateSensitivity) => {
    if (selectedStage) {
      setContext(selectedStage, sensitivity);
    }
  };

  return (
    <div
      className="weather-panel mx-auto mb-4 max-w-2xl rounded-md border border-slate-700/60 bg-slate-900/90 p-5 shadow-xl"
      role="region"
      aria-label="Personalize your weekly brief"
      data-weather-first-run-orientation="true"
    >
      {step === "stage" ? (
        <>
          <h2 className="mb-1 text-base font-semibold text-slate-100">
            Tailor your weekly brief
          </h2>
          <p className="mb-4 text-sm text-slate-400">
            What stage is your company?
          </p>
          <div className="flex flex-wrap gap-2">
            {STAGE_KEYS.map((stage) => (
              <button
                key={stage}
                onClick={() => handleStageSelect(stage)}
                className="rounded-lg border border-slate-600/50 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-indigo-400/60 hover:bg-indigo-900/30 hover:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                {STAGE_LABELS[stage]}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <button
              onClick={dismissQuestions}
              className="text-xs text-slate-500 transition hover:text-slate-400"
            >
              Skip — show generic brief
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 className="mb-1 text-base font-semibold text-slate-100">
            One more thing
          </h2>
          <p className="mb-1 text-sm text-slate-400">
            How sensitive is your business to interest rates?
          </p>
          <p className="mb-4 text-xs text-slate-500">
            Stage: {selectedStage ? STAGE_SHORT[selectedStage] : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {RATE_KEYS.map((sensitivity) => (
              <button
                key={sensitivity}
                onClick={() => handleSensitivitySelect(sensitivity)}
                title={RATE_LABELS[sensitivity].detail}
                className="rounded-lg border border-slate-600/50 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-indigo-400/60 hover:bg-indigo-900/30 hover:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                {RATE_LABELS[sensitivity].label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => setStep("stage")}
              className="text-xs text-slate-500 transition hover:text-slate-400"
            >
              ← Back
            </button>
            <button
              onClick={dismissQuestions}
              className="text-xs text-slate-500 transition hover:text-slate-400"
            >
              Skip
            </button>
          </div>
        </>
      )}
    </div>
  );
};