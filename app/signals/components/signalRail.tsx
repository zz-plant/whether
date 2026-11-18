import type { ReactNode } from "react";
import type { SignalReferenceRow } from "../../../lib/report/evidenceReaderModel";
import { formatPoints } from "../../components/ui/scoreCell";

/**
 * One row's reading against its line, drawn (2026-11-18). The table's rows are small
 * multiples: every rail the same width, each on its own stated scale (`row.scale`), the
 * easier side on the right as on every score ladder, so the side that counts against a
 * company is on the left on every row, and a rail drawn high to low says so at its ends.
 * The reading is the ring, the earlier reading the hollow dot, the line a tick with its
 * number, and the span past the line on the hard side is shaded.
 *
 * The numbers stay beside it as its caption (`children`, the row's `ScoreCell`): the
 * rail is that cell drawn, from the same row, so it is hidden from assistive tech and
 * the caption reads.
 */
const percentOn = (value: number, { min, max }: SignalReferenceRow["scale"], reversed: boolean) => {
  const clamped = Math.min(max, Math.max(min, value));
  const share = ((clamped - min) / (max - min)) * 100;
  return Math.round((reversed ? 100 - share : share) * 100) / 100;
};

export function SignalRail({ row, value, children }: { row: SignalReferenceRow; value: number; children: ReactNode }) {
  const { scale, line, units, betterWhen } = row;
  /* Easier on the right: a signal that is worse higher runs high to low. */
  const reversed = betterWhen === "lower";
  const at = (point: number) => percentOn(point, scale, reversed);
  const format = (point: number) => `${formatPoints(point, units.decimals)}${units.suffix ?? ""}`;
  /* The scale's ends are round numbers, and print as they are: 6%, not 6.00%. */
  const formatEnd = (point: number) => `${formatPoints(point, 1)}${units.suffix ?? ""}`;
  const lineAt = at(line.value);
  /* The hard side of the line is the left on every rail. */
  const hard = { left: 0, width: lineAt };
  const crossed = betterWhen === "lower" ? value > line.value : value < line.value;
  const isScore = row.key === "tightness" || row.key === "riskAppetite";
  const previous = row.previous !== null && row.previous !== value ? row.previous : null;
  const ends: readonly [number, number] = reversed ? [scale.max, scale.min] : [scale.min, scale.max];
  return (
    <figure className="w-[15rem] max-w-full" data-signal-rail={row.key}>
      <div className="relative h-9" aria-hidden="true">
        <span className="absolute inset-x-0 top-[9px] h-0.5 bg-[color:var(--app-text)] opacity-70" />
        <span
          data-signal-rail-hard
          className="absolute top-[6px] h-2 bg-[color:var(--app-text-muted)] opacity-30"
          style={{ left: `${hard.left}%`, width: `${hard.width}%` }}
        />
        {/* A change line is a boundary and draws in the ink; a line that counts against a
            company once crossed draws in the crossed ink while it is (ui-ux-standards §XVI). */}
        <span
          data-signal-rail-line
          className={`absolute top-[2px] h-4 w-0.5 -translate-x-1/2 ${!isScore && crossed ? "bg-[color:var(--line-crossed)]" : "bg-[color:var(--app-text)]"}`}
          style={{ left: `${lineAt}%` }}
        />
        {previous !== null ? (
          <span
            data-signal-rail-previous
            className="absolute top-[5px] h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-slate-400 bg-[var(--bg-body)]"
            style={{ left: `${at(previous)}%` }}
          />
        ) : null}
        <span
          data-signal-rail-reading
          className="absolute top-[3px] h-3.5 w-3.5 -translate-x-1/2 rounded-full border-[3px] border-[color:var(--app-text)] bg-[var(--bg-body)]"
          style={{ left: `${at(value)}%` }}
        />
        <span className="absolute left-0 top-[22px] text-[12px] leading-none tabular-nums text-slate-400">{formatEnd(ends[0])}</span>
        <span
          className={`absolute top-[22px] -translate-x-1/2 text-[12px] leading-none tabular-nums ${!isScore && crossed ? "text-line-crossed-fg" : "text-slate-300"}`}
          style={{ left: `${Math.min(84, Math.max(16, lineAt))}%` }}
        >
          {format(line.value)}
        </span>
        <span className="absolute right-0 top-[22px] text-[12px] leading-none tabular-nums text-slate-400">{formatEnd(ends[1])}</span>
      </div>
      <figcaption className="mt-1.5">
        <span className="sr-only">{`Scale ${formatEnd(ends[0])} to ${formatEnd(ends[1])}, easier to the right. `}</span>
        {children}
      </figcaption>
    </figure>
  );
}
