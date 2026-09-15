import type { RegimeSignalIndicator } from "../../../lib/report/homeBriefModel";
import type { RevisitQueueItem } from "../../../lib/report/homeBriefModel";
import { Sparkline } from "../ui/sparkline";
import { TrendGlyph, trendDirectionFromArrow, trendToneClass } from "../illustrations/TrendGlyph";

/**
 * Which way "up" counts for each signal. Funding pressure and the base rate
 * worsen as they rise; risk appetite and the curve slope improve.
 */
const INCREASE_IS_POSITIVE: Record<string, boolean> = {
  tightness: false,
  baseRate: false,
  riskAppetite: true,
  curveSlope: true,
};

/**
 * The move as a record, not a sentence: name, reading, signed delta with a
 * direction glyph, and the trailing window as a sparkline. The sentence the
 * model wrote survives for assistive tech and copy, where a row of chips
 * does not read aloud.
 */
const SignalMoveRow = ({ signal, headline }: { signal: RegimeSignalIndicator; headline: string }) => {
  const direction = trendDirectionFromArrow(signal.trendArrow);
  const tone = trendToneClass(direction, INCREASE_IS_POSITIVE[signal.key] ?? false);
  const points = signal.sparkline.map((value, index) => ({ label: String(index), value }));
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="sr-only">{headline}</span>
      <span aria-hidden="true" className="min-w-[9rem] font-medium text-slate-200">{signal.label}</span>
      <span aria-hidden="true" className="tabular-nums font-semibold text-slate-100">{signal.valueLabel}</span>
      <span aria-hidden="true" className={`inline-flex items-center gap-1 tabular-nums ${tone}`}>
        <TrendGlyph direction={direction} className="h-3 w-3" />
        {signal.trendDeltaLabel}
      </span>
      {points.length >= 2 ? (
        <span aria-hidden="true" className="ml-auto text-white/50">
          <Sparkline points={points} label={signal.label} widthEm={5} tone={direction === "up" ? (INCREASE_IS_POSITIVE[signal.key] ? "easing" : "tightening") : direction === "down" ? (INCREASE_IS_POSITIVE[signal.key] ? "tightening" : "easing") : "unchanged"} />
        </span>
      ) : null}
    </span>
  );
};

/**
 * The week as a change report: what moved, what that changes for the reader, and
 * what it leaves alone.
 *
 * This replaces a single "What needs reconsideration this week?" list. That list
 * rendered `item.recheck || item.reason` per area, which dropped the signal move
 * entirely on a multi-item week — `reason` is `driver + recheck`, and `recheck`
 * won the `||`. So the one block whose job is the weekly delta could show three
 * instructions with nothing saying what had changed to prompt them.
 *
 * `RevisitQueueItem.driver` already carries that sentence and its doc comment
 * asks renderers listing several items to hoist the shared driver rather than
 * repeat it — one signal maps to up to three areas. Grouping by driver is that
 * hoist, and it is what produces the two upper bands: the driver is the change,
 * its group is the consequence.
 *
 * Movement is read from `signalIndicators` rather than from the queue, because
 * the queue is empty on a week that moved without changing a rule
 * (`revisitDecisions` is false when the direction is "stable"). A week like that
 * still has to say what moved, and say that nothing followed from it.
 */

type WeeklyChange = {
  key: string;
  /** Plain-English sentence for the move, from the model where one exists. */
  headline: string;
  signal: RegimeSignalIndicator | undefined;
  consequences: RevisitQueueItem[];
  /**
   * True when this move reopened nothing of its own because another, larger
   * move claimed every area first. `buildRevisitQueue` hands each area to one
   * driver, so on a week where both inputs cross their lines the second row
   * arrives empty — and "stayed inside every threshold" would then be false.
   */
  claimedByLargerMove: boolean;
};

/**
 * Movement worth a row.
 *
 * Three ways a signal fails to qualify. It has no prior read (`isFallback`), so
 * there is no delta to report — not a flat one. Its arrow is flat. Or its own
 * published delta rounds to zero at the one decimal it reports: `formatTrendArrow`
 * returns "→" only for an exact 0, so a -0.04 arrives here as "↓" beside the
 * label "-0.0 vs last week", and a change report that lists a move its own
 * evidence row shows as no move is the kind of noise that stops the block being
 * read at all.
 */
const ROUNDS_TO_ZERO = /^[+-]?0\.0(\D|$)/;

const hasMoved = (indicator: RegimeSignalIndicator) =>
  !indicator.isFallback &&
  indicator.trendArrow !== "→" &&
  !ROUNDS_TO_ZERO.test(indicator.trendDeltaLabel);

const signalSentence = (indicator: RegimeSignalIndicator) =>
  `${indicator.label} ${indicator.trendArrow === "↑" ? "rose" : "fell"} to ${indicator.valueLabel} (${indicator.trendDeltaLabel}).`;

/**
 * Queue items grouped by the signal move that put them there, in queue order so
 * the largest mover leads — `buildRevisitQueue` sorts its drivers by absolute
 * delta before assigning areas.
 */
const groupByDriver = (revisitQueue: readonly RevisitQueueItem[]) => {
  const groups = new Map<string, RevisitQueueItem[]>();
  for (const item of revisitQueue) {
    const driver = item.driver ?? "";
    const existing = groups.get(driver);
    if (existing) existing.push(item);
    else groups.set(driver, [item]);
  }
  return groups;
};

const buildChangeRows = (
  revisitQueue: readonly RevisitQueueItem[],
  signalIndicators: readonly RegimeSignalIndicator[],
): WeeklyChange[] => {
  const movedSignals = signalIndicators.filter(hasMoved);
  const groups = groupByDriver(revisitQueue);
  const rows: WeeklyChange[] = [];
  const claimedSignals = new Set<string>();

  for (const [driver, items] of groups) {
    if (!driver) continue;
    // The driver sentence names its signal ("Funding pressure rose 3 points
    // this week."), so the reading that backs it is the indicator whose label
    // that sentence opens with. Matching on the label keeps the pairing to one
    // rule rather than a second key mapping that could drift from the first.
    const signal = movedSignals.find((indicator) => driver.startsWith(indicator.label));
    if (signal) claimedSignals.add(signal.key);
    rows.push({ key: signal?.key ?? driver, headline: driver, signal, consequences: items, claimedByLargerMove: false });
  }

  // Moves that changed no rule. Named, with the consequence band left empty, so
  // "nothing follows from this" is a statement rather than an omission. When a
  // larger move already claimed every area, the empty band means something else,
  // and the row says which.
  const someAreaClaimed = rows.some((row) => row.consequences.length > 0);
  for (const indicator of movedSignals) {
    if (claimedSignals.has(indicator.key)) continue;
    rows.push({
      key: indicator.key,
      headline: signalSentence(indicator),
      signal: indicator,
      consequences: [],
      claimedByLargerMove: someAreaClaimed,
    });
  }

  // Any queue item whose driver the model could not name still has to appear —
  // it is a decision the reader is being asked to revisit.
  const undriven = groups.get("") ?? [];
  if (undriven.length > 0) {
    rows.push({
      key: "undriven",
      headline: "Conditions moved enough to reopen these decisions.",
      signal: undefined,
      consequences: undriven,
      claimedByLargerMove: false,
    });
  }

  return rows;
};

/**
 * One change, with its evidence a disclosure away.
 *
 * Its own component because the list item was the deepest thing on the page:
 * `section > div > div > ul > li > details > dl > dd`, and reading the map body
 * meant holding eight open tags in your head to find the one conditional that
 * mattered.
 */
const ChangeRow = ({
  row,
  recordDate,
  sourceLabel,
}: {
  row: WeeklyChange;
  recordDate: string;
  sourceLabel: string;
}) => (
  <li>
    {row.signal ? (
      /* Plain `details`, not the shared `Details` surface: these
         are compact rows inside a card, and the surface variant
         brings its own panel padding and border. No client state
         either — evidence opens with JS off. */
      <details className="weather-auto-chevron group">
        <summary className="cursor-pointer select-none rounded-sm py-0.5 text-fluid-xs leading-5 text-slate-200 weather-focus-ring">
          <SignalMoveRow signal={row.signal} headline={row.headline} />
        </summary>
        <dl className="mt-1 ml-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 border-l border-white/[0.08] py-1 pl-3 text-fluid-nano">
          <dt className="text-white/45">Reading</dt>
          <dd className="tabular-nums text-slate-300">{row.signal.valueLabel}</dd>
          <dt className="text-white/45">Movement</dt>
          <dd className="tabular-nums text-slate-300">
            {row.signal.trendArrow} {row.signal.trendDeltaLabel}
          </dd>
          <dt className="text-white/45">As of</dt>
          <dd className="text-slate-300">{recordDate}</dd>
          <dt className="text-white/45">Source</dt>
          <dd className="text-slate-300">{sourceLabel}</dd>
          <dt className="text-white/45">Changes</dt>
          <dd className="text-slate-300">
            {row.consequences.length > 0
              ? row.consequences.map((item) => item.label).join(" · ")
              : row.claimedByLargerMove
                ? "The decisions it reopens are listed under the larger move above."
                : "No rule this week — the move stayed inside every threshold."}
          </dd>
        </dl>
      </details>
    ) : (
      <p className="py-0.5 text-fluid-xs leading-5 text-slate-200">{row.headline}</p>
    )}
  </li>
);

const BandHeading = ({ children }: { children: React.ReactNode }) => (
  <p className="text-fluid-nano type-eyebrow text-white/50">{children}</p>
);

export function WeeklyChangeReport({
  revisitDecisions,
  revisitQueue = [],
  noChangeAreas = [],
  signalIndicators = [],
  recordDate,
  sourceLabel,
}: {
  revisitDecisions: boolean;
  revisitQueue?: readonly RevisitQueueItem[];
  noChangeAreas?: readonly string[];
  signalIndicators?: readonly RegimeSignalIndicator[];
  recordDate: string;
  sourceLabel: string;
}) {
  const rows = buildChangeRows(revisitQueue, signalIndicators);
  const consequenceCount = revisitQueue.length;
  const attention = revisitDecisions && consequenceCount > 0;

  /*
   * A week where nothing moved is one line plus the unchanged list. The three
   * band headings on such a week label two empty sections and one list, which
   * costs the reader three headings to learn there is nothing to do.
   */
  const quiet = rows.length === 0 && !attention;

  /*
   * The same nested surface as the "Why this call" and "Watch this week" panels
   * under it. It used to be a full amber (or emerald) box with a glow, which
   * made it a second coloured region competing with the regime-tinted card it
   * sits in; the state is carried by the dot and the stamp, which is where the
   * eye checks it anyway.
   */
  return (
    <section
      data-testid="weekly-top-fold"
      aria-label="What changed this week"
      className="rounded-lg border border-slate-800/60 bg-slate-950/30 p-3.5"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-fluid-xs font-semibold text-slate-100">
          <span className={`inline-block size-2 rounded-full ${attention ? "bg-amber-400" : "bg-emerald-400"}`} />
          What changed this week?
        </p>
        <span
          className={`shrink-0 rounded-sm border px-2.5 py-0.5 text-fluid-nano font-semibold uppercase tracking-[0.08em] ${
            attention
              ? "border-amber-500/40 bg-amber-500/20 text-semantic-caution-fg"
              : "border-emerald-500/40 bg-emerald-500/20 text-semantic-easing-fg"
          }`}
        >
          {attention ? `${consequenceCount} rules to recheck` : "No change"}
        </span>
      </div>

      {quiet ? (
        <p className="mt-2 text-fluid-xs leading-5 text-slate-300">
          No signal moved enough to register against last week, so every rule below stands as
          written.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <BandHeading>What changed</BandHeading>
            {rows.length === 0 ? (
              <p className="text-fluid-xs leading-5 text-slate-300">
                No signal moved enough to register against last week.
              </p>
            ) : (
              <ul className="space-y-1">
                {rows.map((row) => (
                  <ChangeRow
                    key={row.key}
                    row={row}
                    recordDate={recordDate}
                    sourceLabel={sourceLabel}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-1.5">
            <BandHeading>What that changes for you</BandHeading>
            {consequenceCount === 0 ? (
              <p className="text-fluid-xs leading-5 text-slate-300">
                Nothing. The moves above stayed inside every threshold, so no decision reopens.
              </p>
            ) : (
              <ul className="grid gap-1 text-fluid-xs sm:grid-cols-2">
                {revisitQueue.map((item) => (
                  <li key={item.id} className="text-slate-300">
                    <span className="font-semibold text-slate-100">{item.label}:</span> {item.recheck}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {noChangeAreas.length > 0 ? (
            <div className="space-y-1.5 border-t border-white/[0.06] pt-2.5">
              <BandHeading>What stays the same</BandHeading>
              <p className="text-fluid-nano leading-5 text-white/50">{noChangeAreas.join(" · ")}</p>
            </div>
          ) : null}
        </div>
      )}

      {quiet && noChangeAreas.length > 0 ? (
        <p className="mt-2 border-t border-white/[0.06] pt-2 text-fluid-nano leading-5 text-white/45">
          <span className="font-semibold text-slate-400">Unchanged:</span> {noChangeAreas.join(" · ")}
        </p>
      ) : null}
    </section>
  );
}
