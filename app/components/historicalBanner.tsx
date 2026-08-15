import Link from "next/link";
import { ArrowRightIcon } from "./uiIcons";

export const HistoricalBanner = ({
  banner,
  liveHref,
  previousHref,
  timeMachineHref,
}: {
  banner: string;
  liveHref?: string;
  previousHref?: string;
  timeMachineHref?: string;
}) => {
  const backwardHref = previousHref ?? timeMachineHref;

  return (
    <div className="mt-6 rounded-lg border border-slate-600 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="type-label text-slate-400">Viewing past data</span>
        <div className="flex flex-wrap gap-2">
          {backwardHref ? (
            <Link
              href={backwardHref}
              className="inline-flex min-h-[44px] items-center rounded-full border border-cyan-400/60 bg-cyan-500/10 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-cyan-100 transition hover:border-cyan-300 hover:text-cyan-50"
            >
              <ArrowRightIcon className="mr-1 h-3.5 w-3.5 rotate-180" aria-hidden="true" />View older snapshot
            </Link>
          ) : null}
          {timeMachineHref ? (
            <Link
              href={timeMachineHref}
              className="inline-flex min-h-[44px] items-center rounded-full border border-slate-500/70 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-slate-100 transition hover:border-slate-300/80 hover:text-white"
            >
              <ArrowRightIcon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />Choose another date
            </Link>
          ) : null}
          {liveHref ? (
            <Link
              href={liveHref}
              className="inline-flex min-h-[44px] items-center rounded-full border border-slate-500/70 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-slate-100 transition hover:border-slate-300/80 hover:text-white"
            >
              <ArrowRightIcon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />Back to live brief
            </Link>
          ) : null}
        </div>
      </div>
      <p className="mt-1 font-semibold text-slate-100">{banner}</p>
      <p className="mt-2 text-xs text-slate-400">
        You are viewing archived Treasury data, so live signals are hidden for now.
        {previousHref
          ? " Use “View older snapshot” to step to an earlier month."
          : " Use “View older snapshot” to open Time Machine and pick an earlier month."}
      </p>
    </div>
  );
};
