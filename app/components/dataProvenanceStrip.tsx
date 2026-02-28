/**
 * Data provenance strip for surfacing source, freshness, and live status inline.
 * Keeps each Market Climate Station section traceable at the point of interpretation.
 */
"use client";

import { Tooltip } from "@base-ui/react/tooltip";

export type DataProvenance = {
  sourceLabel: string;
  sourceUrl?: string;
  recordDateLabel: string;
  timestampLabel: string;
  ageLabel: string;
  statusLabel: string;
};

const statusStyles = {
  "Live (high confidence)": "border-emerald-400/50 bg-emerald-500/10 text-emerald-200",
  "Cached (medium)": "border-amber-400/60 bg-amber-500/10 text-amber-100",
  "Simulated (low)": "border-slate-600/70 bg-slate-800/40 text-slate-200",
} as const;

const statusDescriptions = {
  "Live (high confidence)": "Streaming feeds updated within the last 24 hours.",
  "Cached (medium)": "Latest available data cached from our last refresh.",
  "Simulated (low)": "Modeled inputs or backfilled estimates where live data is absent.",
} as const;

const statusConfidence = {
  "Live (high confidence)": 100,
  "Cached (medium)": 64,
  "Simulated (low)": 28,
} as const;

const statusDataMode = {
  "Live (high confidence)": {
    label: "Dynamic · live feed",
    icon: "●",
    className: "weather-data-mode weather-data-mode-dynamic",
  },
  "Cached (medium)": {
    label: "Static · cached snapshot",
    icon: "◼",
    className: "weather-data-mode weather-data-mode-static",
  },
  "Simulated (low)": {
    label: "Static · simulated model",
    icon: "◼",
    className: "weather-data-mode weather-data-mode-static",
  },
} as const;

export const DataProvenanceStrip = ({
  provenance,
  label = "Data provenance",
  variant = "full",
}: {
  provenance: DataProvenance;
  label?: string;
  variant?: "full" | "compact";
}) => {
  const statusStyle = statusStyles[provenance.statusLabel as keyof typeof statusStyles];
  const statusDescription =
    statusDescriptions[provenance.statusLabel as keyof typeof statusDescriptions] ??
    "Signal status defined by source availability.";
  const confidencePct = statusConfidence[provenance.statusLabel as keyof typeof statusConfidence] ?? 50;
  const dataMode =
    statusDataMode[provenance.statusLabel as keyof typeof statusDataMode] ?? {
      label: "Static · snapshot",
      icon: "◼",
      className: "weather-data-mode weather-data-mode-static",
    };

  const provenanceRows = [
    {
      label: "Source",
      value: provenance.sourceUrl ? (
        <a
          href={provenance.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="touch-target inline-flex min-h-[44px] items-center text-slate-100 underline decoration-slate-500 underline-offset-4 hover:text-slate-50"
        >
          {provenance.sourceLabel}
        </a>
      ) : (
        <span className="text-slate-100">{provenance.sourceLabel}</span>
      ),
    },
    {
      label: "Record date",
      value: <span className="mono text-slate-100">{provenance.recordDateLabel}</span>,
    },
    {
      label: "Updated",
      value: <span className="mono text-slate-100">{provenance.timestampLabel}</span>,
    },
    {
      label: "Data age",
      value: <span className="mono text-slate-100">{provenance.ageLabel}</span>,
    },
  ] as const;

  if (variant === "compact") {
    return (
      <div className="weather-surface space-y-3 border-slate-800/80 bg-slate-950/55 p-3 text-xs font-medium tracking-[0.08em] text-slate-200 shadow-none">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className={`${dataMode.className} font-medium uppercase tracking-[0.12em]`}>
            <span aria-hidden="true">{dataMode.icon}</span>
            <span>{dataMode.label}</span>
          </span>
          <span className="h-1 w-1 rounded-full bg-slate-600" aria-hidden="true" />
          <span className="inline-flex min-h-[44px] items-center rounded-full border border-slate-700/75 bg-slate-900/70 px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-100">
            Confidence {confidencePct}%
          </span>
          <Tooltip.Root>
            <Tooltip.Trigger
              type="button"
              className={`weather-chip min-h-[44px] rounded-full border px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-colors hover:border-slate-500/80 ${
                statusStyle ?? "border-slate-700 text-slate-200"
              }`}
            >
              {provenance.statusLabel}
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Positioner side="top" align="center" sideOffset={8}>
                <Tooltip.Popup className="max-w-[220px] rounded-xl border border-slate-700/80 bg-slate-950/95 px-3 py-2 text-xs text-slate-200 shadow-md">
                  <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-slate-300">
                    Status meaning
                  </p>
                  <p className="mt-2 text-sm text-slate-100">{statusDescription}</p>
                </Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
        <div className="grid gap-2 rounded-xl border border-slate-800/85 bg-slate-950/45 p-3 text-xs tracking-[0.08em] text-slate-200 sm:grid-cols-2">
          {provenanceRows.map((row) => (
            <p key={row.label} className="space-y-1">
              <span className="block text-[10px] uppercase tracking-[0.12em] text-slate-400">{row.label}</span>
              <span className="block tracking-normal normal-case">{row.value}</span>
            </p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="weather-pill space-y-2 px-4 py-3 text-[0.65rem] font-semibold text-slate-300">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-slate-500 uppercase tracking-[0.14em]">{label}</span>
        <span className="h-1 w-1 rounded-full bg-slate-600" aria-hidden="true" />
        <span className={`${dataMode.className} font-medium uppercase tracking-[0.12em]`}>
          <span aria-hidden="true">{dataMode.icon}</span>
          <span>{dataMode.label}</span>
        </span>
        <span className="h-1 w-1 rounded-full bg-slate-600" aria-hidden="true" />
        <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-2 py-1 text-xs uppercase tracking-[0.12em] text-slate-200">
          Confidence {confidencePct}%
        </span>
        <Tooltip.Root>
          <Tooltip.Trigger
            type="button"
            className={`weather-chip rounded-full border px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] transition-colors hover:border-slate-500/80 ${
              statusStyle ?? "border-slate-700 text-slate-200"
            }`}
          >
            {provenance.statusLabel}
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner side="top" align="center" sideOffset={8}>
              <Tooltip.Popup className="max-w-[220px] rounded-xl border border-slate-700/80 bg-slate-950/95 px-3 py-2 text-xs text-slate-200 shadow-md">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Status meaning
                </p>
                <p className="mt-2 text-sm text-slate-200">{statusDescription}</p>
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>
      <div className="grid gap-2 text-xs text-slate-200 sm:grid-cols-2 xl:grid-cols-4">
        {provenanceRows.map((row) => (
          <p key={row.label} className="space-y-1">
            <span className="block text-[10px] uppercase tracking-[0.12em] text-slate-500">{row.label}</span>
            <span className="block tracking-normal normal-case">{row.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
};
