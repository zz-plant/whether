import { getRegimePublicLabel } from "../../../lib/regimePresentation";

type RegimeRadarProps = {
  tightness: number;
  riskAppetite: number;
  previousTightness?: number | null;
  previousRiskAppetite?: number | null;
  tightnessThreshold: number;
  riskAppetiteThreshold: number;
  currentRegime: string;
  /**
   * Earlier readings, oldest first, drawn as the path that led to the current
   * point. Month-ends on the brief; the domain is stated in `trailCaption`.
   * When present it replaces the single earlier dot, which is its last point.
   */
  trail?: ReadonlyArray<{ tightness: number; riskAppetite: number }>;
  /** What the path's dots are (UI standards §XV: state the domain of a graphic). */
  trailCaption?: string | null;
  /** The like-for-like note when the earlier readings were scored from fewer inputs. */
  caveat?: string | null;
  /**
   * The distance-to-the-line caption. Off where the surface already states it
   * beside the map (the hero's trust row says "2 pts from its line").
   */
  showDistance?: boolean;
  className?: string;
};

const VIEW_W = 200;
const VIEW_H = 184;
const PLOT_X = 24;
const PLOT_Y = 14;
const PLOT_SIZE = 148;
const PLOT_RIGHT = PLOT_X + PLOT_SIZE;
const PLOT_BOTTOM = PLOT_Y + PLOT_SIZE;

const xFor = (riskAppetite: number) =>
  PLOT_X + (Math.max(0, Math.min(100, riskAppetite)) / 100) * PLOT_SIZE;

const yFor = (tightness: number) =>
  PLOT_Y + (1 - Math.max(0, Math.min(100, tightness)) / 100) * PLOT_SIZE;

export function RegimeRadar({
  tightness,
  riskAppetite,
  previousTightness,
  previousRiskAppetite,
  tightnessThreshold,
  riskAppetiteThreshold,
  currentRegime,
  trail,
  trailCaption,
  caveat,
  showDistance = true,
  className = "",
}: RegimeRadarProps) {
  const boundaryX = xFor(riskAppetiteThreshold);
  const boundaryY = yFor(tightnessThreshold);
  const currentX = xFor(riskAppetite);
  const currentY = yFor(tightness);

  const trailPoints = (trail ?? []).map((point) => ({ x: xFor(point.riskAppetite), y: yFor(point.tightness) }));
  const hasTrail = trailPoints.length > 0;
  const hasPrevious =
    !hasTrail &&
    typeof previousTightness === "number" &&
    typeof previousRiskAppetite === "number";
  const prevX = hasPrevious ? xFor(previousRiskAppetite!) : null;
  const prevY = hasPrevious ? yFor(previousTightness!) : null;

  // Determine nearest boundary line distance (horizontal vs vertical)
  const distY = Math.abs(currentY - boundaryY);
  const distX = Math.abs(currentX - boundaryX);
  const nearestIsY = distY <= distX;
  // The projection reaches a regime boundary, not a company's pause line.
  const pointsToBoundary = Math.round((Math.min(distX, distY) / PLOT_SIZE) * 100);

  // Any string: a known regime maps to its weather word, anything else passes
  // through, so an unmodelled label still reads instead of rendering blank.
  const weatherLabel = getRegimePublicLabel(currentRegime).toLowerCase();

  return (
    <figure
      className={`relative m-0 flex flex-col items-center justify-center rounded-lg border border-slate-800/80 bg-slate-900/50 p-3 ${className}`.trim()}
      aria-label={`Conditions radar: ${weatherLabel}, funding pressure ${tightness}, risk appetite ${riskAppetite}`}
    >
      <div className="mb-1.5 flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1 text-fluid-nano text-slate-300">
        <span className="font-semibold text-slate-100">Conditions</span>
        <span className="tabular-nums text-slate-400">
          Pressure {tightness} · Appetite {riskAppetite}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        /* 256px at most: the plot is the card's one picture, and at 200px its
           month-end trail bunched into a knot beside the current point. The
           viewBox text scales with it, to about 13px at the cap (§XVII). */
        className="block h-auto w-full max-w-[256px]"
        aria-hidden="true"
      >
        <title>{`Funding pressure ${tightness} vs risk appetite ${riskAppetite} (${weatherLabel})`}</title>

        {/* 4 Weather Quadrants */}
        {/* Top-Left: Freezing (Scarcity) */}
        <rect
          x={PLOT_X}
          y={PLOT_Y}
          width={boundaryX - PLOT_X}
          height={boundaryY - PLOT_Y}
          fill="var(--phase-scarcity, rgba(244, 63, 94, 0.09))"
        />
        {/* Top-Right: Cloudy (Defensive) */}
        <rect
          x={boundaryX}
          y={PLOT_Y}
          width={PLOT_RIGHT - boundaryX}
          height={boundaryY - PLOT_Y}
          fill="var(--phase-defensive, rgba(245, 158, 11, 0.09))"
        />
        {/* Bottom-Left: Stormy (Volatile) */}
        <rect
          x={PLOT_X}
          y={boundaryY}
          width={boundaryX - PLOT_X}
          height={PLOT_BOTTOM - boundaryY}
          fill="var(--phase-volatile, rgba(139, 92, 246, 0.09))"
        />
        {/* Bottom-Right: Sunny (Expansion) */}
        <rect
          x={boundaryX}
          y={boundaryY}
          width={PLOT_RIGHT - boundaryX}
          height={PLOT_BOTTOM - boundaryY}
          fill="var(--phase-expansion, rgba(16, 185, 129, 0.09))"
        />

        {/* Quadrant corner labels */}
        <text
          x={PLOT_X + 6}
          y={PLOT_Y + 12}
          className="text-[10px] font-bold uppercase tracking-wider"
          fill="var(--color-semantic-reversal-fg)"
        >
          Freezing
        </text>
        <text
          x={PLOT_RIGHT - 6}
          y={PLOT_Y + 12}
          textAnchor="end"
          className="text-[10px] font-bold uppercase tracking-wider"
          fill="var(--color-semantic-caution-fg)"
        >
          Cloudy
        </text>
        <text
          x={PLOT_X + 6}
          y={PLOT_BOTTOM - 6}
          className="text-[10px] font-bold uppercase tracking-wider"
          fill="var(--color-semantic-stormy-fg)"
        >
          Stormy
        </text>
        <text
          x={PLOT_RIGHT - 6}
          y={PLOT_BOTTOM - 6}
          textAnchor="end"
          className="text-[10px] font-bold uppercase tracking-wider"
          fill="var(--color-semantic-easing-fg)"
        >
          Sunny
        </text>

        {/* Grid and threshold boundary crosshairs */}
        <line
          x1={PLOT_X}
          y1={boundaryY}
          x2={PLOT_RIGHT}
          y2={boundaryY}
          stroke="rgba(148, 163, 184, 0.35)"
          strokeDasharray="3 3"
          strokeWidth="1"
        >
          <title>{`Funding pressure boundary at ${tightnessThreshold}`}</title>
        </line>
        <line
          x1={boundaryX}
          y1={PLOT_Y}
          x2={boundaryX}
          y2={PLOT_BOTTOM}
          stroke="rgba(148, 163, 184, 0.35)"
          strokeDasharray="3 3"
          strokeWidth="1"
        >
          <title>{`Risk appetite boundary at ${riskAppetiteThreshold}`}</title>
        </line>

        {/* Boundary outer frame */}
        <rect
          x={PLOT_X}
          y={PLOT_Y}
          width={PLOT_SIZE}
          height={PLOT_SIZE}
          fill="none"
          stroke="rgba(51, 65, 85, 0.6)"
          strokeWidth="1"
        />

        {/* Nearest boundary projection guide */}
        {nearestIsY ? (
          <line
            x1={currentX}
            y1={currentY}
            x2={currentX}
            y2={boundaryY}
            stroke="var(--regime-accent, #38bdf8)"
            strokeDasharray="2 2"
            strokeWidth="1"
            strokeOpacity="0.7"
          />
        ) : (
          <line
            x1={currentX}
            y1={currentY}
            x2={boundaryX}
            y2={currentY}
            stroke="var(--regime-accent, #38bdf8)"
            strokeDasharray="2 2"
            strokeWidth="1"
            strokeOpacity="0.7"
          />
        )}

        {/* The path: earlier readings joined to the current one, older dots
            fainter, so the direction of travel reads before any number does. */}
        {hasTrail ? (
          <g>
            <polyline
              points={[...trailPoints, { x: currentX, y: currentY }].map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke="var(--app-text-muted)"
              strokeWidth="1.2"
              strokeLinejoin="round"
              strokeOpacity="0.55"
            />
            {trailPoints.map((point, index) => (
              <circle
                key={`${point.x}-${point.y}-${index}`}
                cx={point.x}
                cy={point.y}
                r="2.4"
                fill="var(--app-text-muted)"
                fillOpacity={0.3 + (0.6 * (index + 1)) / trailPoints.length}
              />
            ))}
          </g>
        ) : null}

        {/* Previous reading with dashed trail */}
        {hasPrevious && prevX !== null && prevY !== null ? (
          <g>
            <line
              x1={prevX}
              y1={prevY}
              x2={currentX}
              y2={currentY}
              stroke="#94a3b8"
              strokeWidth="1.2"
              strokeDasharray="2 2"
              strokeOpacity="0.6"
            />
            <circle
              cx={prevX}
              cy={prevY}
              r="2.5"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.2"
              strokeOpacity="0.7"
            />
          </g>
        ) : null}

        {/* Current reading marker */}
        <g>
          <title>{`Current reading: Funding pressure ${tightness}, Risk appetite ${riskAppetite} (${weatherLabel})`}</title>
          <circle
            cx={currentX}
            cy={currentY}
            r="6.5"
            fill="none"
            stroke="var(--regime-accent, #38bdf8)"
            strokeWidth="1.5"
            strokeOpacity="0.6"
          />
          <circle
            cx={currentX}
            cy={currentY}
            r="3.5"
            fill="var(--regime-accent, #38bdf8)"
          />
        </g>

        {/* Axes guides */}
        <text
          x={PLOT_X + PLOT_SIZE / 2}
          y={PLOT_BOTTOM + 14}
          textAnchor="middle"
          className="fill-slate-400 text-[11px]"
        >
          Risk appetite →
        </text>
        <text
          x={PLOT_X - 8}
          y={PLOT_Y + PLOT_SIZE / 2}
          textAnchor="middle"
          transform={`rotate(-90, ${PLOT_X - 8}, ${PLOT_Y + PLOT_SIZE / 2})`}
          className="fill-slate-400 text-[11px]"
        >
          Pressure ↑
        </text>
      </svg>

      {showDistance || (hasTrail && (trailCaption || caveat)) ? (
        <figcaption className="mt-1 space-y-0.5 text-center text-fluid-nano text-slate-400">
          {showDistance ? <span className="block">{pointsToBoundary} points to nearest change line</span> : null}
          {hasTrail && trailCaption ? <span className="block">{trailCaption}</span> : null}
          {hasTrail && caveat ? <span className="block">{caveat}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
