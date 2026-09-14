import type { ReactNode } from "react";

type SectionSignpostProps = {
  index: string;
  id: string;
  headingId: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function SectionSignpost({
  index,
  id,
  headingId,
  title,
  description,
  action,
}: SectionSignpostProps) {
  return (
    <div className="relative pt-6 sm:pt-8 mb-4 sm:mb-5">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center rounded-sm border border-slate-800 bg-slate-900/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-400 tabular-nums">
            {index}
          </span>
          <h2
            id={headingId}
            className="text-fluid-base font-semibold tracking-[-0.01em] text-slate-100 flex items-center gap-1.5"
          >
            <span>{title}</span>
            <a
              href={`#${id}`}
              aria-label={`Link to section: ${title}`}
              className="weather-section-anchor inline-flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-md text-sm font-normal text-slate-600 no-underline transition-colors hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            >
              <span aria-hidden="true">#</span>
            </a>
          </h2>
        </div>
        {action ? <div className="mt-1 sm:mt-0">{action}</div> : null}
      </div>
      {description ? (
        <p className="mt-1 max-w-2xl text-fluid-xs text-slate-400 leading-relaxed">
          {description}
        </p>
      ) : null}
    </div>
  );
}
