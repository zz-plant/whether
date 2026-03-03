const formulaCard = "rounded-2xl border border-slate-800 bg-slate-900/40 p-6";
const formulaSections = [
  {
    id: "base-rate",
    label: "Base rate",
    description:
      "Uses the 1-month Treasury yield; falls back to 3-month if missing. This anchors the cost of capital in the current policy environment.",
    application: "Model input for capital tightness scoring.",
    sourceHref: "https://fred.stlouisfed.org/series/DGS1MO",
    sourceLabel: "FRED CSV Series: DGS1MO",
    accentClass: "border-sky-400/50 bg-sky-500/10 text-sky-100",
  },
  {
    id: "curve-slope",
    label: "Yield curve slope",
    description:
      "10-year Treasury yield minus 2-year Treasury yield. A negative slope signals risk aversion in credit markets.",
    application: "Model input for risk appetite scoring.",
    sourceHref: "https://fred.stlouisfed.org/series/T10Y2Y",
    sourceLabel: "FRED Derived Series: T10Y2Y (from DGS10 and DGS2)",
    accentClass: "border-indigo-400/50 bg-indigo-500/10 text-indigo-100",
  },
  {
    id: "cpi-inflation",
    label: "CPI inflation (YoY)",
    description:
      "Year-over-year change in CPI-U. Tracks consumer inflation pressure across the basket of goods and services.",
    application: "Context variable used for inflation diagnostics.",
    sourceHref: "https://www.bls.gov/cpi/",
    sourceLabel: "Bureau of Labor Statistics CPI",
    accentClass: "border-amber-400/50 bg-amber-500/10 text-amber-100",
  },
  {
    id: "unemployment-rate",
    label: "Unemployment rate (U-3)",
    description:
      "Headline unemployment rate for the civilian labor force. Indicates labor market tightness and potential demand softness.",
    application: "Context variable used for labor diagnostics.",
    sourceHref: "https://www.bls.gov/news.release/empsit.toc.htm",
    sourceLabel: "BLS Employment Situation",
    accentClass: "border-emerald-400/50 bg-emerald-500/10 text-emerald-100",
  },
  {
    id: "credit-spread",
    label: "BBB credit spread (OAS)",
    description:
      "ICE BofA BBB option-adjusted spread. Higher spreads imply tighter credit conditions and lower market risk appetite.",
    application: "Model input for financial-conditions diagnostics.",
    sourceHref: "https://fred.stlouisfed.org/series/BAMLC0A4CBBB",
    sourceLabel: "FRED Series: BAMLC0A4CBBB",
    accentClass: "border-rose-400/50 bg-rose-500/10 text-rose-100",
  },
];
const primaryFormulaIds = ["base-rate", "curve-slope", "credit-spread"];
const contextFormulaIds = ["cpi-inflation", "unemployment-rate"];

export const MethodologyContent = () => {
  const primaryFormulas = formulaSections.filter((item) => primaryFormulaIds.includes(item.id));
  const contextFormulas = formulaSections.filter((item) => contextFormulaIds.includes(item.id));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Method notes</p>
          <h1 className="text-3xl font-semibold text-slate-100">Methodology</h1>
          <p className="text-sm text-slate-300">Each signal includes a plain-English formula and its direct source.</p>
          <p className="mt-4 text-xs text-slate-400">Canonical Treasury feed: FRED CSV Treasury series. Secondary validation source: US Treasury Fiscal Data API when running provenance checks.</p>

        </header>


        <section className="mt-6 grid gap-4 md:grid-cols-3" aria-label="Methodology formulas">
          {primaryFormulas.concat(contextFormulas).map((item) => (
            <article key={item.id} id={item.id} className={`${formulaCard} ${item.accentClass}`}>
              <h2 className="text-lg font-semibold text-slate-100">{item.label}</h2>
              <p className="mt-2 text-sm text-slate-200/90">{item.description}</p>
              <p className="mt-2 text-xs text-slate-300">Model role: {item.application}</p>
              <a href={item.sourceHref} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.12em] underline decoration-slate-500 underline-offset-4 hover:text-white">{item.sourceLabel}</a>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-700 bg-slate-900/50 p-6" aria-label="Policy pilot details">
          <h2 className="text-lg font-semibold text-slate-100">Policy pilot (v1) details</h2>
          <p className="mt-2 text-sm text-slate-300">
            The policy pilot publishes normalized signal traces and composite scores alongside the legacy model.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-200">
            <li>Normalization: rolling-window z-score with directional transforms and ±3σ clipping.</li>
            <li>Composites: CTS = 0.5·BaseRate + 0.5·BBB, RAS = 0.7·Slope + 0.3·BBB.</li>
            <li>Banding: neutral (&lt;0.5), elevated (&lt;1.5), extreme (≥1.5) by absolute composite distance.</li>
            <li>
              Refusal guards: when disagreement, volatility, or missing-signal limits breach policy thresholds,
              outputs include <code>NO_POSTURE_CHANGE_RECOMMENDED</code> and <code>REVERSIBLE_BETS_ONLY</code>.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
};
