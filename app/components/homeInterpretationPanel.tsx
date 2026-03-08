import type { Route } from "next";
import Link from "next/link";
import type { InterpretationLayer, InterpretationView } from "../../lib/report/interpretationLayer";
import { interpretationViews } from "../../lib/report/interpretationLayer";

const interpretationLabels: Record<InterpretationView, string> = {
  default: "Default",
  sector: "Sector",
  company: "Company",
  financial: "Financial",
  forecast: "Forecast",
};

const buildViewHref = (
  view: InterpretationView,
  searchParams: Record<string, string | undefined> | undefined,
) => {
  const params = new URLSearchParams();

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (typeof value === "string" && value.length > 0 && key !== "view") {
      params.set(key, value);
    }
  });

  if (view !== "default") {
    params.set("view", view);
  }

  const query = params.toString();
  return query.length > 0 ? `/?${query}` : "/";
};

export const HomeInterpretationPanel = ({
  layer,
  searchParams,
}: {
  layer: InterpretationLayer;
  searchParams?: Record<string, string | undefined>;
}) => (
  <section className="weather-panel space-y-4 px-5 py-5" aria-label="Interpretation layer">
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Interpretation layer</p>
      <h2 className="text-base font-semibold text-slate-100">{layer.label}</h2>
      <p className="text-xs text-slate-300">{layer.summary}</p>
    </div>

    <nav className="flex flex-wrap gap-2" aria-label="Interpretation view">
      {interpretationViews.map((view) => (
        <Link
          key={view}
          href={buildViewHref(view, searchParams) as Route}
          className={`weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.12em] transition-colors ${layer.view === view
            ? "border-sky-300/70 text-sky-100"
            : "text-slate-200 hover:border-sky-400/70 hover:text-slate-100"
            }`}
          aria-current={layer.view === view ? "page" : undefined}
        >
          {interpretationLabels[view]}
        </Link>
      ))}
    </nav>


    {layer.financialAction ? (
      <div className="grid gap-3 md:grid-cols-3" aria-label="Financial action summary">
        <article className="weather-surface px-4 py-3 text-sm text-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Runway risk</p>
          <p className="mt-2">{layer.financialAction.runwayRisk}</p>
        </article>
        <article className="weather-surface px-4 py-3 text-sm text-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Raise timing</p>
          <p className="mt-2">{layer.financialAction.raiseTiming}</p>
        </article>
        <article className="weather-surface px-4 py-3 text-sm text-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Burn adjustment</p>
          <p className="mt-2">{layer.financialAction.burnAdjustment}</p>
        </article>
      </div>
    ) : null}
    <ul className="grid gap-2" aria-label={`${layer.label} details`}>
      {layer.bullets.map((bullet) => (
        <li key={bullet} className="weather-surface px-4 py-3 text-sm text-slate-200">
          <p className="leading-snug">• {bullet}</p>
        </li>
      ))}
    </ul>
  </section>
);
