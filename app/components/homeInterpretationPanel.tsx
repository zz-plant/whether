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

const pickCue = (bullets: string[], prefix: "Action:" | "Trigger:" | "Reverse:") => {
  const line = bullets.find((bullet) => bullet.includes(prefix));
  return line ? line.slice(line.indexOf(prefix) + prefix.length).trim() : null;
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
}) => {
  const actionCue = pickCue(layer.bullets, "Action:");
  const triggerCue = pickCue(layer.bullets, "Trigger:");
  const reverseCue = pickCue(layer.bullets, "Reverse:");

  return (
    <section id="interpretation-layer" className="weather-panel space-y-4 px-5 py-5" aria-label="Interpretation layer">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Interpretation layer</p>
        <h2 className="text-base font-semibold text-slate-100">{layer.label}</h2>
        <p className="text-xs text-slate-300">{layer.summary}</p>
        <p className="text-xs text-slate-400">Canonical decision lives above: action, guardrail, and flip condition.</p>
      </div>

      <nav className="grid gap-2 sm:grid-cols-5" aria-label="Interpretation view">
        {interpretationViews.map((view, index) => (
          <Link
            key={view}
            href={buildViewHref(view, searchParams) as Route}
            className={`weather-pill inline-flex min-h-[44px] items-center justify-between px-3 py-2 text-xs font-semibold tracking-[0.12em] transition-colors ${layer.view === view
              ? "border-sky-300/70 text-sky-100"
              : "text-slate-200 hover:border-sky-400/70 hover:text-slate-100"
              }`}
            aria-current={layer.view === view ? "page" : undefined}
          >
            <span>{interpretationLabels[view]}</span>
            <span className="rounded-full border border-slate-600/70 px-1.5 py-0.5 text-[10px] text-slate-300">{index + 1}</span>
          </Link>
        ))}
      </nav>

      <div className="grid gap-2 md:grid-cols-3" aria-label="Interpretation cues">
        <article className="weather-surface rounded-lg border border-violet-500/45 bg-violet-500/10 px-3 py-3 text-sm text-slate-200">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-violet-100">Action</p>
          <p className="mt-1">{actionCue ?? "Review the current decision call above."}</p>
        </article>
        <article className="weather-surface rounded-lg border border-amber-500/45 bg-amber-500/10 px-3 py-3 text-sm text-slate-200">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-100">Trigger</p>
          <p className="mt-1">{triggerCue ?? "Watch threshold pressure before expanding commitments."}</p>
        </article>
        <article className="weather-surface rounded-lg border border-sky-500/45 bg-sky-500/10 px-3 py-3 text-sm text-slate-200">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-100">Reverse</p>
          <p className="mt-1">{reverseCue ?? "Re-open pace once the flip condition is met."}</p>
        </article>
      </div>

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
        {layer.bullets.slice(0, 3).map((bullet) => (
          <li key={bullet} className="weather-surface px-4 py-3 text-xs text-slate-200">
            <p className="leading-snug">• {bullet}</p>
          </li>
        ))}
      </ul>
    </section>
  );
};
