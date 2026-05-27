import type { OperatorContext } from "../../../lib/report/operatorContext";

type Props = {
  tightness: number;
  tightnessDelta: number;
  regime: string;
  postureLabel: string;
  signalDirection: "tighten" | "ease" | "hold";
  recordDate: string;
  fetchedAt: string;
  operatorContext: OperatorContext;
};

const DIRECTION_LABEL: Record<string, string> = {
  tighten: "Tightening",
  ease: "Easing",
  hold: "Holding",
};

const DIRECTION_COLOR: Record<string, string> = {
  tighten: "text-rose-300",
  ease: "text-emerald-300",
  hold: "text-slate-400",
};

const REGIME_DESCRIPTORS: Record<string, string> = {
  EXPANSION: "growth conditions",
  DEFENSIVE: "caution warranted",
  SCARCITY: "preserve runway",
  VOLATILE: "conditions shifting",
};

export function V2DecisionHero({
  tightness,
  tightnessDelta,
  regime,
  postureLabel,
  signalDirection,
  recordDate,
  fetchedAt,
  operatorContext,
}: Props) {
  const regimeDisplay = regime.charAt(0) + regime.slice(1).toLowerCase();
  const deltaSign = tightnessDelta > 0 ? "+" : tightnessDelta < 0 ? "" : "";
  const deltaLabel = tightnessDelta !== 0 ? `${deltaSign}${tightnessDelta.toFixed(1)} pts` : "unchanged";

  const stageLabel = operatorContext.companyStage
    ? operatorContext.companyStage === "pre-seed" ? "Pre-seed"
    : operatorContext.companyStage === "seed" ? "Seed"
    : operatorContext.companyStage === "series-a" ? "Series A"
    : operatorContext.companyStage === "series-b-plus" ? "Series B+"
    : "Public"
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-6 sm:gap-10">
        <div>
          <p className="font-display text-[clamp(4rem,12vw,6.5rem)] font-bold leading-none text-slate-50 tracking-tight tabular-nums">
            {tightness}
          </p>
          <p className="text-fluid-xs font-semibold tracking-[0.04em] text-slate-400">
            Credit conditions
          </p>
        </div>
        <div className="text-fluid-xs text-slate-500 space-y-0.5">
          <p>
            <span className={DIRECTION_COLOR[signalDirection]}>
              {DIRECTION_LABEL[signalDirection]}
            </span>
            {tightnessDelta !== 0 ? (
              <span className={`ml-1.5 ${DIRECTION_COLOR[signalDirection]}`}>{deltaLabel}</span>
            ) : null}
          </p>
          <p>{regimeDisplay} — {REGIME_DESCRIPTORS[regime] ?? ""} · {postureLabel}</p>
          {stageLabel ? <p>{stageLabel}</p> : null}
          <p className="text-slate-600">{recordDate}</p>
          {fetchedAt ? <p className="text-slate-600">Updated {fetchedAt}</p> : null}
        </div>
      </div>
    </div>
  );
}
