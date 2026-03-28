import Link from "next/link";
import { sectionSpacing, tierOneHeading, tierOnePanel } from "./shared";
import type { HistorySectionProps } from "./types";

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
          <div className={`rounded-xl border px-3 py-3 ${isCurrent ? "border-sky-400/35 bg-sky-500/10" : "border-slate-700/70 bg-slate-950/65"}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">{item.label}</p>
              <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                isCurrent
                  ? "border-sky-300/50 bg-sky-500/20 text-sky-100"
                  : hasPostureShift
                    ? "border-amber-300/60 bg-amber-500/15 text-amber-100"
                    : "border-slate-500/70 bg-slate-800/85 text-slate-300"
              }`}>
                {isCurrent ? "Current" : shiftLabel}
              </span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-slate-800/85">
              <div className={`h-1.5 rounded-full ${isCurrent ? "bg-sky-300" : hasPostureShift ? "bg-amber-300" : "bg-slate-500"}`} style={{ width: `${Math.max(24, ((index + 1) / historicalTimeline.length) * 100)}%` }} />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-100">{item.posture}</p>
            {item.recordDate && item.summary ? <p className="mt-1 text-[11px] leading-5 text-slate-300">{item.recordDate} · {item.summary}</p> : null}
          </div>
        );

        return (
          <li key={`${item.label}-${item.posture}-${index}`}>
            {href ? (
              <Link href={href} prefetch={false} className="block min-h-[44px] rounded-xl transition hover:bg-slate-900/30">
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
  return (
    <article className={`${tierOnePanel} ${sectionSpacing}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={tierOneHeading}>{title}</h2>
        <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400">{subtitle}</p>
      </div>
      <PostureHistoryTimeline historicalTimeline={historicalTimeline} />
    </article>
  );
}
