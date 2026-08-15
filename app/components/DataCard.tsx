import type { ReactNode } from "react";

type DataCardProps = {
  variant: "metric" | "reading" | "narrative";
  label?: string;
  value?: string | number;
  unit?: string;
  delta?: { value: number; direction: "up" | "down" | "flat"; label?: string };
  interpretation?: string;
  source?: { label: string; url?: string; freshness?: string };
  sparkline?: ReactNode;
  status?: { label: string; tone: "positive" | "warning" | "negative" | "neutral" };
  className?: string;
  children?: ReactNode;
};

const STATUS_COLORS = {
  positive: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
  warning: "border-amber-400/25 bg-amber-500/10 text-amber-200",
  negative: "border-rose-400/25 bg-rose-500/10 text-rose-200",
  neutral: "border-slate-400/25 bg-slate-500/10 text-slate-200",
};

function DeltaBadge({ delta }: { delta: DataCardProps["delta"] }) {
  if (!delta) return null;
  const arrow = delta.direction === "up" ? "↑" : delta.direction === "down" ? "↓" : "→";
  const color = delta.direction === "up"
    ? "text-emerald-200"
    : delta.direction === "down" ? "text-rose-200" : "text-slate-400";
  return (
    <span className={`text-xs font-semibold ${color}`}>
      {arrow} {Math.abs(delta.value).toFixed(1)} {delta.label ?? ""}
    </span>
  );
}

export function DataCard({
  variant,
  label,
  value,
  unit,
  delta,
  interpretation,
  source,
  sparkline,
  status,
  className = "",
  children,
}: DataCardProps) {
  if (variant === "metric") {
    return (
      <div className={`rounded-md bg-slate-950/25 px-3 py-3 ${className}`}>
        {label ? (
          <p className="type-eyebrow">{label}</p>
        ) : null}
        <p className="mt-1 text-sm font-bold tabular-nums text-slate-100">
          {value}{unit ? <span className="text-xs font-normal text-slate-400 ml-0.5">{unit}</span> : null}
        </p>
        <DeltaBadge delta={delta} />
        {children}
      </div>
    );
  }

  if (variant === "reading") {
    return (
      <div className={`rounded-lg bg-slate-950/30 border border-slate-800/60 px-4 py-4 ${className}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {label ? (
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-200">{label}</p>
                {status ? (
                  <span className={`rounded-full border px-2 py-0.5 type-badge ${STATUS_COLORS[status.tone]}`}>
                    {status.label}
                  </span>
                ) : null}
              </div>
            ) : null}
            <div className="flex items-baseline gap-3 mt-1">
              <p className="mono text-2xl tabular-nums text-slate-100">
                {value}{unit ? <span className="text-sm text-slate-400 ml-0.5">{unit}</span> : null}
              </p>
              <DeltaBadge delta={delta} />
            </div>
          </div>
          {source?.freshness ? (
            <span className="text-fluid-micro text-slate-400">{source.freshness}</span>
          ) : null}
        </div>
        {sparkline ? (
          <div className="mt-3">{sparkline}</div>
        ) : null}
        {interpretation ? (
          <p className="mt-3 rounded-md bg-slate-950/40 px-3 py-2 text-xs leading-5 text-slate-300">
            <span className="font-semibold text-slate-400">Interpretation: </span>
            {interpretation}
          </p>
        ) : null}
        {source?.label ? (
          <p className="mt-3 text-xs text-slate-400">
            Source:{" "}
            {source.url ? (
              <a href={source.url} className="text-sky-300 underline decoration-slate-600 underline-offset-4 hover:text-sky-200">
                {source.label}
              </a>
            ) : (
              <span className="text-slate-400">{source.label}</span>
            )}
          </p>
        ) : null}
        {children}
      </div>
    );
  }

  return (
    <div className={`rounded-lg bg-slate-950/30 border border-slate-800/60 px-4 py-4 ${className}`}>
      {label ? (
        <p className="type-eyebrow">{label}</p>
      ) : null}
      {value ? (
        <p className="mt-1 text-sm text-slate-200">{value}</p>
      ) : null}
      {interpretation ? (
        <p className="mt-2 text-xs leading-5 text-slate-400">{interpretation}</p>
      ) : null}
      {children}
      {source?.label ? (
        <p className="mt-3 text-xs text-slate-400">Source: {source.label}</p>
      ) : null}
    </div>
  );
}
