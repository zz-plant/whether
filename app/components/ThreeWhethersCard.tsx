"use client";

import { Users, DollarSign, Lock, ArrowUpRight, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import type { SignalDirection } from "../viewModel";

import { ShareBriefButton } from "./shareBriefButton";

type DecisionItem = {
  title: string;
  icon: typeof Users;
  question: string;
  verdict: "TIGHTEN" | "HOLD" | "EXPAND";
  recommendation: string;
  threshold: string;
  reversalCondition: string;
};

type ThreeWhethersProps = {
  regime: string;
  signalDirection: SignalDirection;
  tightness: number;
  boldnessScore: number;
  actionNow?: string;
  guardrail?: string;
};

export function ThreeWhethersCard({
  regime,
  signalDirection,
  tightness,
  boldnessScore,
  actionNow,
  guardrail,
}: ThreeWhethersProps) {
  const hiringIsTight = tightness >= 55 || signalDirection === "tighten";
  const hiringIsEasy = tightness < 35 && signalDirection !== "tighten";

  const spendingIsTight = tightness >= 65 || (signalDirection === "tighten" && tightness >= 55);
  const spendingIsEasy = tightness < 45 && signalDirection !== "tighten";

  const committingIsTight = tightness >= 75 && signalDirection === "tighten";
  const committingIsEasy = tightness < 55 || signalDirection === "ease";

  const hireVerdict: "TIGHTEN" | "HOLD" | "EXPAND" = hiringIsTight ? "TIGHTEN" : hiringIsEasy ? "EXPAND" : "HOLD";
  const spendVerdict: "TIGHTEN" | "HOLD" | "EXPAND" = spendingIsTight ? "TIGHTEN" : spendingIsEasy ? "EXPAND" : "HOLD";
  const commitVerdict: "TIGHTEN" | "HOLD" | "EXPAND" = committingIsTight ? "TIGHTEN" : committingIsEasy ? "EXPAND" : "HOLD";

  const decisions: DecisionItem[] = [
    {
      title: "Whether to Hire",
      icon: Users,
      question: "Should headcount & engineering capacity expand?",
      verdict: hireVerdict,
      recommendation: hiringIsTight
        ? "Freeze non-revenue hires; focus capacity on core revenue-generating engineering."
        : hiringIsEasy
        ? "Selectively accelerate key engineering & sales hires."
        : "Maintain existing headcount plan; replace critical backfills only.",
      threshold: `Tightness ${tightness}/100`,
      reversalCondition: `Hiring: tightness below 35 and easing trend`,
    },
    {
      title: "Whether to Spend",
      icon: DollarSign,
      question: "Should marketing & CAC payback periods loosen?",
      verdict: spendVerdict,
      recommendation: spendingIsTight
        ? "Cap paid acquisition payback at 6 months max; audit discretionary software spend."
        : spendingIsEasy
        ? "Allow paid payback up to 12 months for top-tier channels."
        : "Keep payback targets at 8-10 months; re-evaluate monthly.",
      threshold: `Capital tightness at ${tightness}/100`,
      reversalCondition: `Spend: tightness below 45 and cooling inflation`,
    },
    {
      title: "Whether to Commit",
      icon: Lock,
      question: "Should long-term vendor contracts & capital be locked?",
      verdict: commitVerdict,
      recommendation: committingIsTight
        ? "Avoid multi-year vendor commitments; negotiate month-to-month or annual flex options."
        : committingIsEasy
        ? "Lock multi-year discounts on critical core infrastructure."
        : "Standard 1-year caps; require executive sign-off for >$50k ARR commitments.",
      threshold: guardrail ?? `Pause if tightness exceeds ${tightness + 5}`,
      reversalCondition: `Commit: tightness below 55 and risk appetite above 60`,
    },
  ];

  const getBadgeStyle = (verdict: "TIGHTEN" | "HOLD" | "EXPAND") => {
    switch (verdict) {
      case "TIGHTEN":
        return "bg-rose-500/10 border-rose-500/30 text-rose-300";
      case "EXPAND":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-300";
      case "HOLD":
        return "bg-amber-500/10 border-amber-500/30 text-amber-300";
    }
  };

  const briefText = actionNow ?? `${regime} regime: tightness ${tightness}/100, boldness budget ${boldnessScore}/100. ${hireVerdict === "TIGHTEN" ? "Hold headcount, tighten spend, avoid commitments." : hireVerdict === "EXPAND" ? "Consider expanding headcount and commitments." : "Maintain planned operational tempo."}`;

  return (
    <section className="space-y-4" aria-labelledby="three-whethers-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-fluid-nano font-semibold uppercase tracking-[0.12em] text-emerald-400">
            Bounded Operating Rules
          </p>
          <h3 id="three-whethers-heading" className="text-xl font-semibold text-white tracking-tight">
            The 3 Operational &quot;Whethers&quot;
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-fluid-xs text-white/50">
            Weekly posture breakdown for operators
          </span>
          <ShareBriefButton text={briefText} showLabel />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {decisions.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              className="weather-card flex flex-col justify-between p-5 space-y-4 relative overflow-hidden group hover:border-white/[0.14] transition-all duration-300"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-200">
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-fluid-nano font-bold uppercase tracking-wider ${getBadgeStyle(
                      item.verdict
                    )}`}
                  >
                    {item.verdict}
                  </span>
                </div>

                <p className="text-fluid-xs text-white/65 font-medium leading-relaxed">
                  {item.question}
                </p>

                <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-3 text-fluid-xs text-slate-100 leading-normal space-y-1">
                  <p className="font-semibold text-emerald-300/90 text-fluid-micro uppercase tracking-wider">
                    Operating Rule
                  </p>
                  <p>{item.recommendation}</p>
                </div>
              </div>

              <div className="border-t border-white/[0.06] pt-3 space-y-2 text-fluid-nano text-white/65">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-amber-300/80">Trigger:</span>
                  <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-mono text-amber-200/90">{item.threshold}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-rose-300/80">Reversal:</span>
                  <span className="rounded border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 font-mono text-rose-200/90 truncate max-w-[170px]" title={item.reversalCondition}>
                    {item.reversalCondition}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
