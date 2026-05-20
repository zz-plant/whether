type LoadingStageState = "active" | "next" | "queued";

type LoadingStageItem = {
  label: string;
  hint: string;
  state?: LoadingStageState;
};

  const stageStateLabel: Record<LoadingStageState, string> = {
    active: "Loading",
    next: "Pending",
    queued: "Queued",
  };

export function LoadingStageRail({
  title = "Load sequence",
  items,
}: {
  title?: string;
  items: LoadingStageItem[];
}) {
  return (
    <section aria-label={title} className="space-y-2.5">
      <p className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</p>
      <div className="weather-loading-stage-rail" role="list">
        {items.map(({ label, hint, state = "queued" }) => (
          <article key={label} role="listitem" className="weather-loading-stage" data-state={state}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-100">{label}</p>
                <p className="text-sm leading-relaxed text-slate-300">{hint}</p>
              </div>
              <span className="weather-loading-stage__badge">{stageStateLabel[state]}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
