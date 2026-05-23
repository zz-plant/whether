"use client";

type AnswerProps = {
  tightness: number;
  prevTightness?: number;
  pauseThreshold?: number;
  flipThreshold?: number;
  confidenceLabel?: string;
  reliabilityScore?: number;
  postureLabel?: string;
  weeksInPosture?: number;
};

export function TheAnswer({
  tightness,
  prevTightness,
  pauseThreshold = 80,
  flipThreshold = 65,
  confidenceLabel,
  reliabilityScore,
  postureLabel,
  weeksInPosture,
}: AnswerProps) {
  const delta = prevTightness != null ? tightness - prevTightness : 0;
  const ptsToPause = pauseThreshold - tightness;
  const ptsToFlip = tightness - flipThreshold;

  const isTriggered = ptsToPause <= 0;
  const isClose = ptsToPause <= 3 && ptsToPause > 0;
  const isFlipped = ptsToFlip <= 0;
  const isStable = Math.abs(delta) <= 1 && !isTriggered && !isClose;

  let headline: string;
  let subtext: string;
  let tone: "stable" | "approaching" | "triggered" | "easing";

  if (isTriggered) {
    headline = "Pause hiring.";
    subtext = `Tightness crossed ${pauseThreshold}. The framework says pause. Stage irreversible decisions until the next read.`;
    tone = "triggered";
  } else if (isFlipped) {
    headline = "Conditions are easing.";
    subtext = `Tightness dropped below ${flipThreshold}. The framework says you can expand. Revisit paused decisions.`;
    tone = "easing";
  } else if (isClose) {
    headline = `You're ${ptsToPause} point${ptsToPause === 1 ? "" : "s"} from the pause line.`;
    subtext = `Tightness is ${tightness}. Stage all new commitments as reversible. If it crosses ${pauseThreshold}, pause hiring.`;
    tone = "approaching";
  } else if (isStable) {
    headline = "Nothing has changed this week.";
    subtext = `Continue ${postureLabel?.toLowerCase() ?? "holding"}. You're ${ptsToPause} points from the pause line${weeksInPosture ? ` — this has been the call for ${weeksInPosture} week${weeksInPosture === 1 ? "" : "s"}` : ""}.`;
    tone = "stable";
  } else if (delta > 1) {
    headline = "Conditions are tightening.";
    subtext = `Tightness increased ${delta.toFixed(0)} point${delta > 2 ? "s" : ""} to ${tightness}. No action needed yet — you're ${ptsToPause} points from the pause line.`;
    tone = "approaching";
  } else {
    headline = "Conditions are easing slightly.";
    subtext = `Tightness decreased ${Math.abs(delta).toFixed(0)} point${Math.abs(delta) > 2 ? "s" : ""} to ${tightness}. No action needed — continue ${postureLabel?.toLowerCase() ?? "holding"}.`;
    tone = "easing";
  }

  const toneClasses = {
    stable: "border-emerald-500/20 bg-emerald-500/5",
    approaching: "border-amber-500/20 bg-amber-500/5",
    triggered: "border-rose-500/20 bg-rose-500/5",
    easing: "border-sky-500/20 bg-sky-500/5",
  };

  const headlineColor = {
    stable: "text-emerald-100",
    approaching: "text-amber-100",
    triggered: "text-rose-100",
    easing: "text-sky-100",
  };

  return (
    <div className={`rounded-xl border px-5 py-4 ${toneClasses[tone]}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className={`text-lg font-bold ${headlineColor[tone]}`}>{headline}</p>
          <p className="mt-1 text-sm text-slate-300 leading-relaxed">{subtext}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-2xl font-bold tabular-nums text-slate-100">{tightness}</p>
          <p className="text-fluid-micro text-slate-500">tightness</p>
          {reliabilityScore != null ? (
            <p className={`text-fluid-micro mt-0.5 ${
              reliabilityScore >= 80 ? "text-emerald-300" :
              reliabilityScore >= 60 ? "text-amber-300" : "text-rose-300"
            }`}>
              {reliabilityScore}% reliable
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 text-fluid-micro">
        {confidenceLabel ? (
          <span className={`rounded-full px-2 py-0.5 font-semibold uppercase ${
            confidenceLabel === "HIGH" ? "bg-emerald-500/15 text-emerald-200" :
            confidenceLabel === "MED" ? "bg-amber-500/15 text-amber-200" :
            "bg-rose-500/15 text-rose-200"
          }`}>
            {confidenceLabel} confidence
          </span>
        ) : null}
        <span className={`h-1.5 flex-1 rounded-full bg-slate-800 overflow-hidden`}>
          <span className={`block h-full rounded-full transition-all ${
            tone === "triggered" ? "bg-rose-500" :
            tone === "approaching" ? "bg-amber-500" :
            tone === "easing" ? "bg-sky-500" :
            "bg-emerald-500"
          }`} style={{ width: `${Math.min(100, Math.max(5, ((tightness - 20) / 65) * 100))}%` }} />
        </span>
        <span className="text-slate-600">{pauseThreshold} pause</span>
      </div>
    </div>
  );
}
