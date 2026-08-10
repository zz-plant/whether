import { Users, DollarSign, Lock } from "lucide-react";
import type { SignalDirection } from "../viewModel";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";

type DecisionItem = {
  title: string;
  icon: typeof Users;
  verdict: "TIGHTEN" | "HOLD" | "EXPAND";
  recommendation: string;
  threshold: string;
  reversalCondition: string;
};

type ThreeWhethersProps = {
  signalDirection: SignalDirection;
  tightness: number;
  guardrail?: string;
};

// Displayed trigger/reversal chips read from these, so the stated bounds can never
// drift from the verdict logic below.
const TIGHTEN_AT = { hire: 55, spend: 65, commit: 75 } as const;
const EASE_BELOW = { hire: 35, spend: 45, commit: 55 } as const;

const VERDICT_COLORS: Record<"TIGHTEN" | "HOLD" | "EXPAND", string> = {
  TIGHTEN: "text-rose-400",
  HOLD: "text-amber-400",
  EXPAND: "text-emerald-400",
};

const VERDICT_BARS: Record<"TIGHTEN" | "HOLD" | "EXPAND", string> = {
  TIGHTEN: "bg-rose-400",
  HOLD: "bg-amber-400",
  EXPAND: "bg-emerald-400",
};

export function ThreeWhethersCard({
  signalDirection,
  tightness,
  guardrail,
}: ThreeWhethersProps) {
  const hiringIsTight = tightness >= TIGHTEN_AT.hire || signalDirection === "tighten";
  const hiringIsEasy = tightness < EASE_BELOW.hire && signalDirection !== "tighten";

  const spendingIsTight = tightness >= TIGHTEN_AT.spend || (signalDirection === "tighten" && tightness >= TIGHTEN_AT.hire);
  const spendingIsEasy = tightness < EASE_BELOW.spend && signalDirection !== "tighten";

  const committingIsTight = tightness >= TIGHTEN_AT.commit && signalDirection === "tighten";
  const committingIsEasy = tightness < EASE_BELOW.commit || signalDirection === "ease";

  const hireVerdict: "TIGHTEN" | "HOLD" | "EXPAND" = hiringIsTight ? "TIGHTEN" : hiringIsEasy ? "EXPAND" : "HOLD";
  const spendVerdict: "TIGHTEN" | "HOLD" | "EXPAND" = spendingIsTight ? "TIGHTEN" : spendingIsEasy ? "EXPAND" : "HOLD";
  const commitVerdict: "TIGHTEN" | "HOLD" | "EXPAND" = committingIsTight ? "TIGHTEN" : committingIsEasy ? "EXPAND" : "HOLD";

  const decisions: DecisionItem[] = [
    {
      title: "Whether to Hire",
      icon: Users,
      verdict: hireVerdict,
      recommendation: hiringIsTight
        ? "Freeze non-revenue hires; focus capacity on core revenue-generating engineering."
        : hiringIsEasy
        ? "Selectively accelerate key engineering & sales hires."
        : "Maintain existing headcount plan; replace critical backfills only.",
      threshold: `Tighten: cash availability ≥ ${TIGHTEN_AT.hire}`,
      reversalCondition: `Ease: cash availability drops below ${EASE_BELOW.hire}`,
    },
    {
      title: "Whether to Spend",
      icon: DollarSign,
      verdict: spendVerdict,
      recommendation: spendingIsTight
        ? "Cap paid acquisition payback at 6 months max; audit discretionary software spend."
        : spendingIsEasy
        ? "Allow paid payback up to 12 months for top-tier channels."
        : "Keep payback targets at 8-10 months; re-evaluate monthly.",
      threshold: `Tighten: cash availability ≥ ${TIGHTEN_AT.spend}`,
      reversalCondition: `Ease: cash availability drops below ${EASE_BELOW.spend}`,
    },
    {
      title: "Whether to Commit",
      icon: Lock,
      verdict: commitVerdict,
      recommendation: committingIsTight
        ? "Avoid multi-year vendor commitments; negotiate month-to-month or annual flex options."
        : committingIsEasy
        ? "Lock multi-year discounts on critical core infrastructure."
        : "Standard 1-year caps; require executive sign-off for >$50k ARR commitments.",
      threshold: guardrail ?? `Pause: cash availability ≥ ${TIGHTEN_AT.commit} and tightening`,
      reversalCondition: `Resume: cash availability drops below ${EASE_BELOW.commit} or easing`,
    },
  ];

  return (
    <section className="weather-section" aria-labelledby="three-whethers-heading">
      <h3 id="three-whethers-heading" className="type-section text-white">
        The 3 Operational &quot;Whethers&quot;
      </h3>

      <div className="grid gap-8 md:grid-cols-3">
        {decisions.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="relative pl-5 space-y-3">
              <div className={`absolute top-0 left-0 h-full w-0.5 ${VERDICT_BARS[item.verdict]}`} />
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-white/[0.04] text-slate-300">
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </div>
                <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                <span className={`ml-auto text-xs font-bold ${VERDICT_COLORS[item.verdict]}`}>
                  {item.verdict}
                </span>
              </div>

              <p className="text-sm text-white/70">{item.recommendation}</p>

              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <span className="font-medium text-white/50">{DECISION_CONTRACT_LABELS.threshold.pauseIf}:</span>
                  <code className="font-mono text-amber-200/80 text-xs">{item.threshold}</code>
                </div>
                <div className="flex gap-2">
                  <span className="font-medium text-white/50">{DECISION_CONTRACT_LABELS.reversal.clearsWhen}:</span>
                  <code className="font-mono text-rose-200/80 text-xs">{item.reversalCondition}</code>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
