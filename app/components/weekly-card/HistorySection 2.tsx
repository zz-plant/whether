import Link from "next/link";
import { sectionSpacing, tierOneHeading, tierOnePanel } from "./shared";
import type { HistorySectionProps } from "./types";

export function PostureHistoryTimeline({ historicalTimeline }: Pick<HistorySectionProps, "historicalTimeline">) {
  return (
    <ol className="mt-2 space-y-2" aria-label="Posture change timeline">
      {historicalTimeline.map((item, index) => {
        const isCurrent = item.isCurrent ?? index === historicalTimeline.length - 1;
        const href = item.month && item.year ? `/?month=${item.month}&year=${item.year}` : null;
        const previous = historicalTimeline[index - 1];
        const hasPostureShift = previous ? previous.posture !== item.posture : false;
        const shiftLabel = previous ? (hasPostureShift ? "Changed" : "Held") : "Start";
        const node = (
          <>
            <div className="absolute top-0 bottom-0 left-2.5 w-px bg-slate-700/70" aria-hidden="true" />
            <div className={`relative mt-1 h-3 w-3 rounded-full border ${isCurrent ? "border-sky-200 bg-sky-300" : "border-slate-500 bg-slate-700"}`} aria-hidden="true" />
            <div className="min-w-0 flex-1 rounded-lg border border-slate-700/60 bg-slate-950/65 px-2.5 py-2">
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-300">
                <span>{item.label}</span>
                <span className={`rounded-full border px-1.5 py-0.5 ${shiftLabel === "Changed" ? "border-amber-300/60 bg-amber-500/15 text-amber-100" : "border-slate-500/70 bg-slate-800/85 text-slate-300"}`}>{shiftLabel}</span>
                {isCurrent ? <span className="rounded-full border border-sky-300/50 bg-sky-500/20 px-1.5 py-0.5 text-sky-100">Current</span> : null}
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-100">{item.posture}</p><p className="text-[10px] text-slate-400">→ checkpoint</p>{item.recordDate && item.summary ? <p className="text-[10px] text-slate-400">{item.recordDate} • {item.summary}</p> : null}<span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-100 group-hover:block">{item.label}</span>
            </div>
          </>
        );

        return <li key={`${item.label}-${item.posture}-${index}`} className="relative">{href ? <Link href={href} prefetch={false} className="group relative flex min-h-[44px] items-start gap-2.5 rounded-lg pr-1 text-xs transition hover:bg-slate-900/35">{node}</Link> : <div className="relative flex min-h-[44px] items-start gap-2.5 pr-1 text-xs">{node}</div>}</li>;
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
