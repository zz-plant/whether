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
import {
  PROVENANCE_CATALOG_STATUS,
  PROVENANCE_FALLBACK_STATUS,
  PROVENANCE_STATUS,
  type ProvenanceStripStatus,
  type ReportProvenance,
} from "../../lib/report/provenanceStatus";
import { StatusLiveIcon, StatusStaticIcon } from "./uiIcons";
import { Tag } from "./ui/tag";

export type DataProvenance = ReportProvenance;

type StatusPresentation = {
  /** Tag tone tracks the confidence tier the label itself states. */
  tone: "emerald" | "amber" | "rose" | "slate";
  dataMode: { label: string; live: boolean };
};

/**
 * Keyed on every label the loader can produce, so a status without an entry is
 * a type error here. These tables used to be keyed on five labels nothing
 * produced ("Archived snapshot (high)", "Fallback active (low)", ...): only
 * "Live" matched, and every other reading rendered a grey tag and a generic
 * "Static · snapshot" chip.
 *
 * Tone is monotonic in trust (high = emerald, medium = amber, low = rose);
 * live-vs-static is carried separately by the data-mode chip's icon. The
 * playbook catalog is not a reading, so it gets no trust colour.
 */
export const STATUS_PRESENTATION = {
  [PROVENANCE_STATUS.live]: { tone: "emerald", dataMode: { label: "Dynamic · live feed", live: true } },
  [PROVENANCE_STATUS.canonical]: { tone: "emerald", dataMode: { label: "Static · scheduled refresh", live: false } },
  [PROVENANCE_STATUS.cached]: { tone: "amber", dataMode: { label: "Static · cached reading", live: false } },
  [PROVENANCE_STATUS.historicalAligned]: { tone: "amber", dataMode: { label: "Static · historical archive", live: false } },
  [PROVENANCE_STATUS.historicalPartial]: { tone: "amber", dataMode: { label: "Static · historical archive", live: false } },
  [PROVENANCE_STATUS.treasuryOnly]: { tone: "rose", dataMode: { label: "Static · historical archive", live: false } },
  [PROVENANCE_STATUS.simulated]: { tone: "rose", dataMode: { label: "Static · historical archive", live: false } },
  [PROVENANCE_FALLBACK_STATUS.cached]: { tone: "rose", dataMode: { label: "Static · fallback source", live: false } },
  [PROVENANCE_FALLBACK_STATUS.unavailable]: { tone: "rose", dataMode: { label: "Static · fallback source", live: false } },
  [PROVENANCE_CATALOG_STATUS]: { tone: "slate", dataMode: { label: "Static · curated catalog", live: false } },
} as const satisfies Record<ProvenanceStripStatus, StatusPresentation>;

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
  const { tone: statusTone, dataMode }: StatusPresentation = STATUS_PRESENTATION[provenance.statusLabel];
  const dataModeClassName = `weather-data-mode ${dataMode.live ? "weather-data-mode-dynamic" : "weather-data-mode-static"}`;
  const dataModeIcon = dataMode.live
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
        <span className={`${dataModeClassName} type-badge`}>
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
