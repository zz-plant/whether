import Link from "next/link";
import { navigationLabelByPath } from "../../../lib/navigation/informationArchitecture";
import type { StartRouteDeltaBlock } from "../../../lib/report/homeBriefModel";

type StartDecisionBlocksProps = {
  sinceLastReview: StartRouteDeltaBlock;
  actionNow: string;
  guardrail: string;
  flipWhen: string;
  postureLabel: string;
  confidenceLabel: "HIGH" | "MED" | "LOW";
  trendLabel: string;
};

const routeContext = {
  "/signals": "See exactly which signals changed.",
  "/operations": "Apply hiring/spend guardrails now.",
  "/decide": "Translate the call by role.",
} as const;

export function StartDecisionBlocks({
  sinceLastReview,
  actionNow,
  guardrail,
  flipWhen,
  postureLabel,
  confidenceLabel,
  trendLabel,
}: StartDecisionBlocksProps) {
  const suggestedRoute = sinceLastReview.items[0]?.href ?? "/operations";
  const suggestedLabel = navigationLabelByPath[suggestedRoute];

  return (
    <section className="weather-page-grid-sidebar" aria-label="Start decision blocks">
      <div className="space-y-4">
        <article className="weather-panel space-y-3 px-4 py-4 sm:px-5" aria-label="Primary next action">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-200">If you only do one thing now</p>
          <p className="text-base font-semibold text-slate-100">Open {suggestedLabel} to execute this week’s call.</p>
          <p className="text-sm text-slate-300">{routeContext[suggestedRoute as keyof typeof routeContext] ?? "Use the highest-signal route for this week’s decision."}</p>
          <Link href={suggestedRoute} className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs">
            Open {suggestedLabel}
          </Link>
        </article>

        <article className="weather-panel space-y-3 px-4 py-4 sm:px-5" aria-label="Step 1 what changed">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">Step 1 — What changed since last review?</p>
          {sinceLastReview.hasMeaningfulDelta ? (
            <ul className="grid gap-2">
              {sinceLastReview.items.map((item) => (
                <li key={item.id} className="weather-route-card space-y-2 text-xs text-slate-100">
                  <p className="font-semibold text-slate-100">{item.label}</p>
                  <p className="text-slate-300">{item.detail}</p>
                  <Link href={item.href} className="inline-flex min-h-[44px] items-center text-[11px] font-semibold text-sky-300 underline underline-offset-2">
                    Open {navigationLabelByPath[item.href]}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-300">{sinceLastReview.fallbackCopy}</p>
          )}
        </article>

        <article className="weather-panel space-y-3 px-4 py-4 sm:px-5" aria-label="Step 2 what to do now">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">Step 2 — What should I do now?</p>
          <ul className="grid gap-2 text-sm text-slate-100">
            <li className="weather-stat-card"><span className="font-semibold text-emerald-100">Do now:</span> {actionNow}</li>
            <li className="weather-stat-card"><span className="font-semibold text-amber-100">Guardrail:</span> {guardrail}</li>
            <li className="weather-stat-card"><span className="font-semibold text-sky-100">Flip when:</span> {flipWhen}</li>
          </ul>
        </article>
      </div>

      <div className="space-y-4">
        <article className="weather-panel space-y-3 px-4 py-4 sm:px-5" aria-label="Current weekly call context">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">Current call</p>
          <p className="text-base font-semibold text-slate-100">{postureLabel}</p>
          <div className="weather-page-grid-2">
            <div className="weather-stat-card">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Confidence</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">{confidenceLabel}</p>
            </div>
            <div className="weather-stat-card">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Trend</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">{trendLabel}</p>
            </div>
          </div>
        </article>

        <article className="weather-panel space-y-3 px-4 py-4 sm:px-5" aria-label="Step 3 where to execute">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">Step 3 — Where do I execute?</p>
          <div className="grid gap-2">
            {(["/signals", "/operations", "/decide"] as const).map((href) => (
              <Link
                key={href}
                href={href}
                className={`weather-route-card ${href === suggestedRoute ? "border-sky-400/70 bg-sky-500/10 text-sky-100" : "text-slate-100"}`}
              >
                <p className="font-semibold">Open {navigationLabelByPath[href]}</p>
                <p className="mt-1 text-[11px] text-slate-300">{routeContext[href]}</p>
              </Link>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
