import {
  CHANGE_APPROACH_MONTHS_BEFORE,
  CHANGE_APPROACH_SCALE_PTS,
  describeChangeApproach,
  type ChangeApproach,
} from "../../../lib/report/advanceWarning";

const W = 128;
const H = 52;
const PAD = 4;
const STEP = (W - 2 * PAD) / CHANGE_APPROACH_MONTHS_BEFORE;

const y = (distance: number) => H / 2 - (distance / CHANGE_APPROACH_SCALE_PTS) * (H / 2 - PAD);

/**
 * How the score that crossed approached its line before one change in conditions
 * (2026-11-18): the six month-ends before it and the change month at the right, as
 * points from the line, the side it left up. The shaded band is the advance-warning
 * band (within 5 pts, the line state "close", so it takes the front red at a tint);
 * the dashed rule is the line. A change with warning runs inside the band before it
 * drops through; one without runs outside and drops in one step.
 *
 * Small multiples: every drawing is the same size, scale and orientation (§XV), and
 * a change near the start of the record is right-aligned so its change month sits
 * where every other one does. Drawn at its own size, never scaled, so nothing in it
 * changes with the column. It carries no text: the row it sits in names the month,
 * the change and the words this draws, and its accessible name lists the readings.
 *
 * Each dot carries its month (`data-month`), so a month read anywhere on the page
 * rings the dot that stands for it (month-active.css). The row's link covers the
 * drawing and carries the change's month, so pointing at the row reads that month.
 */
export function ChangeApproachDrawing({ approach, id }: { approach: ChangeApproach; id: string }) {
  const last = approach.points.length - 1;
  const x = (index: number) => W - PAD - (last - index) * STEP;
  const path = approach.points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)} ${y(point.distance).toFixed(1)}`).join(" ");
  const clipId = `change-approach-${id}`;
  const band = approach.nearBandPts;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      aria-label={describeChangeApproach(approach)}
      className="block shrink-0 overflow-hidden text-[color:var(--app-text)]"
      data-change-approach
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={W} height={H} />
        </clipPath>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="none" stroke="currentColor" strokeOpacity="0.14" />
      <rect x="0" y={y(band)} width={W} height={y(-band) - y(band)} fill="var(--line-crossed)" fillOpacity="0.2" data-warning-band />
      <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="currentColor" strokeOpacity="0.55" strokeDasharray="2 2" />
      <g clipPath={`url(#${clipId})`}>
        <path d={path} fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" />
        {approach.points.map((point, index) => (
          <circle
            key={point.recordDate}
            cx={x(index)}
            cy={y(point.distance)}
            r={index === last ? 2.5 : 1.6}
            fill="currentColor"
            data-month={point.recordDate.slice(0, 7)}
          />
        ))}
      </g>
    </svg>
  );
}
