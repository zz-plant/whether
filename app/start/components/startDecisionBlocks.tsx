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
    <section className="weather-panel space-y-4 px-4 py-4" aria-label="Start decision blocks">
      <article className="rounded-lg border border-sky-400/60 bg-sky-500/10 p-3" aria-label="Primary next action">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-200">If you only do one thing now</p>
        <p className="mt-1 text-sm font-semibold text-slate-100">Open {suggestedLabel} to execute this week’s call.</p>
        <Link href={suggestedRoute} className="weather-button-primary mt-2 inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs">
          Open {suggestedLabel}
        </Link>
      </article>

      <article className="rounded-lg border border-slate-700/70 bg-slate-950/70 p-3" aria-label="Current weekly call context">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">Current call</p>
        <p className="mt-1 text-sm font-semibold text-slate-100">{postureLabel}</p>
        <p className="mt-1 text-xs text-slate-300">Confidence: {confidenceLabel} · Trend: {trendLabel}</p>
      </article>

      <article className="rounded-lg border border-slate-700/70 bg-slate-950/70 p-3" aria-label="Step 1 what changed">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">Step 1 — What changed since last review?</p>
        {sinceLastReview.hasMeaningfulDelta ? (
          <ul className="mt-2 space-y-2">
            {sinceLastReview.items.map((item) => (
              <li key={item.id} className="rounded-md border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-xs text-slate-100">
                <p className="font-semibold text-slate-100">{item.label}</p>
                <p className="mt-1 text-slate-300">{item.detail}</p>
                <Link href={item.href} className="mt-1 inline-flex min-h-[44px] items-center text-[11px] font-semibold text-sky-300 underline underline-offset-2">
                  Open {navigationLabelByPath[item.href]}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-slate-300">{sinceLastReview.fallbackCopy}</p>
        )}
      </article>

      <article className="rounded-lg border border-slate-700/70 bg-slate-950/70 p-3" aria-label="Step 2 what to do now">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">Step 2 — What should I do now?</p>
        <ul className="mt-1 space-y-1 text-xs text-slate-100">
          <li><span className="font-semibold">Do now:</span> {actionNow}</li>
          <li><span className="font-semibold">Guardrail:</span> {guardrail}</li>
          <li><span className="font-semibold">Flip when:</span> {flipWhen}</li>
        </ul>
      </article>

      <article className="rounded-lg border border-slate-700/70 bg-slate-950/70 p-3" aria-label="Step 3 where to execute">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">Step 3 — Where do I execute?</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {(["/signals", "/operations", "/decide"] as const).map((href) => (
            <Link
              key={href}
              href={href}
              className={`rounded-md border px-3 py-2 text-xs ${href === suggestedRoute ? "border-sky-400/70 bg-sky-500/10 text-sky-100" : "border-slate-700/70 bg-slate-900/70 text-slate-100"}`}
            >
              <p className="font-semibold">Open {navigationLabelByPath[href]}</p>
              <p className="mt-1 text-[11px] text-slate-300">{routeContext[href]}</p>
            </Link>
          ))}
        </div>
      </article>
    </section>
  );
}
