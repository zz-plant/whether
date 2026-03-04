type ActionStripProps = {
  doItems: string[];
  dontItems: string[];
  fenceItems?: string[];
};

export function ActionStrip({ doItems, dontItems, fenceItems = [] }: ActionStripProps) {
  const toneSummary = {
    do: { icon: "✓", dot: "bg-emerald-300", label: "Lean in", labelTone: "bg-emerald-500/15 text-emerald-100" },
    dont: { icon: "✕", dot: "bg-rose-300", label: "Pull back", labelTone: "bg-rose-500/15 text-rose-100" },
    fence: { icon: "◌", dot: "bg-amber-300", label: "Use judgment", labelTone: "bg-amber-500/15 text-amber-100" },
  } as const;

  const renderActionItems = (items: string[], tone: "do" | "dont" | "fence") => {
    const { icon, dot } = toneSummary[tone];

    return (
      <ul className="mt-3 space-y-2 text-sm text-slate-100">
        {items.map((item) => (
          <li key={item} className="flex min-h-[44px] items-start gap-2 rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-2.5">
            <span aria-hidden="true" className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-xs text-slate-300">{icon}</span>
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <section id="action-strip" aria-labelledby="action-strip-title" className="weather-panel space-y-4 px-5 py-5 sm:px-7">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Operator strip</p>
        <h2 id="action-strip-title" className="mt-1 text-xl font-semibold text-slate-50">Do / Don’t this week</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">Make this week’s trade-offs explicit so teams move with fewer second guesses.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr,1fr,0.8fr]">
        <article className="rounded-xl border border-emerald-500/40 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-200">Do</h3>
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${toneSummary.do.labelTone}`}>{toneSummary.do.label} · {doItems.length}</span>
          </div>
          {renderActionItems(doItems, "do")}
        </article>
        <article className="rounded-xl border border-rose-500/40 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-rose-200">Don’t</h3>
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${toneSummary.dont.labelTone}`}>{toneSummary.dont.label} · {dontItems.length}</span>
          </div>
          {renderActionItems(dontItems, "dont")}
        </article>
        {fenceItems.length > 0 ? (
          <article className="rounded-xl border border-amber-500/40 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-200">Fence</h3>
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${toneSummary.fence.labelTone}`}>{toneSummary.fence.label} · {fenceItems.length}</span>
            </div>
            {renderActionItems(fenceItems, "fence")}
          </article>
        ) : null}
      </div>
    </section>
  );
}
