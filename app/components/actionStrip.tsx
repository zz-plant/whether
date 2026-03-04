type ActionStripProps = {
  doItems: string[];
  dontItems: string[];
  fenceItems?: string[];
};

export function ActionStrip({ doItems, dontItems, fenceItems = [] }: ActionStripProps) {
  const renderActionItems = (items: string[], tone: "do" | "dont" | "fence") => {
    const toneIcon = tone === "do" ? "✓" : tone === "dont" ? "✕" : "◌";
    const toneDot = tone === "do"
      ? "bg-emerald-300"
      : tone === "dont"
        ? "bg-rose-300"
        : "bg-amber-300";

    return (
      <ul className="mt-3 space-y-2 text-sm text-slate-100">
        {items.map((item) => (
          <li key={item} className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-2">
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${toneDot}`} />
            <span aria-hidden="true" className="text-xs text-slate-300">{toneIcon}</span>
            <span>{item}</span>
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
      </header>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr,1fr,0.8fr]">
        <article className="rounded-xl border border-emerald-500/40 bg-slate-900/50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-200">Do</h3>
          {renderActionItems(doItems, "do")}
        </article>
        <article className="rounded-xl border border-rose-500/40 bg-slate-900/50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-rose-200">Don’t</h3>
          {renderActionItems(dontItems, "dont")}
        </article>
        {fenceItems.length > 0 ? (
          <article className="rounded-xl border border-amber-500/40 bg-slate-900/50 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-200">Fence</h3>
            {renderActionItems(fenceItems, "fence")}
          </article>
        ) : null}
      </div>
    </section>
  );
}
