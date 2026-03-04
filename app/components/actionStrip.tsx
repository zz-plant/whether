type ActionStripProps = {
  doItems: string[];
  dontItems: string[];
  fenceItems?: string[];
};

export function ActionStrip({ doItems, dontItems, fenceItems = [] }: ActionStripProps) {
  return (
    <section id="action-strip" aria-labelledby="action-strip-title" className="weather-panel space-y-4 px-5 py-5 sm:px-7">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Operator strip</p>
        <h2 id="action-strip-title" className="mt-1 text-xl font-semibold text-slate-50">Do / Don’t this week</h2>
      </header>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr,1fr,0.8fr]">
        <article className="rounded-xl border border-emerald-500/40 bg-slate-900/50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-200">Do</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-100">
            {doItems.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </article>
        <article className="rounded-xl border border-rose-500/40 bg-slate-900/50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-rose-200">Don’t</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-100">
            {dontItems.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </article>
        {fenceItems.length > 0 ? (
          <article className="rounded-xl border border-amber-500/40 bg-slate-900/50 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-200">Fence</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-100">
              {fenceItems.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </article>
        ) : null}
      </div>
    </section>
  );
}
