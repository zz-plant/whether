import type { Route } from "../../lib/navigation/routeType";
import Link from "next/link";
import type { InterpretationLayer, InterpretationView } from "../../lib/report/interpretationLayer";
import { interpretationViews } from "../../lib/report/interpretationLayer";
import { BoltIcon, CircleTargetIcon, TrendUpIcon } from "./uiIcons";
import type { ReactNode } from "react";

const interpretationLabels: Record<InterpretationView, string> = {
  default: "Default",
  sector: "Sector",
  company: "Company",
  financial: "Financial",
  forecast: "Stance",
};

const pickCue = (bullets: string[], prefix: "Action:" | "Pause if:" | "Clears when:") => {
  const line = bullets.find((bullet) => bullet.includes(prefix));
  if (!line) {
    return null;
  }

  const start = line.indexOf(prefix);
  if (start === -1) {
    return null;
  }

  const remainder = line.slice(start + prefix.length).trim();
  const boundary = remainder.indexOf(" | ");
  return (boundary >= 0 ? remainder.slice(0, boundary) : remainder).trim() || null;
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

const CueCard = ({
  label,
  icon,
  toneClass,
  body,
}: {
  label: string;
  icon: ReactNode;
  toneClass: string;
  body: string;
}) => (
  <article className={`weather-surface rounded-lg border px-3 py-3 text-sm text-slate-200 ${toneClass}`}>
    <p className="inline-flex items-center gap-2 text-fluid-micro font-semibold uppercase tracking-[0.1em]">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-current/20 bg-slate-950/55">
        {icon}
      </span>
      <span>{label}</span>
    </p>
    <p className="mt-2">{body}</p>
  </article>
);

export const HomeInterpretationPanel = ({
  layer,
  searchParams,
}: {
  layer: InterpretationLayer;
  searchParams?: Record<string, string | undefined>;
}) => {
  const actionCue = pickCue(layer.bullets, "Action:");
  const triggerCue = pickCue(layer.bullets, "Pause if:");
  const reverseCue = pickCue(layer.bullets, "Clears when:");

  return (
    <section id="interpretation-layer" className="weather-surface-secondary space-y-4 px-5 py-5" aria-label="View for this situation">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">View for this situation</p>
          <h2 className="text-base font-semibold text-slate-100">{layer.label}</h2>
          <p className="text-xs text-slate-300">{layer.summary}</p>
          <p className="text-xs text-slate-400">Same decision, framed for your context.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
          <TrendUpIcon className="h-3.5 w-3.5 text-sky-200" />
          <span>Filtered view</span>
        </div>
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
            <span className="rounded-full border border-slate-600/70 px-1.5 py-0.5 text-fluid-micro text-slate-300">{index + 1}</span>
          </Link>
        ))}
      </nav>

      <div className="grid gap-2 md:grid-cols-3" aria-label="Interpretation cues">
        <CueCard
          label="Action"
          icon={<BoltIcon className="h-3.5 w-3.5" />}
          toneClass="border-violet-500/45 bg-violet-500/10 text-violet-100"
          body={actionCue ?? "Start with the main decision above."}
        />
        <CueCard
          label="Trigger"
          icon={<TrendUpIcon className="h-3.5 w-3.5" />}
          toneClass="border-amber-500/45 bg-amber-500/10 text-amber-100"
          body={triggerCue ?? "Use the main pause line above."}
        />
        <CueCard
          label="Reverse"
          icon={<CircleTargetIcon className="h-3.5 w-3.5" />}
          toneClass="border-sky-500/45 bg-sky-500/10 text-sky-100"
          body={reverseCue ?? "Use the main flip condition above."}
        />
      </div>

      {layer.financialAction ? (
        <div className="grid gap-3 md:grid-cols-3" aria-label="Financial action summary">
          <article className="weather-surface px-4 py-3 text-sm text-slate-200">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              <TrendUpIcon className="h-3.5 w-3.5 text-sky-200" />
              <span>Runway risk</span>
            </p>
            <p className="mt-2">{layer.financialAction.runwayRisk}</p>
          </article>
          <article className="weather-surface px-4 py-3 text-sm text-slate-200">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              <CircleTargetIcon className="h-3.5 w-3.5 text-amber-200" />
              <span>Raise timing</span>
            </p>
            <p className="mt-2">{layer.financialAction.raiseTiming}</p>
          </article>
          <article className="weather-surface px-4 py-3 text-sm text-slate-200">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              <BoltIcon className="h-3.5 w-3.5 text-violet-200" />
              <span>Burn adjustment</span>
            </p>
            <p className="mt-2">{layer.financialAction.burnAdjustment}</p>
          </article>
        </div>
      ) : null}
      <ul className="grid gap-2" aria-label={`${layer.label} details`}>
        {layer.bullets.slice(0, 3).map((bullet) => (
          <li key={bullet} className="weather-surface px-4 py-3 text-xs text-slate-200">
            <p className="inline-flex items-start gap-2 leading-snug">
              <TrendUpIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-200" />
              <span>{bullet}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};
