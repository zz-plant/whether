/**
 * Formula documentation for Market Climate Station sensors.
 * Keeps methodology transparent and shareable for operators.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sensor Formulas — Whether",
  description: "Method notes and source links for macro sensor calculations.",
};

const formulaCard = "rounded-2xl border border-slate-800 bg-slate-900/40 p-6";
const formulaSections = [
  {
    id: "base-rate",
    label: "Base rate",
    description:
      "Uses the 1-month Treasury yield; falls back to 3-month if missing. This anchors the cost of capital in the current policy environment.",
    sourceHref: "https://fiscaldata.treasury.gov/api-documentation/",
    sourceLabel: "US Treasury Fiscal Data API",
    accentClass: "border-sky-400/50 bg-sky-500/10 text-sky-100",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M6 15.5h12M8.5 11.5h7M11 7.5h2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M5.5 18.5h13a1.5 1.5 0 0 0 1.5-1.5V7a1.5 1.5 0 0 0-1.5-1.5h-13A1.5 1.5 0 0 0 4 7v10a1.5 1.5 0 0 0 1.5 1.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
  {
    id: "curve-slope",
    label: "Yield curve slope",
    description:
      "10-year Treasury yield minus 2-year Treasury yield. A negative slope signals risk aversion in credit markets.",
    sourceHref: "https://fiscaldata.treasury.gov/api-documentation/",
    sourceLabel: "US Treasury Fiscal Data API",
    accentClass: "border-indigo-400/50 bg-indigo-500/10 text-indigo-100",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M6 16c2-4 4-6 6-6s4 2 6 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M5 19h14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "cpi-inflation",
    label: "CPI inflation (YoY)",
    description:
      "Year-over-year change in CPI-U. Tracks consumer inflation pressure across the basket of goods and services.",
    sourceHref: "https://www.bls.gov/cpi/",
    sourceLabel: "Bureau of Labor Statistics CPI",
    accentClass: "border-amber-400/50 bg-amber-500/10 text-amber-100",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M6 16h3l2-4 2 3 3-6h2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="6" cy="16" r="1.5" fill="currentColor" />
        <circle cx="18" cy="9" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "unemployment-rate",
    label: "Unemployment rate (U-3)",
    description:
      "Headline unemployment rate for the civilian labor force. Indicates labor market tightness and potential demand softness.",
    sourceHref: "https://www.bls.gov/news.release/empsit.toc.htm",
    sourceLabel: "BLS Employment Situation",
    accentClass: "border-emerald-400/50 bg-emerald-500/10 text-emerald-100",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M5 18V9a2 2 0 0 1 2-2h3l1 2h6a2 2 0 0 1 2 2v7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M9 12h6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "credit-spread",
    label: "BBB credit spread (OAS)",
    description:
      "ICE BofA BBB option-adjusted spread. Higher spreads imply tighter credit conditions and lower market risk appetite.",
    sourceHref: "https://fred.stlouisfed.org/series/BAMLC0A4CBBB",
    sourceLabel: "FRED Series: BAMLC0A4CBBB",
    accentClass: "border-rose-400/50 bg-rose-500/10 text-rose-100",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M6 17V7m6 10V7m6 10V7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M4 19h16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function FormulasPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Method notes</p>
          <h1 className="text-3xl font-semibold text-slate-100">Sensor formulas</h1>
          <p className="text-sm text-slate-300">
            Each signal includes a plain-English formula and its direct source. All calculations are
            deterministic and traceable.
          </p>
        </header>

        <div className="mt-6 weather-panel p-5">
          <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                How to use this page
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Use these formulas to validate the live signal feed, align with finance partners,
                and share audit-ready methodology links with stakeholders.
              </p>
            </div>
            <div className="weather-surface space-y-3 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Continue the briefing
              </p>
              <p className="text-sm text-slate-300">
                Apply the formulas to live signals or return to the weekly briefing to align on
                guardrails.
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/signals"
                  className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.2em] transition-colors hover:border-sky-300/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                >
                  Open signals report
                </a>
                <a
                  href="/"
                  className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                >
                  Weekly briefing
                </a>
              </div>
            </div>
          </div>
        </div>

        <nav aria-label="Formula sections" className="mt-8 weather-panel p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Jump to
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {formulaSections.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="weather-pill inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.14em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8 space-y-6">
          {formulaSections.map((item) => (
            <section key={item.id} id={item.id} className={`${formulaCard} space-y-3`}>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${item.accentClass}`}
                >
                  {item.icon}
                </span>
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-slate-100">{item.label}</h2>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Signal formula
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-300">{item.description}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="rounded-full border border-slate-700/70 px-3 py-1 text-[10px] font-semibold tracking-[0.12em] text-slate-200">
                  Source
                </span>
                <a
                  href={item.sourceHref}
                  target="_blank"
                  rel="noreferrer"
                  className="touch-target text-slate-200 underline decoration-slate-700 underline-offset-4 hover:text-slate-100"
                >
                  {item.sourceLabel}
                </a>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
