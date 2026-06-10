import Link from "next/link";
import { sectionSpacing, tierOneHeading, tierOnePanel } from "./shared";
import type { HistorySectionProps } from "./types";

const buildHistoryStreaks = (historicalTimeline: HistorySectionProps["historicalTimeline"]) => {
  if (historicalTimeline.length === 0) {
    return { currentStreak: 0, shiftCount: 0 };
  }

  const latestPosture = historicalTimeline[historicalTimeline.length - 1]?.posture;
  let currentStreak = 0;
  for (let index = historicalTimeline.length - 1; index >= 0; index -= 1) {
    if (historicalTimeline[index]?.posture !== latestPosture) {
      break;
    }
    currentStreak += 1;
  }

  let shiftCount = 0;
  for (let index = 1; index < historicalTimeline.length; index += 1) {
    if (historicalTimeline[index - 1]?.posture !== historicalTimeline[index]?.posture) {
      shiftCount += 1;
    }
  }

  return { currentStreak, shiftCount };
};

export function PostureHistoryTimeline({ historicalTimeline }: Pick<HistorySectionProps, "historicalTimeline">) {
  return (
    <ol className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Posture change timeline">
      {historicalTimeline.map((item, index) => {
        const isCurrent = item.isCurrent ?? index === historicalTimeline.length - 1;
        const href = item.month && item.year ? `/?month=${item.month}&year=${item.year}` : null;
        const previous = historicalTimeline[index - 1];
        const hasPostureShift = previous ? previous.posture !== item.posture : false;
        const shiftLabel = previous ? (hasPostureShift ? "Shifted" : "Held") : "Start";
        const card = (
          <div className={`rounded-md border px-3 py-3 ${isCurrent ? "border-sky-400/35 bg-sky-500/10" : "border-slate-700/70 bg-slate-950/65"}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-300">{item.label}</p>
              <span className={`rounded-full border px-1.5 py-0.5 text-fluid-micro font-semibold uppercase tracking-[0.08em] ${
                isCurrent
                  ? "border-sky-300/50 bg-sky-500/20 text-sky-100"
                  : hasPostureShift
                    ? "border-amber-300/60 bg-amber-500/15 text-amber-100"
                    : "border-slate-500/70 bg-slate-800/85 text-slate-300"
              }`}>
                {isCurrent ? "Current" : shiftLabel}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isCurrent
                    ? "bg-sky-300"
                    : hasPostureShift
                      ? "bg-amber-300"
                      : "bg-slate-500"
                }`}
                aria-hidden="true"
              />
              <span>
                {previous
                  ? hasPostureShift
                    ? "Posture shifted here"
                    : "Posture held here"
                  : "Sequence start"}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-100">{item.posture}</p>
            {item.recordDate && item.summary ? <p className="mt-1 text-fluid-xs leading-5 text-slate-300">{item.recordDate} · {item.summary}</p> : null}
          </div>
        );

        return (
          <li key={`${item.label}-${item.posture}-${index}`}>
            {href ? (
              <Link href={href} className="block min-h-[44px] rounded-md transition hover:bg-slate-900/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">
                {card}
              </Link>
            ) : (
              card
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function HistorySection({ historicalTimeline, title = "Regime history (recent)", subtitle = "Last 2 checkpoints" }: HistorySectionProps) {
  const { currentStreak, shiftCount } = buildHistoryStreaks(historicalTimeline);
  const driftLabel = shiftCount >= 3 ? "High drift" : shiftCount >= 1 ? "Active drift" : "Settling";
  const driftPercent = historicalTimeline.length <= 1 ? 18 : Math.max(18, Math.min(100, (shiftCount / (historicalTimeline.length - 1)) * 100));

  return (
    <article className={`${tierOnePanel} ${sectionSpacing}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className={tierOneHeading}>{title}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5 text-fluid-micro font-semibold uppercase tracking-[0.1em]">
            <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2 py-0.5 text-slate-300">{subtitle}</span>
            <span className="rounded-full border border-sky-400/25 bg-sky-500/8 px-2 py-0.5 text-sky-100">
              {currentStreak > 1 ? `${currentStreak} straight in current posture` : "Fresh posture read"}
            </span>
            <span className="rounded-full border border-amber-400/25 bg-amber-500/8 px-2 py-0.5 text-amber-100">
              {shiftCount === 0 ? "No recent shifts" : `${shiftCount} shift${shiftCount > 1 ? "s" : ""} in window`}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-md border border-slate-700/70 bg-slate-950/60 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400">Drift strip</p>
          <span className="text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-300">{driftLabel}</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-800/90">
          <div className="h-2 rounded-full bg-gradient-to-r from-emerald-300 via-amber-300 to-rose-300" style={{ width: `${driftPercent}%` }} />
        </div>
        <p className="mt-2 text-fluid-xs leading-5 text-slate-400">
          {shiftCount === 0
            ? "No recent posture shifts in the current window, which suggests the call is settling."
            : `${shiftCount} recent posture shift${shiftCount > 1 ? "s" : ""} in this window. Higher drift means weaker continuity and less implicit stability.`}
        </p>
      </div>
      <PostureHistoryTimeline historicalTimeline={historicalTimeline} />
    </article>
  );
}
