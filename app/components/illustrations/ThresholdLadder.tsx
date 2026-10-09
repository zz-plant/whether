import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
type ThresholdLadderProps = {
  idPrefix: string;
  /** Rail domain. */
  min: number;
  max: number;
  /** Where the signal sits now. */
  current: number;
  /**
   * Where the signal sat last period. Supplying it turns the rail from a
   * position readout into a movement one — without it a reader cannot tell
   * whether `current` is closing on the trigger or backing away from it.
   */
  previous?: number;
  /** Crossing this fires the rule. */
  trigger: number;
  /**
   * What the surface calls the trigger. Defaults to "Trigger", but a card that chips
   * the same threshold as a Guardrail has to label the rail the same way — one number
   * carrying two names on one card reads as two rules.
   */
  triggerLabel?: string;
  /** Crossing this reverses the rule. Omit if the rule has no reversal condition. */
  reversal?: number;
  /**
   * What the surface calls the reversal line. Defaults to "Reversal", but a card
   * that already spends the word "Reversal" on a different rule has to name this
   * line something else — two lines under one word is the same defect
   * `triggerLabel` exists to prevent, seen from the other end. Like `triggerLabel`
   * it renames the visible caption only; the description keeps the generic noun.
   */
  reversalLabel?: string;
  /** Unit suffix for the readout, e.g. "%" or "bps". */
  unit?: string;
  /** Name of the measured signal, for the accessible title. */
  signalLabel: string;
  /** Compact explanation of which end of the scale carries which meaning. */
  scaleDirection?: string;
  /**
   * Run the rail from `max` to `min` instead. A signal whose trigger sits at the low
   * end draws its trouble on the left, so a pair of rails read in opposite directions
   * and a reader has to re-orient between them. Inverting one puts the trigger on the
   * right for both. The rail ends label themselves, so the flip stays visible.
   */
  invert?: boolean;
  /**
   * Shade the span between `reversal` and `trigger`. That span is the hysteresis gap —
   * neither condition fires inside it — and it is the part of a bounded rule that
   * prose can only imply by stating two thresholds and leaving the reader to subtract.
   * Ignored when there is no `reversal` to bound it.
   */
  hysteresisBand?: boolean;
  /** Preferred coordinate width, capped at 300 to keep labels readable on phones. */
  viewBoxWidth?: number;
  className?: string;
};

const formatNumber = (v: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v);

const RAIL_INSET = 12;
const DEFAULT_VIEWBOX_WIDTH = 240;


export function ThresholdLadder({
  idPrefix,
  min,
  max,
  current,
  previous,
  trigger,
  triggerLabel = DECISION_CONTRACT_LABELS.threshold.pauseIf,
  reversal,
  reversalLabel = DECISION_CONTRACT_LABELS.reversal.resumeWhen,
  unit = "",
  signalLabel,
  scaleDirection,
  invert = false,
  hysteresisBand = false,
  viewBoxWidth: requestedWidth = DEFAULT_VIEWBOX_WIDTH,
  className,
}: ThresholdLadderProps) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;

  const viewBoxWidth = Math.min(300, Math.max(200, Number.isFinite(requestedWidth) ? requestedWidth : DEFAULT_VIEWBOX_WIDTH));
  const RAIL_Y = scaleDirection ? 42 : 30;
  const RAIL_START = RAIL_INSET;
  const RAIL_END = viewBoxWidth - RAIL_INSET;

  const clamp = (v: number) => (Number.isFinite(v) ? Math.min(Math.max(v, min), max) : min);
  const fraction = (v: number) => (clamp(v) - min) / (max - min);
  const xFor = (v: number) =>
    RAIL_START + (invert ? 1 - fraction(v) : fraction(v)) * (RAIL_END - RAIL_START);

  const currentValue = clamp(current);
  const triggerValue = clamp(trigger);
  const reversalValue = reversal === undefined ? undefined : clamp(reversal);
  const previousValue =
    previous === undefined || !Number.isFinite(previous) ? undefined : clamp(previous);

  const xCurrent = xFor(currentValue);
  const xTrigger = xFor(triggerValue);
  const xPrevious = previousValue === undefined ? undefined : xFor(previousValue);

  // The three spans a bounded rule cuts the rail into: clear of the reversal, the gap
  // where neither condition fires, and past the trigger. Which side is trouble follows
  // the trigger rather than the reading, so this stays correct under `invert`.
  const zones =
    hysteresisBand && reversalValue !== undefined
      ? (() => {
          const xReversal = xFor(reversalValue);
          const troubleIsRight = xTrigger >= xReversal;
          return {
            safe: troubleIsRight
              ? ([RAIL_START, xReversal] as const)
              : ([xReversal, RAIL_END] as const),
            band: [Math.min(xReversal, xTrigger), Math.max(xReversal, xTrigger)] as const,
            trouble: troubleIsRight
              ? ([xTrigger, RAIL_END] as const)
              : ([RAIL_START, xTrigger] as const),
          };
        })()
      : null;

  // Only draw the movement when it is wide enough to read as a direction.
  const hasMovement = xPrevious !== undefined && Math.abs(xCurrent - xPrevious) > 1.5;

  /**
   * How far past the trigger a reading sits, signed — negative while still clear of it.
   *
   * Distance *to* the trigger is symmetric around it, so a signal that blew through
   * from 70 to 82 against a trigger of 76 scores 6 either side and reads as "moving
   * away": the leg paints green on the one move that most deserves alarm. A reversal
   * tells us which side of the trigger is the trouble side, so where there is one the
   * comparison can be signed. Where there is none the side is genuinely unknown and the
   * original distance heuristic stands.
   */
  const beyondTrigger =
    reversalValue === undefined
      ? undefined
      : (v: number) => (triggerValue > reversalValue ? v - triggerValue : triggerValue - v);

  const deteriorating =
    previousValue === undefined
      ? undefined
      : beyondTrigger
        ? beyondTrigger(currentValue) > beyondTrigger(previousValue)
        : Math.abs(currentValue - triggerValue) < Math.abs(previousValue - triggerValue);

  const pastTrigger = beyondTrigger ? beyondTrigger(currentValue) > 0 : false;

  // No space before "%", a thin space before a word unit, nothing when unitless.
  const readout = `${formatNumber(currentValue)}${unit === "" ? "" : unit === "%" ? "" : " "}${unit}`;

  const thresholdDesc =
    reversalValue === undefined
      ? `Pause line at ${formatNumber(triggerValue)}${unit}.`
      : `Pause line at ${formatNumber(triggerValue)}${unit}. Resume line at ${formatNumber(reversalValue)}${unit}.`;

  const movementDesc =
    previousValue === undefined
      ? ""
      : previousValue === currentValue
        ? " Unchanged since last period."
        : ` ${currentValue > previousValue ? "Rose" : "Fell"} from ${formatNumber(previousValue)}${unit}, ${
            deteriorating
              ? pastTrigger
                ? "moving further past"
                : "moving toward"
              : pastTrigger
                ? "moving back toward"
                : "moving away from"
          } the trigger.`;

  const directionDesc = scaleDirection ? ` Scale direction: ${scaleDirection}` : "";
  const desc = `${thresholdDesc}${directionDesc}${movementDesc}`;

  // Keep end-of-rail captions from spilling out of the viewBox.
  const clampLabelX = (x: number, label: string, size = 12) => {
    const halfWidth = label.length * size * 0.3;
    return Math.min(Math.max(x, RAIL_START + halfWidth), RAIL_END - halfWidth);
  };

  /* A tight hysteresis gap is the normal case, not the edge one — a rule that
     trips at 76 and clears at 66 puts its two captions 10 units apart on a
     100-unit rail — so the captions collide exactly when the rule is worth
     reading. Approximating the glyph width from the character count is enough to
     tell whether they do; when they would, the reversal caption goes on a second
     line and the rail drops to make room for it. */
  const captionWidth = (text: string, fontSize = 12) => text.length * fontSize * 0.52;
  const captionsCollide =
    reversalValue !== undefined
    && Math.abs(clampLabelX(xTrigger, triggerLabel) - clampLabelX(xFor(reversalValue), reversalLabel))
      < (captionWidth(triggerLabel) + captionWidth(reversalLabel)) / 2;
  const stackedCaptionRise = captionsCollide ? 14 : 0;

  /* A scale direction names both ends of the rail ("0 = easier funding · 100 =
     harder funding"), so a single left-anchored run both overflows a narrow rail
     — SVG text does not wrap, it clips — and puts the caption for the right end
     nowhere near it. Split on the separator the copy already uses and anchor each
     half to the end it describes. `invert` swaps which end that is, so the halves
     follow the flip rather than contradicting it. Anything that will not split
     into two halves that fit wraps in an HTML caption below the graphic. */
  const directionHalves = (() => {
    if (!scaleDirection) return undefined;
    const parts = scaleDirection.split(" · ");
    if (parts.length !== 2) return undefined;
    // Each half names the value it belongs to ("0 = easier funding"), which the
    // rail end directly beneath it already prints. Anchored to that end the
    // number is redundant, and dropping it is most of what makes the halves fit.
    const stripValue = (part: string) => part.replace(/^-?\d+(?:\.\d+)?\s*=\s*/, "");
    const [low, high] = [stripValue(parts[0]), stripValue(parts[1])];
    const fits = captionWidth(low, 12) + captionWidth(high, 12) + 8 <= RAIL_END - RAIL_START;
    if (!fits) return undefined;
    return invert ? ([high, low] as const) : ([low, high] as const);
  })();

  return (
    <>
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${(scaleDirection ? 86 : 74) + stackedCaptionRise}`}
      width="100%"
      style={{ height: "auto", maxWidth: viewBoxWidth * 1.4 }}
      aria-labelledby={`${idPrefix}-title ${idPrefix}-desc`}
      className={className}
    >
      <title id={`${idPrefix}-title`}>{`${signalLabel}: ${readout}`}</title>
      <desc id={`${idPrefix}-desc`}>{desc}</desc>

      {directionHalves ? (
        <>
          <text x={RAIL_START} y={11} textAnchor="start" fill="var(--app-text-muted)" fontSize={12}>
            {directionHalves[0]}
          </text>
          <text x={RAIL_END} y={11} textAnchor="end" fill="var(--app-text-muted)" fontSize={12}>
            {directionHalves[1]}
          </text>
        </>
      ) : null}

      <g transform={stackedCaptionRise ? `translate(0, ${stackedCaptionRise})` : undefined}>
      <line
        x1={RAIL_START}
        y1={RAIL_Y}
        x2={RAIL_END}
        y2={RAIL_Y}
        stroke="var(--border-default)"
        strokeWidth={6}
        strokeLinecap="round"
      />

      {/* Two ways to shade the rail, and they are alternatives rather than layers.
          Without a hysteresis band the rail shades the run from the reading to the
          trigger, which answers "how far". With one it shades the three zones the rule
          actually defines, which answers "which of them am I in" — and that band would
          disappear under the distance wash if both were drawn. */}
      {zones ? (
        <>
          <line
            x1={zones.safe[0]}
            y1={RAIL_Y}
            x2={zones.safe[1]}
            y2={RAIL_Y}
            stroke="var(--accent-success)"
            strokeWidth={6}
            strokeOpacity={0.32}
            strokeLinecap="butt"
          />
          <line
            x1={zones.band[0]}
            y1={RAIL_Y}
            x2={zones.band[1]}
            y2={RAIL_Y}
            stroke="var(--app-text-muted)"
            strokeWidth={6}
            strokeOpacity={0.14}
            strokeLinecap="butt"
          />
          <line
            x1={zones.trouble[0]}
            y1={RAIL_Y}
            x2={zones.trouble[1]}
            y2={RAIL_Y}
            stroke="var(--accent-warning)"
            strokeWidth={6}
            strokeOpacity={0.32}
            strokeLinecap="butt"
          />
        </>
      ) : Math.abs(xCurrent - xTrigger) > 0.5 ? (
        <line
          x1={xCurrent}
          y1={RAIL_Y}
          x2={xTrigger}
          y2={RAIL_Y}
          stroke="var(--accent-warning)"
          strokeWidth={6}
          strokeOpacity={0.28}
          strokeLinecap="butt"
        />
      ) : null}

      <line
        x1={xTrigger}
        y1={RAIL_Y - 8}
        x2={xTrigger}
        y2={RAIL_Y + 8}
        stroke="var(--accent-danger)"
        strokeWidth={2}
      />
      <text
        x={clampLabelX(xTrigger, triggerLabel)}
        y={RAIL_Y - 14}
        textAnchor="middle"
        fill="var(--app-text-muted)"
        fontSize={12}
      >
        {triggerLabel}
      </text>

      {reversalValue !== undefined ? (
        <>
          <line
            x1={xFor(reversalValue)}
            y1={RAIL_Y - 8}
            x2={xFor(reversalValue)}
            y2={RAIL_Y + 8}
            stroke="var(--accent-success)"
            strokeWidth={2}
            strokeDasharray="3 2"
          />
          <text
            x={clampLabelX(xFor(reversalValue), reversalLabel)}
            y={RAIL_Y - 14 - (stackedCaptionRise ? 14 : 0)}
            textAnchor="middle"
            fill="var(--app-text-muted)"
            fontSize={12}
          >
            {reversalLabel}
          </text>
        </>
      ) : null}

      {/* Movement leg, in the same hollow-dot → solid-dot vocabulary as
          `ScoreLadder`'s last-week dot: where the signal was, the path it took,
          and a chevron at the midpoint so the direction survives without colour. */}
      {hasMovement && xPrevious !== undefined ? (
        <>
          <line
            x1={xPrevious}
            y1={RAIL_Y}
            x2={xCurrent}
            y2={RAIL_Y}
            stroke={deteriorating ? "var(--accent-warning)" : "var(--accent-success)"}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <circle cx={xPrevious} cy={RAIL_Y} r={3} fill="var(--app-text-muted)" fillOpacity={0.45} />
          {(() => {
            const towardRight = xCurrent > xPrevious;
            const midX = (xPrevious + xCurrent) / 2;
            const tipX = midX + (towardRight ? 3 : -3);
            const backX = midX + (towardRight ? -1.5 : 1.5);
            return (
              <polyline
                points={`${backX},${RAIL_Y - 3.5} ${tipX},${RAIL_Y} ${backX},${RAIL_Y + 3.5}`}
                fill="none"
                stroke={deteriorating ? "var(--accent-warning)" : "var(--accent-success)"}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })()}
        </>
      ) : null}

      <circle
        cx={xCurrent}
        cy={RAIL_Y}
        r={5}
        fill="var(--bg-panel)"
        stroke="var(--app-text)"
        strokeWidth={2.5}
      />
      {/* Readout sits under the dot; domain bounds sit at the rail ends. */}
      <text
        x={clampLabelX(xCurrent, readout, 12)}
        y={RAIL_Y + 20}
        textAnchor="middle"
        fill="var(--app-text)"
        fontSize={12}
        fontWeight={600}
      >
        {readout}
      </text>

      {/* Follow the flip. An inverted rail whose ends still read 0 then 100 is a rail
          that lies about every position on it. */}
      <text x={RAIL_START} y={RAIL_Y + 38} textAnchor="start" fill="var(--app-text-muted)" fontSize={12}>
        {formatNumber(invert ? max : min)}
      </text>
      <text x={RAIL_END} y={RAIL_Y + 38} textAnchor="end" fill="var(--app-text-muted)" fontSize={12}>
        {formatNumber(invert ? min : max)}
      </text>
      </g>
    </svg>
    {scaleDirection && !directionHalves ? (
      <p className="mt-1 text-xs text-slate-400" style={{ maxWidth: viewBoxWidth * 1.4 }}>{scaleDirection}</p>
    ) : null}
    </>
  );
}
