type Cadence = "monthly" | "quarterly" | "yearly";

type Summary = {
  title: string;
  summary: string;
  regime: string;
  regimeLabel: string;
  guidance: string;
  recordDateLabel: string | null;
  copy: string;
  confidence?: string;
  provenance?: {
    source?: string;
    timestampLabel?: string;
    ageLabel?: string;
  };
};

type Props = {
  cadence: Cadence;
  data: {
    summary?: Summary;
    recordDateLabel?: string | null;
  };
};

const CADENCE_LABEL: Record<Cadence, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export function CadenceCallCard({ cadence, data }: Props) {
  const summary = data.summary;
  if (!summary) return null;

  const provenance = [summary.provenance?.source, summary.recordDateLabel ?? data.recordDateLabel, summary.confidence]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="weather-card space-y-3" aria-label={`${CADENCE_LABEL[cadence]} call`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-fluid-nano font-semibold uppercase tracking-[0.12em] text-white/40">
          {CADENCE_LABEL[cadence]} call
        </p>
        {summary.regimeLabel ? (
          <span className="inline-flex items-center rounded-full bg-white/[0.06] px-2 py-1 text-fluid-micro font-medium text-white/70">
            {summary.regimeLabel}
          </span>
        ) : null}
      </div>
      <h2 className="max-w-4xl text-pretty font-display text-[1.35rem] font-semibold leading-[1.12] text-white sm:text-[1.55rem]">
        {summary.title}
      </h2>
      {summary.guidance ? (
        <p className="text-fluid-sm font-medium text-emerald-200/80">Do this week: {summary.guidance}</p>
      ) : null}
      <p className="text-fluid-sm leading-relaxed text-white/70">{summary.summary}</p>
      {provenance ? (
        <p className="text-fluid-micro text-white/40">{provenance}</p>
      ) : null}
    </section>
  );
}
