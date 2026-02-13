import type { ReactNode } from "react";

export type ReportStageItem = {
  id: string;
  label: string;
  href: string;
  status: "completed" | "current" | "upcoming";
};

export const StageRail = ({
  title = "Decision flow",
  items,
}: {
  title?: string;
  items: ReportStageItem[];
}) => (
  <section className="weather-panel space-y-3 px-4 py-4 sm:px-5" aria-label="Decision flow stages">
    <p className="text-xs font-semibold tracking-[0.2em] text-slate-400">{title}</p>
    <ol className="grid gap-2 lg:grid-cols-5">
      {items.map((item, index) => {
        const tone =
          item.status === "current"
            ? "border-sky-300/80 bg-sky-500/20 text-sky-100"
            : item.status === "completed"
              ? "border-emerald-300/60 bg-emerald-500/15 text-emerald-100"
              : "border-slate-700/70 bg-slate-900/50 text-slate-300";

        return (
          <li key={item.id}>
            <a
              href={item.href}
              aria-current={item.status === "current" ? "step" : undefined}
              className={`inline-flex min-h-[44px] w-full items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-300/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation ${tone}`}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">
                {index + 1}
              </span>
              <span>{item.label}</span>
            </a>
          </li>
        );
      })}
    </ol>
  </section>
);

export const DecisionBanner = ({
  label = "Decide now",
  decision,
  horizon,
  confidence,
  confidenceScore,
  effectiveDate,
  evidenceHref,
}: {
  label?: string;
  decision: string;
  horizon: string;
  confidence: string;
  confidenceScore?: number;
  effectiveDate: string;
  evidenceHref?: string;
}) => (
  <section className="weather-panel space-y-4 px-4 py-5 sm:px-5" aria-label="Decision banner">
    <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">{label}</p>
    <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">{decision}</h2>
    <dl className="grid gap-3 sm:grid-cols-3">
      <div className="weather-surface p-3">
        <dt className="text-xs font-semibold tracking-[0.14em] text-slate-400">Time horizon</dt>
        <dd className="mt-1 text-sm font-semibold text-slate-100">{horizon}</dd>
      </div>
      <div className="weather-surface p-3">
        <dt className="text-xs font-semibold tracking-[0.14em] text-slate-400">Confidence</dt>
        <dd className="mt-1 text-sm font-semibold text-slate-100">
          {confidence}
          {typeof confidenceScore === "number" ? ` · ${confidenceScore}%` : ""}
        </dd>
      </div>
      <div className="weather-surface p-3">
        <dt className="text-xs font-semibold tracking-[0.14em] text-slate-400">Effective date</dt>
        <dd className="mt-1 text-sm font-semibold text-slate-100">{effectiveDate}</dd>
      </div>
    </dl>
    {evidenceHref ? (
      <a
        href={evidenceHref}
        className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.14em] text-sky-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
      >
        Review evidence trail →
      </a>
    ) : null}
  </section>
);

export const ActionSequence = ({
  title,
  items,
  footer,
}: {
  title: string;
  items: Array<{ title: string; detail: string; href: string; cta: string }>;
  footer?: ReactNode;
}) => (
  <section className="weather-panel space-y-4 px-4 py-5 sm:px-5" aria-label={title}>
    <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">{title}</p>
    <ol className="grid gap-3 md:grid-cols-3">
      {items.map((item, index) => (
        <li key={item.title} className="weather-surface flex flex-col gap-3 p-4">
          <p className="text-sm font-semibold text-slate-100">{index + 1}. {item.title}</p>
          <p className="text-sm text-slate-300">{item.detail}</p>
          <a
            href={item.href}
            className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.16em] text-sky-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
          >
            {item.cta} →
          </a>
        </li>
      ))}
    </ol>
    {footer}
  </section>
);
