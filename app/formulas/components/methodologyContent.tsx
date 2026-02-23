import Link from "next/link";

const formulaCard = "rounded-2xl border border-slate-800 bg-slate-900/40 p-6";
const formulaSections = [
  {
    id: "base-rate",
    label: "Base rate",
    description:
      "Uses the 1-month Treasury yield; falls back to 3-month if missing. This anchors the cost of capital in the current policy environment.",
    application: "Sets the baseline for capital tightness and runway planning.",
    sourceHref: "https://fiscaldata.treasury.gov/api-documentation/",
    sourceLabel: "US Treasury Fiscal Data API",
    accentClass: "border-sky-400/50 bg-sky-500/10 text-sky-100",
  },
  {
    id: "curve-slope",
    label: "Yield curve slope",
    description:
      "10-year Treasury yield minus 2-year Treasury yield. A negative slope signals risk aversion in credit markets.",
    application: "Explains the risk appetite score and recession signals.",
    sourceHref: "https://fiscaldata.treasury.gov/api-documentation/",
    sourceLabel: "US Treasury Fiscal Data API",
    accentClass: "border-indigo-400/50 bg-indigo-500/10 text-indigo-100",
  },
  {
    id: "cpi-inflation",
    label: "CPI inflation (YoY)",
    description:
      "Year-over-year change in CPI-U. Tracks consumer inflation pressure across the basket of goods and services.",
    application: "Used to contextualize pricing and margin pressure narratives.",
    sourceHref: "https://www.bls.gov/cpi/",
    sourceLabel: "Bureau of Labor Statistics CPI",
    accentClass: "border-amber-400/50 bg-amber-500/10 text-amber-100",
  },
  {
    id: "unemployment-rate",
    label: "Unemployment rate (U-3)",
    description:
      "Headline unemployment rate for the civilian labor force. Indicates labor market tightness and potential demand softness.",
    application: "Signals hiring appetite and demand resilience in planning.",
    sourceHref: "https://www.bls.gov/news.release/empsit.toc.htm",
    sourceLabel: "BLS Employment Situation",
    accentClass: "border-emerald-400/50 bg-emerald-500/10 text-emerald-100",
  },
  {
    id: "credit-spread",
    label: "BBB credit spread (OAS)",
    description:
      "ICE BofA BBB option-adjusted spread. Higher spreads imply tighter credit conditions and lower market risk appetite.",
    application: "Supports board-level risk narratives and financing timing.",
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
          <p className="text-sm text-slate-300">
            Each signal includes a plain-English formula and its direct source. All calculations are deterministic and
            traceable.
          </p>
        </header>

        <section className="mt-6 weather-panel p-5" aria-label="Reference mode context">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Reference mode</p>
              <p className="text-sm text-slate-300">
                You are in a source-of-truth workspace. Use this page for audit-ready formulas, then return to
                operational surfaces to apply decisions.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/" className="weather-pill inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.14em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation">Weekly briefing</Link>
              <Link href="/signals" className="weather-pill inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.14em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation">Signal evidence</Link>
            </div>
          </header>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3" aria-label="Methodology formulas">
          {primaryFormulas.concat(contextFormulas).map((item) => (
            <article key={item.id} id={item.id} className={`${formulaCard} ${item.accentClass}`}>
              <h2 className="text-lg font-semibold text-slate-100">{item.label}</h2>
              <p className="mt-2 text-sm text-slate-200/90">{item.description}</p>
              <p className="mt-2 text-xs text-slate-300">Decision implication: {item.application}</p>
              <a href={item.sourceHref} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.12em] underline decoration-slate-500 underline-offset-4 hover:text-white">{item.sourceLabel}</a>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
};
