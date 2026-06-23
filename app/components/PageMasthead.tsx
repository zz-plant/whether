type PageMastheadProps = {
  page: string;
  summary: string;
  recordDate?: string;
};

export function PageMasthead({ page, summary, recordDate }: PageMastheadProps) {
  return (
    <div className="text-center space-y-3 py-4">
      <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] sm:tracking-[0.2em] text-slate-400">
        Whether · {page}{recordDate ? ` · ${recordDate}` : ""}
      </p>
      <h2 className="text-fluid-lg sm:text-fluid-xl font-semibold text-slate-100 leading-snug max-w-2xl mx-auto font-display">
        {summary}
      </h2>
    </div>
  );
}
