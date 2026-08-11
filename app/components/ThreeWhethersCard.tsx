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
  TIGHTEN: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  HOLD: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  EXPAND: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
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

  const decisions: (DecisionItem & { category: string })[] = [
    {
      title: "Whether to Hire",
      category: "REV CAPACITIES",
      icon: Users,
      verdict: hireVerdict,
      recommendation: hiringIsTight
        ? "Freeze non-revenue hires; focus capacity on core revenue-generating engineering."
        : hiringIsEasy
        ? "Selectively accelerate key engineering & sales hires."
        : "Maintain existing headcount plan; replace critical backfills only.",
      threshold: `Cash availability ≥ ${TIGHTEN_AT.hire}`,
      reversalCondition: `Cash availability drops below ${EASE_BELOW.hire}`,
    },
    {
      title: "Whether to Spend",
      category: "CAPITAL ALLOCATION",
      icon: DollarSign,
      verdict: spendVerdict,
      recommendation: spendingIsTight
        ? "Cap paid acquisition payback at 6 months max; audit discretionary software spend."
        : spendingIsEasy
        ? "Allow paid payback up to 12 months for top-tier channels."
        : "Keep payback targets at 8-10 months; re-evaluate monthly.",
      threshold: `Cash availability ≥ ${TIGHTEN_AT.spend}`,
      reversalCondition: `Cash availability drops below ${EASE_BELOW.spend}`,
    },
    {
      title: "Whether to Commit",
      category: "CONTRACT COMMITMENTS",
      icon: Lock,
      verdict: commitVerdict,
      recommendation: committingIsTight
        ? "Avoid multi-year vendor commitments; negotiate month-to-month or annual flex options."
        : committingIsEasy
        ? "Lock multi-year discounts on critical core infrastructure."
        : "Standard 1-year caps; require executive sign-off for >$50k ARR commitments.",
      threshold: guardrail ?? `Cash availability ≥ ${TIGHTEN_AT.commit} and tightening`,
      reversalCondition: `Cash availability drops below ${EASE_BELOW.commit} or easing`,
    },
  ];

  return (
    <section className="weather-section" aria-labelledby="three-whethers-heading">
      <div className="flex items-center justify-between mb-4">
        <h3 id="three-whethers-heading" className="type-section text-white font-semibold tracking-tight">
          The 3 Operational &ldquo;Whethers&rdquo;
        </h3>
        <span className="text-fluid-nano font-mono text-slate-400 uppercase tracking-wider">
          Bounded Rules
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {decisions.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              className="relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-lg backdrop-blur-md hover:border-slate-700/80 transition-all duration-200 flex flex-col justify-between space-y-3"
            >
              <div className={`absolute top-0 left-0 h-full w-1 ${VERDICT_BARS[item.verdict]}`} />
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sky-400 shadow-inner">
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-slate-400">{item.category}</span>
                      <h4 className="text-sm font-semibold text-white tracking-tight">{item.title}</h4>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-fluid-micro font-mono font-bold tracking-wide border ${VERDICT_COLORS[item.verdict]}`}>
                    {item.verdict}
                  </span>
                </div>

                <p className="text-fluid-xs text-slate-200 leading-relaxed font-normal">{item.recommendation}</p>
              </div>

              <dl className="pt-2.5 border-t border-slate-800/60 space-y-1.5 text-fluid-nano text-slate-300">
                <div className="flex items-start gap-2">
                  <dt className="font-semibold text-slate-400 shrink-0">{DECISION_CONTRACT_LABELS.threshold.pauseIf}:</dt>
                  <dd><code className="font-mono text-amber-300/90 break-words">{item.threshold}</code></dd>
                </div>
                <div className="flex items-start gap-2">
                  <dt className="font-semibold text-slate-400 shrink-0">{DECISION_CONTRACT_LABELS.reversal.clearsWhen}:</dt>
                  <dd><code className="font-mono text-rose-300/90 break-words">{item.reversalCondition}</code></dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}
