import Link from "next/link";
import { formatMonthShortUtc } from "../../../lib/formatters";
import { REGIME_HEX_COLORS } from "../../../lib/regimePhaseSpace";
import {
  REGIME_ORDER,
  REGIME_WEATHER_LABELS,
  getRegimePublicLabel,
  isRegimeKey,
} from "../../../lib/regimePresentation";
import type { RegimeKey } from "../../../lib/types";

interface PostureHistoryEntry {
  record_date: string;
  regime: string;
  tightness?: number | null;
  riskAppetite?: number | null;
}

interface RecentPostureHistoryCardProps {
  history: PostureHistoryEntry[];
  historyHref?: string;
  className?: string;
}

/* Same hue per regime as the regime plane on /history and the hero's own
   stamp — the reader learns the four colours once. Until 2026-09-15 this
   stripe folded Freezing and Stormy into one rose and painted Sunny teal, and
   its legend named the rose "Stormy" under two years of Freezing months. */
const resolveRegimeKey = (regime: string): RegimeKey | null => {
  const norm = regime.toUpperCase();
  return isRegimeKey(norm) ? norm : null;
};

const regimeSwatchColor = (regime: RegimeKey | null) =>
  regime ? REGIME_HEX_COLORS[regime] : "var(--app-text-muted)";

/**
 * The brief's memory rail: the trailing two years of monthly calls as a stripe,
 * and a link to the record. That is all it is now. The "vs. prior read" chips
 * and the side-by-side comparison it used to carry restated the hero's own
 * What-changed rows, and the placeholder months it drew when the history was
 * empty were invented data — an empty history renders nothing.
 */
export function RecentPostureHistoryCard({
  history,
  historyHref = "/history",
  className = "",
}: RecentPostureHistoryCardProps) {
  const entries = history.slice(-24);
  if (entries.length === 0) return null;

  // Only the regimes the stripe actually shows, in the canonical order.
  const present = new Set(entries.map((entry) => resolveRegimeKey(entry.regime)));
  const legend = REGIME_ORDER.filter((regime) => present.has(regime));

  // Pick ~6 evenly spaced indices for month labels across the stripe.
  const labelIndices = new Set<number>();
  const total = entries.length;
  if (total <= 6) {
    for (let i = 0; i < total; i += 1) labelIndices.add(i);
  } else {
    const step = Math.floor(total / 5);
    for (let i = 0; i < total; i += step) {
      labelIndices.add(i);
    }
    labelIndices.add(total - 1);
  }

  return (
    <section
      aria-labelledby="recent-posture-history-heading"
      className={`weather-brief-card p-5 sm:p-6 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3
            id="recent-posture-history-heading"
            className="text-sm font-semibold tracking-tight text-white"
          >
            Recent posture history
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Monthly calls, most recent on the right
          </p>
        </div>

        <div className="flex items-center gap-4 self-start sm:self-auto flex-wrap">
          <div className="flex items-center gap-3 text-xs text-slate-400" aria-label="Regime legend">
            {legend.map((regime) => (
              <span key={regime} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: regimeSwatchColor(regime) }}
                  aria-hidden="true"
                />
                <span>{REGIME_WEATHER_LABELS[regime]}</span>
              </span>
            ))}
          </div>

          <Link
            href={historyHref}
            className="inline-flex items-center gap-1 text-xs font-medium text-teal-300 hover:text-teal-200 transition-colors rounded-md px-2.5 py-1 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 no-underline"
          >
            <span>View history</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <div className="space-y-1.5">
        <div
          aria-label="Recent monthly posture history bar"
          className="flex h-4 w-full gap-0.5 rounded-sm overflow-hidden bg-slate-800/60 p-0.5"
        >
          {entries.map((entry, idx) => {
            const publicLabel = getRegimePublicLabel(entry.regime);
            const dateStr = entry.record_date.slice(0, 10);
            return (
              <div
                key={`${entry.record_date}-${idx}`}
                className="flex-1 h-full rounded-[1px] opacity-90 transition-opacity hover:opacity-100"
                style={{ backgroundColor: regimeSwatchColor(resolveRegimeKey(entry.regime)) }}
                title={`${dateStr}: ${publicLabel} (${entry.regime})`}
              />
            );
          })}
        </div>

        <div className="flex justify-between text-[11px] text-slate-500 tabular-nums px-0.5" aria-hidden="true">
          {entries.map((entry, idx) => {
            if (!labelIndices.has(idx)) return null;
            const d = new Date(entry.record_date);
            const label = idx === 0 || idx === total - 1
              ? `${formatMonthShortUtc(d.getUTCMonth() + 1)} ${d.getUTCFullYear()}`
              : formatMonthShortUtc(d.getUTCMonth() + 1);
            return (
              <span key={`lbl-${entry.record_date}-${idx}`}>
                {label}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
