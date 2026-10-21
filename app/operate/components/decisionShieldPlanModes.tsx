"use client";

/**
 * The two freeform plan modes of the Decision Shield, lifted out of
 * `decisionShieldPanel.tsx`.
 *
 * That file sat at 790 of its 800-line budget, so the next edit to any part of
 * it would have failed the gate. These two blocks are the largest self-contained
 * pieces and neither touches the panel's presets, clipboard, or memory state —
 * they take the plan text and the verdicts already computed above them.
 *
 * Neither draws a box of its own: the plan page's step is the enclosure, and a
 * surface inside it put the verdict three frames deep and its sizing note four
 * (§XIII).
 */
import { useState } from "react";
import { OperatorProfileNumberField } from "../../components/operatorProfileFields";
import { publicDecisionLabels } from "../../../lib/report/reportFormatting";
import { isBusinessModel, type CompanyFinancialProfile, type PlanComparisonResult, type PlanStressTestResult } from "../../../lib/decisionShield";
import { resolveProfileRunway, resolveProfileRunwayMonths, type OperatorProfile, type ProfileRunway } from "../../../lib/operatorProfile";

type BusinessModel = NonNullable<CompanyFinancialProfile["businessModel"]>;

type PlanStressTestModeProps = {
  planText: string;
  setPlanText: (value: string) => void;
  planReady: boolean;
  profile: OperatorProfile;
  setProfileField: <K extends keyof OperatorProfile>(key: K, value: OperatorProfile[K] | undefined) => void;
  businessModel: BusinessModel;
  setBusinessModel: (value: BusinessModel) => void;
  stressTestResult: PlanStressTestResult;
};

/* Revenue that covers spending blanks the runway box, a typed figure included,
   so the box says why rather than looking unfilled. */
const runwayHint = (basis: ProfileRunway["basis"] | undefined): string | undefined => {
  if (basis === "cash") return "Worked out from your cash. Typing a figure replaces it.";
  if (basis === "cash-flow-positive") return "Revenue covers your spending, so no runway is counting down.";
  return undefined;
};

const STARTER_PLANS = [
  {
    label: "Vendor prepay vs. yield",
    plan: "Prepay annual SaaS vendor for $60k to lock in a 25% discount",
  },
  {
    label: "Senior talent sniping",
    plan: "Hire 1 principal architect at $240k during competitor freeze",
  },
  {
    label: "Sprint tech debt refactor",
    plan: "Allocate 40% sprint capacity to tech debt refactor",
  },
  {
    label: "Flexible contract terms",
    plan: "Shift enterprise renewals from $60k ARR commit to usage flex",
  },
] as const;

/* A control, not a stamp: these fill the box, so they take the 44px floor the
   other buttons on the page have (36px for a mouse, controls.css). They were
   20px chips. */
const EXAMPLE_BUTTON_CLASS = "weather-pill inline-flex items-center px-3 text-xs font-medium text-slate-200 hover:text-sky-100";

export function PlanStressTestMode({
  planText,
  setPlanText,
  planReady,
  profile,
  setProfileField,
  businessModel,
  setBusinessModel,
  stressTestResult,
}: PlanStressTestModeProps) {
  /* One field until it is used (2026-10-07). The step opened on the whole form —
     runway, spend, model, a three-line box and a verdict panel saying there was
     no verdict — which on a phone was everything a reader saw under the intro.
     The figures join once a plan has been typed and stay while it is edited,
     so clearing the box to retype does not take the reader's numbers away. */
  const [engaged, setEngaged] = useState(planReady);
  if (planReady && !engaged) setEngaged(true);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="decision-shield-plan-input" className="block text-fluid-xs text-slate-300">
          Plan description <span className="text-slate-400">· name the commitment and its size</span>
        </label>
        <textarea
          id="decision-shield-plan-input"
          value={planText}
          onChange={(e) => setPlanText(e.target.value)}
          rows={2}
          className="weather-input w-full p-3 text-xs text-slate-100 placeholder-slate-500"
          placeholder="e.g. We want to hire 4 engineers and sign a 2-year cloud commitment with AWS..."
        />
        <div className="flex flex-wrap items-center gap-2">
          {/* Its own line on a phone, so the four examples pair up in two rows
              instead of three. */}
          <span className="basis-full text-fluid-nano text-slate-400 sm:basis-auto">Try an example:</span>
          {STARTER_PLANS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setPlanText(item.plan)}
              className={EXAMPLE_BUTTON_CLASS}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {engaged ? (
        <div className="space-y-2">
          <p className="text-fluid-xs text-slate-400">
            Runway and monthly spend are optional; with both, the verdict is sized against the cash they imply, at
            spend less any revenue you entered on the runway planner.
          </p>
          <div className={`grid gap-3 sm:grid-cols-3 ${businessModel === "BOOTSTRAPPED" ? "lg:grid-cols-4" : ""}`}>
            {/* The runway every surface reads: worked out from cash where the
                runway planner has one, so this box and the test below agree. */}
            <OperatorProfileNumberField
              field="runwayMonths"
              label="Runway (months)"
              hint={runwayHint(resolveProfileRunway(profile)?.basis)}
              placeholder="e.g. 14"
              value={resolveProfileRunwayMonths(profile)}
              onCommit={(value) => setProfileField("runwayMonths", value)}
              optional
            />
            <OperatorProfileNumberField
              field="monthlyBurnUsd"
              label="Monthly spend"
              placeholder="$150k"
              value={profile.monthlyBurnUsd}
              onCommit={(value) => setProfileField("monthlyBurnUsd", value)}
              optional
            />
            {businessModel === "BOOTSTRAPPED" ? (
              <OperatorProfileNumberField
                field="grossMarginPct"
                label="Gross margin (%)"
                placeholder="e.g. 75"
                value={profile.grossMarginPct}
                onCommit={(value) => setProfileField("grossMarginPct", value)}
                optional
              />
            ) : null}
            <div>
              <label htmlFor="decision-shield-model" className="block text-fluid-nano text-slate-400">Model</label>
              <select
                id="decision-shield-model"
                value={businessModel}
                onChange={(event) => {
                  if (isBusinessModel(event.target.value)) {
                    setBusinessModel(event.target.value);
                  }
                }}
                className="weather-control mt-1"
              >
                <option value="VC_BACKED">VC-Backed</option>
                <option value="BOOTSTRAPPED">Bootstrapped</option>
              </select>
            </div>
          </div>
        </div>
      ) : null}

      {/* The verdict exists once there is a plan to grade; before that there is
          no panel at all, rather than one that says it is empty. The live region
          is always mounted so the verdict's arrival is announced. */}
      <div aria-live="polite">
        {planReady ? (
          <div className="rounded-lg border border-slate-800 bg-slate-950/90 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="type-label text-slate-400">Decision verdict</p>
                <div className="flex items-center gap-2 mt-1.5">
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
              </div>
              {stressTestResult.financialImpactSummary && (
                <span className="text-fluid-nano text-slate-400 tabular-nums">
                  {stressTestResult.financialImpactSummary}
                </span>
              )}
            </div>

            <p className="type-data text-slate-200 break-words font-medium">
              {stressTestResult.headline}
            </p>

            {stressTestResult.sizingNote ? (
              <div className="rounded border border-slate-800/80 bg-slate-900/60 p-2.5">
                <p className="type-eyebrow">Sizing</p>
                <p className="text-fluid-xs text-slate-300 mt-0.5">{stressTestResult.sizingNote}</p>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <p className="type-eyebrow">What this plan assumes</p>
              <ul className="space-y-1">
                {stressTestResult.fragileAssumptions.map((assumption, idx) => (
                  <li key={idx} className="text-fluid-xs text-amber-200/90 flex items-start gap-1.5">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{assumption}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-slate-800 pt-2.5 grid sm:grid-cols-3 gap-3">
              <div>
                <p className="type-eyebrow">{publicDecisionLabels.threshold}</p>
                <p className="text-fluid-xs text-slate-200 mt-0.5">{stressTestResult.boundedGuardrail}</p>
              </div>
              <div>
                <p className="type-eyebrow">A more reversible version</p>
                <p className="text-fluid-xs text-slate-200 mt-0.5">{stressTestResult.reversibleAlternative}</p>
              </div>
              <div>
                <p className="type-eyebrow">{publicDecisionLabels.reversal}</p>
                <p className="text-fluid-xs text-slate-300 mt-0.5">{stressTestResult.reversalTrigger}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type ComparePlansModeProps = {
  planText: string;
  setPlanText: (value: string) => void;
  planBText: string;
  setPlanBText: (value: string) => void;
  planReady: boolean;
  comparisonReady: boolean;
  comparisonResult: PlanComparisonResult;
};

const COMPARISON_TEMPLATES = [
  {
    label: "Vendor Prepay vs. Monthly Flex",
    planA: "Prepay annual SaaS vendor for $60k upfront to lock in 25% discount",
    planB: "Pay SaaS vendor $6k monthly on flexible rolling terms",
  },
  {
    label: "Full-Time Hire vs. Contractor",
    planA: "Hire 2 full-time senior engineers at $200k each",
    planB: "Engage 1 specialized contractor for 3 months at $15k/mo",
  },
  {
    label: "Speculative Feature vs. Tech Debt",
    planA: "Hire 3 engineers to build speculative enterprise feature",
    planB: "Allocate 40% sprint capacity to tech debt refactor",
  },
] as const;

export function ComparePlansMode({
  planText,
  setPlanText,
  planBText,
  setPlanBText,
  planReady,
  comparisonReady,
  comparisonResult,
}: ComparePlansModeProps) {
  const anyPlan = planReady || planBText.trim().length > 0;
  return (
          <div className="space-y-4">
            {/* No heading: the mode switch directly above already reads "Compare two plans". */}
            <div>
              <p className="text-fluid-xs text-slate-400">
                Describe two plans. The one that holds up better in this week&apos;s conditions is named below.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="basis-full text-fluid-nano text-slate-400 sm:basis-auto">Compare common tradeoffs:</span>
                {COMPARISON_TEMPLATES.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setPlanText(item.planA);
                      setPlanBText(item.planB);
                    }}
                    className={EXAMPLE_BUTTON_CLASS}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300" htmlFor="decision-shield-plan-a">Plan A</label>
                <textarea
                  id="decision-shield-plan-a"
                  value={planText}
                  onChange={(e) => setPlanText(e.target.value)}
                  rows={3}
                  placeholder="e.g. Hire 3 senior engineers @ $180k and sign a 2-year cloud reservation"
                  className="weather-input w-full p-2.5 text-xs text-slate-100"
                />
                {planReady ? (
                <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-lg">
                  <span className={`px-2 py-0.5 text-fluid-nano font-bold rounded ${
                    comparisonResult.planA.verdict === "SAFE"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : comparisonResult.planA.verdict === "RISKY"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-rose-500/20 text-rose-300"
                  }`}>
                    Verdict: {comparisonResult.planA.verdict}
                  </span>
                  <p className="text-fluid-xs text-slate-300 mt-1.5">{comparisonResult.planA.reversibleAlternative}</p>
                </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300" htmlFor="decision-shield-plan-b">Plan B</label>
                <textarea
                  id="decision-shield-plan-b"
                  value={planBText}
                  onChange={(e) => setPlanBText(e.target.value)}
                  rows={3}
                  placeholder="e.g. Hire 2 contractors for 6 months on milestones and use monthly rolling compute"
                  className="weather-input w-full p-2.5 text-xs text-slate-100"
                />
                {planBText.trim() ? (
                <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-lg">
                  <span className={`px-2 py-0.5 text-fluid-nano font-bold rounded ${
                    comparisonResult.planB.verdict === "SAFE"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : comparisonResult.planB.verdict === "RISKY"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-rose-500/20 text-rose-300"
                  }`}>
                    Verdict: {comparisonResult.planB.verdict}
                  </span>
                  <p className="text-fluid-xs text-slate-300 mt-1.5">{comparisonResult.planB.reversibleAlternative}</p>
                </div>
                ) : null}
              </div>
            </div>

            {/* Nothing until a plan is typed: an empty mode drew a box asking for
                both plans, under two boxes already asking for them. */}
            <div aria-live="polite">
              {anyPlan ? (
                <div className="p-3.5 bg-slate-900/40 border border-slate-700/70 rounded-lg flex items-center justify-between">
                  <span className="text-fluid-xs text-slate-100 font-semibold">
                    {comparisonReady
                      ? `Recommendation: ${comparisonResult.comparativeRecommendation}`
                      : "Describe both plans to compare them."}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
  );
}
