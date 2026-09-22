/**
 * Data provenance strip for surfacing source, freshness, and live status inline.
 * Keeps each Capital Posture Governance section traceable at the point of interpretation.
 *
 * Informational only, as the name says. It used to carry a "Refresh" pill titled
 * "Request a fresh snapshot for this provenance context", which called
 * `window.location.reload()`. This component mounts at eleven call sites, so a
 * single `/operate` or `/signals` view showed several of them — each reading as
 * scoped to its own panel, each reloading the document and discarding unsaved
 * plan text and planner inputs elsewhere on the page. The page-level retry lives
 * on `LiveDataFallbackAlert`, where the whole brief is the unit being retried.
 *
 * What it stopped carrying on 2026-09-22, and why:
 * - "Confidence 92%": a status → percent table (100/92/64/52/28) with no
 *   measurement behind it, stamped on eight panels beside the real confidence
 *   label. A figure that is a lookup of the label next to it is the label
 *   printed twice, once as a number nobody computed.
 * - "Streaming feeds updated within the last 24 hours" / "updated every 15
 *   minutes": claims about the pipeline, on a reader surface. The four rows
 *   below say when the reading was taken and how old it is, which is what a
 *   reader can act on.
 * - Two near-copies of one layout (`compact` and `full`), which differed in
 *   padding, in which two of the four rows the popover restated, and in the
 *   number of columns. One render; the variant is the column count.
 */
import { StatusLiveIcon, StatusStaticIcon } from "./uiIcons";
import { Tag } from "./ui/tag";

export type DataProvenance = {
  sourceLabel: string;
  sourceUrl?: string;
  recordDateLabel: string;
  timestampLabel: string;
  ageLabel: string;
  statusLabel: string;
};

// Tag tone tracks the confidence tier the label states (high = emerald,
// medium = amber, low = rose) so the hue is monotonic in trust. Live-vs-static
// is carried separately by the data-mode chip's circle/square icon.
const statusTones: Record<string, "emerald" | "amber" | "rose"> = {
  "Live (high confidence)": "emerald",
  "Archived snapshot (high)": "emerald",
  "Previously cached (medium)": "amber",
  "Fallback active (low)": "rose",
  "Modeled estimate (low)": "rose",
};

const statusDataMode: Record<string, { label: string; icon: string; className: string }> = {
  "Live (high confidence)": {
    label: "Dynamic · live feed",
    icon: "live",
    className: "weather-data-mode weather-data-mode-dynamic",
  },
  "Archived snapshot (high)": {
    label: "Static · historical archive",
    icon: "static",
    className: "weather-data-mode weather-data-mode-static",
  },
  "Previously cached (medium)": {
    label: "Static · cached reading",
    icon: "static",
    className: "weather-data-mode weather-data-mode-static",
  },
  "Fallback active (low)": {
    label: "Static · fallback source",
    icon: "static",
    className: "weather-data-mode weather-data-mode-static",
  },
  "Modeled estimate (low)": {
    label: "Static · model estimate",
    icon: "static",
    className: "weather-data-mode weather-data-mode-static",
  },
};

const ROW_COLUMNS = {
  full: "sm:grid-cols-2 xl:grid-cols-4",
  compact: "sm:grid-cols-2",
} as const;

export const DataProvenanceStrip = ({
  provenance,
  label = "Data source",
  variant = "full",
}: {
  provenance: DataProvenance;
  label?: string;
  variant?: "full" | "compact";
}) => {
  const statusTone = statusTones[provenance.statusLabel] ?? "slate";
  const dataMode =
    statusDataMode[provenance.statusLabel] ?? {
      label: "Static · snapshot",
      icon: "static",
      className: "weather-data-mode weather-data-mode-static",
    };

  const dataModeIcon = dataMode.icon === "live"
    ? <StatusLiveIcon className="h-2.5 w-2.5" />
    : <StatusStaticIcon className="h-2.5 w-2.5" />;

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
      value: <span className="tabular-nums text-slate-100">{provenance.recordDateLabel}</span>,
    },
    {
      label: "Data refreshed",
      value: <span className="tabular-nums text-slate-100">{provenance.timestampLabel}</span>,
    },
    {
      label: "Data age",
      value: <span className="tabular-nums text-slate-100">{provenance.ageLabel}</span>,
    },
  ] as const;

  /* A bordered row inside a panel, not a `weather-surface`: the panel it sits
     in owns the elevation (ui-ux-standards §XIII), so this draws a rule and
     nothing that lifts. */
  return (
    <div className="space-y-2 rounded-md border border-[color:var(--border-subtle)] px-4 py-3 text-xs text-slate-300">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-slate-400 type-eyebrow">{label}</span>
        <span className={`${dataMode.className} type-badge`}>
          <span aria-hidden="true">{dataModeIcon}</span>
          <span>{dataMode.label}</span>
        </span>
        <Tag tone={statusTone}>{provenance.statusLabel}</Tag>
      </div>
      <div className={`grid gap-2 text-xs text-slate-200 ${ROW_COLUMNS[variant]}`}>
        {provenanceRows.map((row) => (
          <p key={row.label} className="space-y-1">
            <span className="block type-eyebrow">{row.label}</span>
            <span className="block tracking-normal normal-case">{row.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
};
