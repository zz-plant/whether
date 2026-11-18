import { MarkReadout } from "../ui/markReadout";
import type { ScoreMoveHistogram } from "../../../lib/report/marketMoveScale";
import { buildMonthBriefHref } from "../../../lib/timeMachine/monthFormatting";

/**
 * How big a move is, drawn (2026-11-18): every one-month move the record holds for the
 * score, as bars by whole points, with the move this group waits on marked. "It is 24
 * points away, a rare one-month move" asks the reader to trust the word; the bars show
 * the months piled at the left and the few past the mark. The bars past the mark are
 * drawn in the ink, the rest lighter: they are the months that moved that far, the count
 * the word is made from (`describeScoreMoveHistogram`, the same read the sentence's band
 * comes from).
 *
 * The months that did not move dwarf the rest (158 of 177 for funding pressure), so
 * where that bar would flatten every other it is drawn to the top with a break, and the
 * others stop short of it. Heights are relative; the caption states the domain.
 *
 * Each bar names its count on hover, focus or a tap (`MarkReadout`), and a bar of moves
 * is a link to the latest month that moved that far, in the time machine: "when did it
 * last move this much" is the question a bar raises. The bars are one tab stop. Links,
 * not buttons: the homepage's control budget holds (`scripts/check-home-load.ts`), and a
 * bar that opened nothing would be a button that does nothing. This sits in the picker's
 * client tree, so it imports only the model's type and the month href: a value import of
 * `marketMoveScale` would ship the month-end record to the browser.
 */

/** A bar this many times the tallest of the rest is drawn broken, at the top. */
const BREAK_AT = 1.5;
/** With a broken bar, the rest stop short of the top, so the broken one stands clear of them. */
const UNDER_BREAK = 70;

export function ScoreMoveBars({ move }: { move: ScoreMoveHistogram }) {
  const { bins } = move;
  const moved = bins.filter((bin) => bin.size > 0);
  const tallestMoved = Math.max(1, ...moved.map((bin) => bin.count));
  const still = bins[0]?.count ?? 0;
  const broken = still > tallestMoved * BREAK_AT;
  const cap = broken ? tallestMoved : Math.max(tallestMoved, still);
  const markAt = Math.ceil(move.points);
  const share = (markAt / bins.length) * 100;
  const markLabel = `${Number.isInteger(move.points) ? move.points : move.points.toFixed(1)} points`;
  const firstLinked = bins.find((bin) => bin.count > 0 && bin.latest)?.size;
  return (
    <figure data-score-move-bars className="space-y-1 pt-1">
      <MarkReadout className="block max-w-[18rem]">
        <div className="relative pt-4">
          {/* The move this group waits on: a rule at the first bar that moved that far, named beside it. */}
          <span
            aria-hidden="true"
            className={`absolute top-0 text-xs leading-none font-semibold whitespace-nowrap text-slate-200 tabular-nums ${share > 50 ? "-translate-x-full pr-1" : "pl-1"}`}
            style={{ left: `${share}%` }}
          >
            {markLabel}
          </span>
          <span
            aria-hidden="true"
            data-score-move-mark
            className="absolute top-0 bottom-0 border-l border-[color:var(--app-text)]"
            style={{ left: `${share}%` }}
          />
          <div className="flex h-11 items-end gap-px">
            {bins.map((bin) => {
              const tail = bin.size >= move.points;
              const height = bin.size === 0 && broken ? 100 : (Math.min(bin.count, cap) / cap) * (broken ? UNDER_BREAK : 100);
              const bar = (
                <span
                  aria-hidden="true"
                  className={`relative block w-full min-h-[2px] ${tail ? "bg-[var(--app-text)]" : "bg-[color:var(--border-strong)]"}`}
                  style={{ height: `${height}%` }}
                >
                  {bin.size === 0 && broken ? (
                    <span aria-hidden="true" className="absolute inset-x-0 top-[14%] h-[3px] -skew-y-12 bg-[var(--bg-body)]" />
                  ) : null}
                </span>
              );
              const column = "relative flex h-full min-w-0 flex-1 items-end";
              if (bin.count === 0) return <span key={bin.size} aria-hidden="true" className="h-full flex-1" />;
              /* The months that did not move: no single month to open, so a pointer names it and the caption counts it. */
              if (!bin.latest) {
                return (
                  <span key={bin.size} aria-hidden="true" data-mark={bin.label} data-score-move-bin={bin.size} className={column}>
                    {bar}
                  </span>
                );
              }
              return (
                <a
                  key={bin.size}
                  href={buildMonthBriefHref(bin.latest)}
                  tabIndex={bin.size === firstLinked ? 0 : -1}
                  aria-label={bin.label}
                  data-mark={bin.label}
                  data-score-move-bin={bin.size}
                  data-month={bin.latest.slice(0, 7)}
                  className={`${column} hover:[&>span]:opacity-80`}
                >
                  {bar}
                </a>
              );
            })}
          </div>
        </div>
      </MarkReadout>
      <div aria-hidden="true" className="flex max-w-[18rem] justify-between text-xs leading-none text-slate-400 tabular-nums">
        <span>0</span>
        <span>{bins.length - 1}</span>
      </div>
      <figcaption className="text-xs leading-snug text-slate-400">{move.caption}</figcaption>
    </figure>
  );
}
