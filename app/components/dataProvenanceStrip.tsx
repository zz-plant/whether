/**
 * Data provenance strip for surfacing source, freshness, and live status inline.
 * Keeps each Capital Posture Governance section traceable at the point of interpretation.
 */
"use client";

import { Popover } from "@base-ui/react/popover";
import { StatusLiveIcon, StatusStaticIcon } from "./uiIcons";
import { ManualRefreshButton } from "./manualRefreshButton";

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
  "Canonical snapshot (high confidence)": "border-sky-300/55 bg-sky-400/10 text-sky-100",
  "Cached (medium)": "border-amber-400/60 bg-amber-500/10 text-amber-100",
  "Cached (fallback)": "border-amber-400/60 bg-amber-500/10 text-amber-100",
  "Simulated (low)": "border-slate-600/70 bg-slate-800/40 text-slate-200",
} as const;

const statusDescriptions = {
  "Live (high confidence)": "Streaming feeds updated within the last 24 hours.",
  "Canonical snapshot (high confidence)": "Canonical snapshot generated from curated Treasury and macro inputs.",
  "Cached (medium)": "Latest available data cached from our last refresh.",
  "Cached (fallback)": "Fallback snapshot is active while live feeds recover.",
  "Simulated (low)": "Modeled inputs or backfilled estimates where live data is absent.",
} as const;

const statusConfidence = {
  "Live (high confidence)": 100,
  "Canonical snapshot (high confidence)": 92,
  "Cached (medium)": 64,
  "Cached (fallback)": 52,
  "Simulated (low)": 28,
} as const;

const statusDataMode = {
  "Live (high confidence)": {
    label: "Dynamic · live feed",
    icon: "live",
    className: "weather-data-mode weather-data-mode-dynamic",
  },
  "Canonical snapshot (high confidence)": {
    label: "Static · canonical snapshot",
    icon: "static",
    className: "weather-data-mode weather-data-mode-static",
  },
  "Cached (medium)": {
    label: "Static · cached snapshot",
    icon: "static",
    className: "weather-data-mode weather-data-mode-static",
  },
  "Cached (fallback)": {
    label: "Static · fallback snapshot",
    icon: "static",
    className: "weather-data-mode weather-data-mode-static",
  },
  "Simulated (low)": {
    label: "Static · simulated model",
    icon: "static",
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
      icon: "static",
      className: "weather-data-mode weather-data-mode-static",
    };

  const dataModeIcon = dataMode.icon === "live"
    ? <StatusLiveIcon className="h-2.5 w-2.5" />
    : <StatusStaticIcon className="h-2.5 w-2.5" />;
  const derivationLine = provenance.statusLabel === "Live (high confidence)"
    ? "Derived from U.S. Treasury, inflation, labor, credit, and funding indicators updated every 15 minutes."
    : provenance.statusLabel === "Simulated (low)"
      ? "Derived from modeled U.S. Treasury and macro inputs while live coverage is unavailable."
      : "Derived from the latest U.S. Treasury and macro snapshots available this refresh.";

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
      label: "Decision as-of",
      value: <span className="mono text-slate-100">{provenance.recordDateLabel}</span>,
    },
    {
      label: "Data refreshed",
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
        <p className="text-xs text-slate-300">{derivationLine}</p>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className={`${dataMode.className} font-medium uppercase tracking-[0.12em]`}>
            <span aria-hidden="true">{dataModeIcon}</span>
            <span>{dataMode.label}</span>
          </span>
          <span className="h-1 w-1 rounded-full bg-slate-600" aria-hidden="true" />
          <span className="inline-flex min-h-[44px] items-center rounded-full border border-slate-700/75 bg-slate-900/70 px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-100">
            Confidence {confidencePct}%
          </span>
          <Popover.Root>
            <Popover.Trigger
              className={`weather-chip min-h-[44px] rounded-full border px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-colors hover:border-slate-500/80 ${
                statusStyle ?? "border-slate-700 text-slate-200"
              }`}
            >
              {provenance.statusLabel}
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner side="top" align="center" sideOffset={10}>
                <Popover.Popup className="w-[min(290px,calc(100vw-2rem))] rounded-xl border border-slate-700/80 bg-slate-950/95 px-3 py-3 text-xs text-slate-200 shadow-md">
                  <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-slate-300">Trust snapshot</p>
                  <p className="mt-1 text-sm text-slate-100">{statusDescription}</p>
                <div className="mt-2 space-y-1 text-[11px] text-slate-300">
                  <p><span className="text-slate-500">Confidence:</span> {confidencePct}%</p>
                    <p><span className="text-slate-500">Decision as-of:</span> {provenance.recordDateLabel}</p>
                    <p><span className="text-slate-500">Data refreshed:</span> {provenance.timestampLabel}</p>
                </div>
              </Popover.Popup>
            </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
          <ManualRefreshButton
            label="Refresh"
            title="Request a fresh snapshot for this provenance context."
            className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-200 hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
          />
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
    <div className="weather-surface space-y-2 rounded-2xl border-slate-800/80 bg-slate-950/50 px-4 py-3 text-[0.65rem] font-semibold text-slate-300 shadow-none">
      <p className="text-xs font-medium normal-case tracking-normal text-slate-300">{derivationLine}</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-slate-500 uppercase tracking-[0.14em]">{label}</span>
        <span className="h-1 w-1 rounded-full bg-slate-600" aria-hidden="true" />
        <span className={`${dataMode.className} font-medium uppercase tracking-[0.12em]`}>
          <span aria-hidden="true">{dataModeIcon}</span>
          <span>{dataMode.label}</span>
        </span>
        <span className="h-1 w-1 rounded-full bg-slate-600" aria-hidden="true" />
        <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-2 py-1 text-xs uppercase tracking-[0.12em] text-slate-200">
          Confidence {confidencePct}%
        </span>
        <Popover.Root>
          <Popover.Trigger
            className={`weather-chip rounded-full border px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] transition-colors hover:border-slate-500/80 ${
              statusStyle ?? "border-slate-700 text-slate-200"
            }`}
          >
            {provenance.statusLabel}
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner side="top" align="center" sideOffset={8}>
              <Popover.Popup className="w-[min(290px,calc(100vw-2rem))] rounded-xl border border-slate-700/80 bg-slate-950/95 px-3 py-3 text-xs text-slate-200 shadow-md">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-400">Trust snapshot</p>
                <p className="mt-1 text-sm text-slate-200">{statusDescription}</p>
                <div className="mt-2 space-y-1 text-[11px] text-slate-300">
                  <p><span className="text-slate-500">Confidence:</span> {confidencePct}%</p>
                  <p><span className="text-slate-500">Data age:</span> {provenance.ageLabel}</p>
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
        <ManualRefreshButton
          label="Refresh"
          title="Request a fresh snapshot for this provenance context."
          className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 touch-manipulation"
        />
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
