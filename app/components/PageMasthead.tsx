type PageMastheadProps = {
  page: string;
  summary: string;
  recordDate?: string;
};

export function PageMasthead({ page, summary, recordDate }: PageMastheadProps) {
  return (
    <div className="text-center space-y-3 py-4">
      <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3.5 py-1 shadow-[0_0_12px_rgba(56,189,248,0.15)]">
        <span className="size-1.5 rounded-full bg-sky-400 animate-pulse" aria-hidden="true" />
        <span className="text-fluid-nano font-mono font-semibold uppercase tracking-wider text-sky-200">
          Whether · {page}{recordDate ? ` · ${recordDate}` : ""}
        </span>
      </div>
      <h2 className="text-fluid-lg sm:text-fluid-xl font-semibold text-white leading-snug max-w-2xl mx-auto">
        {summary}
      </h2>
    </div>
  );
}
