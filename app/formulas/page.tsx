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
const formulaLinks = [
  { href: "#base-rate", label: "Base rate" },
  { href: "#curve-slope", label: "Yield curve slope" },
  { href: "#cpi-inflation", label: "CPI inflation" },
  { href: "#unemployment-rate", label: "Unemployment rate" },
  { href: "#credit-spread", label: "Credit spread" },
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

        <nav aria-label="Formula sections" className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Jump to
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {formulaLinks.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="inline-flex min-h-[36px] items-center rounded-full border border-slate-800 px-4 text-xs font-semibold tracking-[0.14em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8 space-y-6">
          <section id="base-rate" className={formulaCard}>
            <h2 className="text-xl font-semibold text-slate-100">Base rate</h2>
            <p className="mt-2 text-sm text-slate-300">
              Uses the 1-month Treasury yield; falls back to 3-month if missing. This anchors the
              cost of capital in the current policy environment.
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Source:{" "}
              <a
                href="https://fiscaldata.treasury.gov/api-documentation/"
                target="_blank"
                rel="noreferrer"
                className="touch-target text-slate-200 underline decoration-slate-700 underline-offset-4 hover:text-slate-100"
              >
                US Treasury Fiscal Data API
              </a>
            </p>
          </section>

          <section id="curve-slope" className={formulaCard}>
            <h2 className="text-xl font-semibold text-slate-100">Yield curve slope</h2>
            <p className="mt-2 text-sm text-slate-300">
              10-year Treasury yield minus 2-year Treasury yield. A negative slope signals risk
              aversion in credit markets.
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Source:{" "}
              <a
                href="https://fiscaldata.treasury.gov/api-documentation/"
                target="_blank"
                rel="noreferrer"
                className="touch-target text-slate-200 underline decoration-slate-700 underline-offset-4 hover:text-slate-100"
              >
                US Treasury Fiscal Data API
              </a>
            </p>
          </section>

          <section id="cpi-inflation" className={formulaCard}>
            <h2 className="text-xl font-semibold text-slate-100">CPI inflation (YoY)</h2>
            <p className="mt-2 text-sm text-slate-300">
              Year-over-year change in CPI-U. Tracks consumer inflation pressure across the basket
              of goods and services.
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Source:{" "}
              <a
                href="https://www.bls.gov/cpi/"
                target="_blank"
                rel="noreferrer"
                className="touch-target text-slate-200 underline decoration-slate-700 underline-offset-4 hover:text-slate-100"
              >
                Bureau of Labor Statistics CPI
              </a>
            </p>
          </section>

          <section id="unemployment-rate" className={formulaCard}>
            <h2 className="text-xl font-semibold text-slate-100">Unemployment rate (U-3)</h2>
            <p className="mt-2 text-sm text-slate-300">
              Headline unemployment rate for the civilian labor force. Indicates labor market
              tightness and potential demand softness.
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Source:{" "}
              <a
                href="https://www.bls.gov/news.release/empsit.toc.htm"
                target="_blank"
                rel="noreferrer"
                className="touch-target text-slate-200 underline decoration-slate-700 underline-offset-4 hover:text-slate-100"
              >
                BLS Employment Situation
              </a>
            </p>
          </section>

          <section id="credit-spread" className={formulaCard}>
            <h2 className="text-xl font-semibold text-slate-100">BBB credit spread (OAS)</h2>
            <p className="mt-2 text-sm text-slate-300">
              ICE BofA BBB option-adjusted spread. Higher spreads imply tighter credit conditions
              and lower market risk appetite.
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Source:{" "}
              <a
                href="https://fred.stlouisfed.org/series/BAMLC0A4CBBB"
                target="_blank"
                rel="noreferrer"
                className="touch-target text-slate-200 underline decoration-slate-700 underline-offset-4 hover:text-slate-100"
              >
                FRED Series: BAMLC0A4CBBB
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
