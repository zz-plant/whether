import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";

/**
 * The three lines of one decision, drawn on the axis they share.
 *
 * The method's worked example states its three numbers in prose, but the thing
 * the numbers *are* — a pause line past the change line, a resume line inside
 * it, and the hold between them — has shape. Until now a reader who wanted the
 * geometry had to hold three sentences against each other; `ScoreLadder` draws
 * a reading against these lines, but a method has no reading to put on the
 * track. This is the drawing for that case: no dot, the three marks, and the
 * band between resume and pause shaded, because the band is the method's point
 * (the pause line without the resume line is a permanent stop, not a pause).
 *
 * Every label and colour comes from the same sources the rest of the product
 * labels these lines with: the noun slots and `watch.changeLine` from
 * `reportCopy.ts`, the crossed and clear inks from tokens.css. Nothing here is
 * a second name for a line another surface names differently.
 */
export function CorridorStrip({
  changeLine,
  pauseLine,
  resumeLine,
  /** The funding-pressure score's zoom window; wide enough that the three marks stay legible. */
  min = 55,
  max = 85,
}: {
  changeLine: number;
  pauseLine: number;
  resumeLine: number;
  min?: number;
  max?: number;
}) {
  const PAD = 16;
  const WIDTH = 288;
  const BAR_Y = 36;
  const BAR_H = 8;
  const xFor = (value: number) =>
    PAD + ((Math.min(max, Math.max(min, value)) - min) / (max - min)) * WIDTH;

  const resumeX = xFor(resumeLine);
  const changeX = xFor(changeLine);
  const pauseX = xFor(pauseLine);
  /* The hold between the lines: slightly taller than the track, so the zone
     reads as a region rather than a colour on the track. */
  const bandX = Math.min(resumeX, pauseX);
  const bandW = Math.abs(pauseX - resumeX);

  return (
    <figure data-corridor-strip className="mt-4 space-y-1">
      <svg
        viewBox="0 0 320 88"
        className="block h-auto w-full max-w-[22rem]"
        aria-hidden="true"
        role="presentation"
      >
        {/* The hold between the lines: a reading here changes nothing — the
            action keeps running, or the pause stays. Neutral ink, a fraction
            of its strength: it is a region, not a state. */}
        <rect
          x={bandX}
          y={BAR_Y - 5}
          width={bandW}
          height={BAR_H + 10}
          rx="3"
          className="fill-slate-500/15"
        />
        {/* The track. */}
        <rect
          x={PAD}
          y={BAR_Y}
          width={WIDTH}
          height={BAR_H}
          rx="4"
          className="fill-slate-700/40"
        />
        {/* The three marks, each crossing the track. The pause and resume
            lines take their state inks (a crossed red is a line and nothing
            else on this site); the change line is the neutral dashed one
            ScoreLadder draws it as. */}
        <g>
          <title>{`${DECISION_CONTRACT_LABELS.slot.reversal}: ${resumeLine}`}</title>
          <line x1={resumeX} y1={BAR_Y - 9} x2={resumeX} y2={BAR_Y + BAR_H + 9} stroke="var(--line-clear)" strokeWidth="2" />
        </g>
        <g>
          <title>{`${DECISION_CONTRACT_LABELS.watch.changeLine}: ${changeLine}`}</title>
          <line
            x1={changeX}
            y1={BAR_Y - 9}
            x2={changeX}
            y2={BAR_Y + BAR_H + 9}
            className="stroke-slate-300"
            strokeDasharray="3 2"
            strokeWidth="1.5"
          />
        </g>
        <g>
          <title>{`${DECISION_CONTRACT_LABELS.slot.threshold}: ${pauseLine}`}</title>
          <line x1={pauseX} y1={BAR_Y - 9} x2={pauseX} y2={BAR_Y + BAR_H + 9} stroke="var(--line-crossed)" strokeWidth="2" />
        </g>

        {/* Name labels above, each anchored away from its mark and from the
            band, so the three clear one another at the strip's narrowest. */}
        <text x={resumeX - 6} y={BAR_Y - 13} textAnchor="end" fontSize="10" fill="var(--line-clear-ink)">
          {DECISION_CONTRACT_LABELS.slot.reversal}
        </text>
        <text x={changeX} y={BAR_Y - 13} textAnchor="middle" fontSize="10" className="fill-slate-300">
          {DECISION_CONTRACT_LABELS.watch.changeLine}
        </text>
        <text x={pauseX + 6} y={BAR_Y - 13} textAnchor="start" fontSize="10" fill="var(--line-crossed-ink)">
          {DECISION_CONTRACT_LABELS.slot.threshold}
        </text>

        {/* Values under the marks, and the zoom window's ends, so the domain
            reads on the drawing and not only in the caption. */}
        <text x={resumeX} y={BAR_Y + BAR_H + 22} textAnchor="middle" fontSize="9.5" className="fill-slate-400 tabular-nums">
          {resumeLine}
        </text>
        <text x={changeX} y={BAR_Y + BAR_H + 22} textAnchor="middle" fontSize="9.5" className="fill-slate-400 tabular-nums">
          {changeLine}
        </text>
        <text x={pauseX} y={BAR_Y + BAR_H + 22} textAnchor="middle" fontSize="9.5" className="fill-slate-400 tabular-nums">
          {pauseLine}
        </text>
        <text x={PAD} y={BAR_Y + BAR_H + 22} textAnchor="middle" fontSize="9" className="fill-slate-600 tabular-nums">
          {min}
        </text>
        <text x={PAD + WIDTH} y={BAR_Y + BAR_H + 22} textAnchor="middle" fontSize="9" className="fill-slate-600 tabular-nums">
          {max}
        </text>
      </svg>
      <figcaption className="text-fluid-nano leading-relaxed text-slate-400">
        The worked example on the funding-pressure score, zoomed to {min}&ndash;{max}: the{" "}
        {DECISION_CONTRACT_LABELS.slot.reversal.toLowerCase()} at {resumeLine}, the change line at {changeLine}, the{" "}
        {DECISION_CONTRACT_LABELS.slot.threshold.toLowerCase()} at {pauseLine}. Between the outer two, a reading changes
        nothing: the action keeps running, or the pause stays.
      </figcaption>
    </figure>
  );
}
