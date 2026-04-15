import { SecondaryPageHeader, SecondaryPageSection, SecondaryPageShell } from "../../components/secondaryPageShell";

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
    <SecondaryPageShell width="wide">
      <SecondaryPageHeader
        eyebrow="Formula notes"
        title="Methodology"
        description="Technical reference: each signal includes a plain-English formula, how it affects the recommendation, and a direct source."
        aside={(
          <div className="weather-surface space-y-2 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Primary sources</p>
            <p className="text-sm text-slate-300">Primary source: FRED Treasury series. Secondary check: U.S. Treasury Fiscal Data API for provenance verification.</p>
          </div>
        )}
      />

      <SecondaryPageSection title="Methodology scope">
        <div className="grid gap-4 md:grid-cols-3" aria-label="Methodology scope">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">What this model does</p>
            <p className="mt-3 text-sm text-slate-200">
              It turns a small set of U.S. market inputs into a weekly recommendation so leaders can slow down, hold steady, or press harder without reopening every assumption from scratch.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">What powers the recommendation</p>
            <p className="mt-3 text-sm text-slate-200">
              The main inputs are intentionally compact: base rate, curve slope, BBB spread, CPI, and unemployment. They describe the U.S. market backdrop; they do not claim to model company-specific demand, product quality, or execution.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">How to read the outputs</p>
            <p className="mt-3 text-sm text-slate-200">
              Hiring, spending, fundraising, and product-tempo guidance are default starting points. They are designed to stay clear and reversible, not presented as company-specific certainty.
            </p>
          </article>
        </div>
      </SecondaryPageSection>


      <SecondaryPageSection title="Methodology formulas">
        <div className="grid gap-4 md:grid-cols-3" aria-label="Methodology formulas">
          {primaryFormulas.concat(contextFormulas).map((item) => (
            <article key={item.id} id={item.id} className={`${formulaCard} ${item.accentClass}`}>
              <h2 className="text-lg font-semibold text-slate-100">{item.label}</h2>
              <p className="mt-2 text-sm text-slate-200/90">{item.description}</p>
              <p className="mt-2 text-xs text-slate-300">Model role: {item.application}</p>
              <a href={item.sourceHref} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.12em] underline decoration-slate-500 underline-offset-4 hover:text-white">{item.sourceLabel}</a>
            </article>
          ))}
        </div>
      </SecondaryPageSection>

      <SecondaryPageSection title="Policy pilot (v1) details">
        <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6" aria-label="Policy pilot details">
          <p className="mt-2 text-sm text-slate-300">
            The policy pilot publishes normalized signal traces and composite scores alongside the legacy model.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-200">
            <li>Normalization: history-window z-score with directional transforms and ±3σ clipping; Treasury inputs use the local 10-year archive when available.</li>
            <li>Composites: CTS = 0.5·BaseRate + 0.5·BBB, RAS = 0.7·Slope + 0.3·BBB.</li>
            <li>Banding: neutral (&lt;0.5), elevated (&lt;1.5), extreme (≥1.5) by absolute composite distance.</li>
            <li>
              Refusal guards: when disagreement, volatility, or missing-signal limits breach policy thresholds,
              outputs include <code>NO_POSTURE_CHANGE_RECOMMENDED</code> and <code>REVERSIBLE_BETS_ONLY</code>.
            </li>
          </ul>
          <p className="mt-4 text-xs leading-6 text-slate-400">
            Practical reading rule: the formulas improve transparency, but they do not expand the underlying data universe. Treat the composites as a compact read on the market backdrop, then pressure-test the output against your own company metrics before acting.
          </p>
        </div>
      </SecondaryPageSection>
    </SecondaryPageShell>
  );
};
