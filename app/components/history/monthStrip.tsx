import { REGIME_LABELS, REGIME_SEVERITY_RANK, isRegimeKey } from "../../../lib/regimePresentation";
import { regimeDataAttribute } from "../../../lib/regimeAccent";
import { countRecord } from "../../../lib/report/trackRecord";
import { ConditionIcon } from "../ui/conceptIcons";
import { regimeSignalLabel } from "../../../lib/report/signalTranslations";

/**
 * The record's answer in one band: every month coloured by the call, the
 * changes marked, the current run annotated. /history used to open with the
 * two-axis phase map, which a first-time reader has to learn before it says
 * anything; this is legible in a second, and the phase map explains it below.
 *
 * Each segment carries `data-regime`, so its colour comes from the same
 * token the page shells use (`--regime-accent`), never a per-component table.
 */
/** The two scores are optional: a caller with them gets them in each month's hover title. */
type MonthStripEntry = { recordDate: string; regime: string; tightness?: number; riskAppetite?: number };

/**
 * An event placed on the band, against the month-end it was recorded against.
 * The strip doesn't know what the event is — the caller supplies the shape's
 * fill and the tooltip, so the band carries no second vocabulary (2026-10-21).
 */
type MonthStripMarker = {
  recordDate: string;
  label: string;
  /** Fill class for the diamond; the caller's meaning owns the colour. */
  fillClassName: string;
};

const monthTitle = (entry: MonthStripEntry) => {
  const conditions = `${monthLabel(entry.recordDate)}: ${isRegimeKey(entry.regime) ? REGIME_LABELS[entry.regime] : entry.regime}`;
  return typeof entry.tightness === "number" && typeof entry.riskAppetite === "number"
    ? `${conditions} · ${regimeSignalLabel.tightness} ${entry.tightness}, ${regimeSignalLabel.riskAppetite} ${entry.riskAppetite}`
    : conditions;
};

type MonthStripProps = {
  entries: readonly MonthStripEntry[];
  /** Events placed on the band, one diamond per event, stacked where a month holds several. */
  markers?: readonly MonthStripMarker[];
  /** What a diamond is, printed under the band when there are any. The caller's words; the strip has none. */
  markersLegend?: string | null;
  className?: string;
};

const monthLabel = (recordDate: string) =>
  new Date(`${recordDate}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

export const describeCurrentRun = (entries: readonly MonthStripEntry[]) => {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
  const latest = sorted[sorted.length - 1];
  let held = 0;
  for (let i = sorted.length - 1; i >= 0 && sorted[i].regime === latest.regime; i -= 1) held += 1;
  const label = isRegimeKey(latest.regime) ? REGIME_LABELS[latest.regime] : latest.regime;
  return { label, held, since: sorted[sorted.length - held].recordDate, latest: latest.recordDate };
};

/* A run's glyph needs room for 16px and some air: 8% of the band is 28px in a
   358px phone column; from `sm` the band is at least ~600px, so 3% (18px) fits. */
const RUN_GLYPH_MIN_SHARE = 0.08;
const RUN_GLYPH_MIN_SHARE_SM = 0.03;

/** Consecutive months under one condition, as start index and length. */
const stripRuns = (sorted: readonly MonthStripEntry[]) => {
  const runs: { regime: string; start: number; length: number }[] = [];
  sorted.forEach((entry, index) => {
    const last = runs[runs.length - 1];
    if (last && last.regime === entry.regime) last.length += 1;
    else runs.push({ regime: entry.regime, start: index, length: 1 });
  });
  return runs;
};

export function MonthStrip({ entries, markers, markersLegend, className = "" }: MonthStripProps) {
  const sorted = [...entries].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
  const run = describeCurrentRun(sorted);
  if (!run) return null;
  /* The one count every page prints (`countRecord`), so this strip, the track
     record and /calibration cannot disagree about how often conditions changed. */
  const changes = countRecord(sorted)?.changes ?? 0;
  /* The key. Colour alone named nothing: the month names were tooltips on an
     aria-hidden band, so a sighted reader could not tell which past runs were
     which. Each condition that appears, mildest first, with its month count. */
  const counts = new Map<string, number>();
  for (const entry of sorted) counts.set(entry.regime, (counts.get(entry.regime) ?? 0) + 1);
  const legend = [...counts.entries()].sort(
    ([left], [right]) =>
      (isRegimeKey(left) ? REGIME_SEVERITY_RANK[left] : 99) - (isRegimeKey(right) ? REGIME_SEVERITY_RANK[right] : 99),
  );
  /*
   * Placed against the month-end each event was recorded against — the last
   * month-end at or before its date, or the band's first when the event
   * predates the record. Several in one month stack upward, so the band stays
   * one row tall.
   */
  const placedMarkers = (markers ?? []).map((marker, index, all) => {
    let slot = sorted.findIndex((entry) => entry.recordDate.localeCompare(marker.recordDate) >= 0);
    if (slot === -1) slot = sorted.length - 1;
    if (sorted[slot].recordDate.localeCompare(marker.recordDate) > 0 && slot > 0) slot -= 1;
    const sameSlotBefore = all.slice(0, index).filter((other) => other.recordDate === marker.recordDate).length;
    return {
      ...marker,
      left: ((slot + 0.5) / sorted.length) * 100,
      stack: sameSlotBefore,
    };
  });
  return (
    <figure className={`space-y-2 ${markers?.length ? "mt-7 " : ""}${className}`.trim()} data-month-strip>
      <p className="sr-only">
        Conditions by month, {monthLabel(sorted[0].recordDate)} to {monthLabel(run.latest)}: {changes}{" "}
        {changes === 1 ? "change" : "changes"}; {run.label} held {run.held} {run.held === 1 ? "month" : "months"}.
        {placedMarkers.length > 0
          ? ` ${placedMarkers.length} ${placedMarkers.length === 1 ? "event is" : "events are"} marked against the months they were recorded in.`
          : null}
      </p>
      <div className="relative" aria-hidden="true">
        {placedMarkers.map((marker, index) => (
          <span
            key={`${marker.recordDate}-${index}`}
            data-month-strip-marker
            title={marker.label}
            className={`absolute h-2.5 w-2.5 rotate-45 rounded-[2px] ring-1 ring-[color:var(--bg-body)] ${marker.fillClassName}`}
            style={{
              left: `calc(${marker.left}% - 5px)`,
              top: `${-11 - marker.stack * 11}px`,
            }}
          />
        ))}
        <div className="flex h-6 w-full overflow-hidden rounded-md">
          {sorted.map((entry, index) => {
            const changed = index > 0 && entry.regime !== sorted[index - 1].regime;
            return (
              <span
                key={entry.recordDate}
                data-regime={regimeDataAttribute(entry.regime)}
                className={`h-full flex-1 bg-[var(--regime-accent)] ${changed ? "border-l border-[var(--bg-body)]" : ""}`}
                title={monthTitle(entry)}
              />
            );
          })}
        </div>
        {/* Each long run carries its condition's glyph, so the band reads without
            colour. Under the old hues Freezing and Stormy were one grey in
            greyscale; the Synoptic fills differ in lightness, but Sunny and
            Stormy still sit close in grey. Dark ink on the condition's fill in
            both themes (3.1:1 on Freezing, the lowest); runs too short for a
            16px glyph are named by the key below. */}
        {stripRuns(sorted).map((run) => {
          const share = run.length / sorted.length;
          return isRegimeKey(run.regime) && share >= RUN_GLYPH_MIN_SHARE_SM ? (
            <ConditionIcon
              key={run.start}
              regime={run.regime}
              data-strip-run-glyph
              className={`pointer-events-none absolute top-1 -translate-x-1/2 text-black/70 ${share < RUN_GLYPH_MIN_SHARE ? "max-sm:hidden" : ""}`}
              style={{ left: `${((run.start + run.length / 2) / sorted.length) * 100}%` }}
            />
          ) : null;
        })}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300" aria-label="Months under each condition">
        {legend.map(([regime, months]) => (
          <li key={regime} className="flex items-center gap-1.5">
            {/* The glyph is the key's swatch: it carries the condition's ink
                and its shape, so a run in the band is matched by either. */}
            {isRegimeKey(regime) ? (
              <ConditionIcon regime={regime} />
            ) : (
              <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-500" />
            )}
            {isRegimeKey(regime) ? REGIME_LABELS[regime] : regime}
            <span className="tabular-nums text-slate-500">{months} {months === 1 ? "month" : "months"}</span>
          </li>
        ))}
      </ul>
      {/* The band's domain, and nothing the page states elsewhere (2026-10-09).
          It also printed "7 changes in conditions" and "Cloudy, held 1 month
          since Sep 2026", which /history prints in the track record's tiles and
          the intro's stamp; the sentence above the band keeps both for a screen
          reader, which has no other text for the picture. */}
      <figcaption className="text-xs text-slate-400">
        {monthLabel(sorted[0].recordDate)} &ndash; {monthLabel(run.latest)}
        {markersLegend && placedMarkers.length > 0 ? (
          <span className="block" data-month-strip-marker-legend>
            {markersLegend}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
