import type { ReactNode } from "react";
import { scaleLinear } from "d3-scale";
import { CONDITION_SIDE_MEANINGS, getRegimePublicLabel } from "../../../lib/regimePresentation";
import { formatThresholdNumber } from "../../../lib/formatters";
import { UrlDetails } from "../ui/urlDetails";
import { ConditionIcon } from "../ui/conceptIcons";

type RegimeRadarProps = {
  compact?: boolean;
  detailsOpen?: boolean;
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
  trail?: ReadonlyArray<{ tightness: number; riskAppetite: number; label?: string }>;
  /** What the path's dots are (UI standards §XV: state the domain of a graphic). */
  trailCaption?: string | null;
  /** The like-for-like note when the earlier readings were scored from fewer inputs. */
  caveat?: string | null;
  /** A last line under the caption: on the brief's card, the link to how the lines are set. */
  footer?: ReactNode;
  /**
   * What the filled marker is. The brief's map reads "Current reading"; a
   * surface that plots a hypothetical (the scenario studio's map: the
   * simulated reading as the dot, this week's as the hollow one, the same
   * filled/hollow pair its ladders draw) names the marker so the two surfaces
   * cannot disagree about which point is which.
   */
  primaryLabel?: string;
  /** What the hollow marker is, on a surface whose two points both need names ("This week"). */
  previousLabel?: string | null;
  className?: string;
};

const VIEW_W = 200;
const VIEW_H = 184;
const PLOT_X = 24;
const PLOT_Y = 14;
const PLOT_SIZE = 148;
const PLOT_RIGHT = PLOT_X + PLOT_SIZE;
const PLOT_BOTTOM = PLOT_Y + PLOT_SIZE;
/* The corner glyphs, centred on the cap height of the 10-unit words beside them. */
const QUADRANT_ICON = 12.5;
const TOP_ICON_Y = PLOT_Y + 12 - 3.6 - QUADRANT_ICON / 2;
const BOTTOM_ICON_Y = PLOT_BOTTOM - 6 - 3.6 - QUADRANT_ICON / 2;

/* Where a change line's value is printed: "70" just outside the right edge at
   the funding-pressure line, clear of the corner glyphs above and below it. */
const LINE_LABEL_MIN_Y = TOP_ICON_Y + QUADRANT_ICON + 7;
const LINE_LABEL_MAX_Y = BOTTOM_ICON_Y - 2;

const xScale = scaleLinear().domain([0, 100]).range([PLOT_X, PLOT_RIGHT]).clamp(true);
const yScale = scaleLinear().domain([0, 100]).range([PLOT_BOTTOM, PLOT_Y]).clamp(true);

const xFor = (riskAppetite: number) => xScale(riskAppetite);
const yFor = (tightness: number) => yScale(tightness);

export function RegimeRadar({
  compact = false,
  detailsOpen = false,
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
  footer,
  primaryLabel,
  previousLabel,
  className = "",
}: RegimeRadarProps) {
  const boundaryX = xFor(riskAppetiteThreshold);
  const boundaryY = yFor(tightnessThreshold);
  const currentX = xFor(riskAppetite);
  const currentY = yFor(tightness);

  const trailPoints = (trail ?? []).map((point) => ({
    x: xFor(point.riskAppetite),
    y: yFor(point.tightness),
    /* A dated dot names its reading on hover, in the words the current marker uses. */
    title: point.label ? `${point.label}: Funding pressure ${point.tightness}, Risk appetite ${point.riskAppetite}` : undefined,
  }));
  /* A 2.4-unit dot is a 3px target at the card's size; the transparent ring is
     what the pointer has to find. Month-end readings can sit a couple of units
     apart, and full-size rings would let the later one swallow the earlier
     one's hover (SVG hit-testing is painter's order, so the last ring drawn
     wins), so each ring is capped at half the gap to its nearest dated
     neighbour: the rings meet at the midpoint and neither masks the other's
     date. */
  const hitRadii = trailPoints.map((point, index) => {
    if (!point.title) return 0;
    let nearest = Infinity;
    for (const [otherIndex, other] of trailPoints.entries()) {
      if (otherIndex === index || !other.title) continue;
      nearest = Math.min(nearest, Math.hypot(other.x - point.x, other.y - point.y));
    }
    return nearest === Infinity ? 7 : Math.min(7, nearest / 2);
  });
  const hasTrail = trailPoints.length > 0;
  const hasPrevious =
    !hasTrail &&
    typeof previousTightness === "number" &&
    typeof previousRiskAppetite === "number";
  const prevX = hasPrevious ? xFor(previousRiskAppetite!) : null;
  const prevY = hasPrevious ? yFor(previousTightness!) : null;
  /* The dated readings, again in HTML: the SVG titles on the dots are
     pointer-only, so touch, keyboard and screen-reader users read the same
     values here. */
  const readableReadings = [
    ...trailPoints.flatMap((point, index) =>
      point.title ? [{ key: `trail-${index}`, text: point.title }] : []),
    ...(hasPrevious && previousLabel
      ? [{ key: "previous", text: `${previousLabel}: Funding pressure ${previousTightness}, Risk appetite ${previousRiskAppetite}` }]
      : []),
    { key: "current", text: `${primaryLabel ?? "Current reading"}: Funding pressure ${tightness}, Risk appetite ${riskAppetite}` },
  ];

  // Which change line is nearer (horizontal vs vertical), for the projection guide.
  // The distance in points is the trust strip's margin, printed once beside the map.
  const nearestIsY = Math.abs(currentY - boundaryY) <= Math.abs(currentX - boundaryX);
  const tightnessLine = formatThresholdNumber(tightnessThreshold);
  const riskAppetiteLine = formatThresholdNumber(riskAppetiteThreshold);

  // Any string: a known regime maps to its weather word, anything else passes
  // through, so an unmodelled label still reads instead of rendering blank.
  const weatherLabel = getRegimePublicLabel(currentRegime).toLowerCase();

  /* The week's quadrant lit, the other three dimmed (2026-10-21). At one
     strength each, the four washes read as a legend and the map said nothing
     before the eye found the dot; now the week's weather is the one colour
     field on the plot. An unmodelled regime lights nothing and dims nothing. */
  const quadrants = [
    { key: "SCARCITY", x: PLOT_X, y: PLOT_Y, width: boundaryX - PLOT_X, height: boundaryY - PLOT_Y, fill: "var(--phase-scarcity)" },
    { key: "DEFENSIVE", x: boundaryX, y: PLOT_Y, width: PLOT_RIGHT - boundaryX, height: boundaryY - PLOT_Y, fill: "var(--phase-defensive)" },
    { key: "VOLATILE", x: PLOT_X, y: boundaryY, width: boundaryX - PLOT_X, height: PLOT_BOTTOM - boundaryY, fill: "var(--phase-volatile)" },
    { key: "EXPANSION", x: boundaryX, y: boundaryY, width: PLOT_RIGHT - boundaryX, height: PLOT_BOTTOM - boundaryY, fill: "var(--phase-expansion)" },
  ];
  const activeKey = currentRegime.toUpperCase();
  const hasActive = quadrants.some((quadrant) => quadrant.key === activeKey);

  return (
    <figure
      className={`relative m-0 flex flex-col items-center justify-center rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-nested)] p-3 ${className}`.trim()}
      aria-label={`Conditions radar: ${weatherLabel}, funding pressure ${tightness}, risk appetite ${riskAppetite}`}
    >
      <div className="mb-1.5 flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1 text-fluid-nano text-slate-300">
        <span className="font-semibold text-slate-100">Conditions</span>
        <span className="tabular-nums text-slate-400">
          Funding pressure {tightness} · Risk appetite {riskAppetite}
        </span>
      </div>
      {/* The picture's text alternative: which side of each change line is which
          condition. On the brief it is the only statement of the four from `md`
          up, where the one-line conditions legend gives way to this map. */}
      <p className="sr-only">
        {`Funding pressure above ${tightnessLine} and risk appetite below ${riskAppetiteLine}: Freezing. Above ${tightnessLine} and above ${riskAppetiteLine}: Cloudy. Below ${tightnessLine} and below ${riskAppetiteLine}: Stormy. Below ${tightnessLine} and above ${riskAppetiteLine}: Sunny.`}
      </p>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        /* 16rem (256px) at most: the plot is the card's one picture, and at
           200px its month-end trail bunched into a knot beside the current
           point. The viewBox text scales with it, to about 13px at the cap
           (§XVII). Rem, not px (2026-10-14), so the map grows with the large-
           display root step instead of shrinking against the text beside it. */
        className="block h-auto w-full max-w-[16rem]"
        aria-hidden="true"
      >
        <title>{`Funding pressure ${tightness} vs risk appetite ${riskAppetite} (${weatherLabel})`}</title>

        {/* The four conditions: Freezing top left, Cloudy top right, Stormy
            bottom left, Sunny bottom right. The week's is drawn twice over. */}
        {quadrants.map((quadrant) => {
          const active = quadrant.key === activeKey;
          return (
            <rect
              key={quadrant.key}
              x={quadrant.x}
              y={quadrant.y}
              width={quadrant.width}
              height={quadrant.height}
              fill={quadrant.fill}
              stroke={active ? "var(--regime-accent)" : "none"}
              strokeWidth={active ? "1" : "0"}
              strokeOpacity={active ? "0.4" : "0"}
              opacity={hasActive && !active ? 0.45 : 1}
              data-quadrant={quadrant.key}
              data-active={active ? "" : undefined}
            />
          );
        })}
        {quadrants
          .filter((quadrant) => quadrant.key === activeKey)
          .map((quadrant) => (
            <rect key={`${quadrant.key}-lit`} x={quadrant.x} y={quadrant.y} width={quadrant.width} height={quadrant.height} fill={quadrant.fill} />
          ))}

        {/* Quadrant corner labels, each in its condition's ink. These read the
            line-state families until 2026-10-09 (Sunny in the clear ink,
            Cloudy in the caution one), which tied a condition to a state. */}
        <text
          x={PLOT_X + 6}
          y={PLOT_Y + 12}
          className="text-[10px] font-bold uppercase tracking-wider"
          fill="var(--color-condition-freezing-ink)"
        >
          Freezing
        </text>
        <text
          x={PLOT_RIGHT - 6}
          y={PLOT_Y + 12}
          textAnchor="end"
          className="text-[10px] font-bold uppercase tracking-wider"
          fill="var(--color-condition-cloudy-ink)"
        >
          Cloudy
        </text>
        <text
          x={PLOT_X + 6}
          y={PLOT_BOTTOM - 6}
          className="text-[10px] font-bold uppercase tracking-wider"
          fill="var(--color-condition-stormy-ink)"
        >
          Stormy
        </text>
        <text
          x={PLOT_RIGHT - 6}
          y={PLOT_BOTTOM - 6}
          textAnchor="end"
          className="text-[10px] font-bold uppercase tracking-wider"
          fill="var(--color-condition-sunny-ink)"
        >
          Sunny
        </text>

        {/* Each corner's weather glyph, just outside the frame beside its
            word: left of the two left-hand words, right of the two right-hand
            ones. Inside, "Freezing" and its glyph would reach the change line
            at the default risk-appetite line of 50. 12.5 units is 16px at the
            plot's 16rem (256px) cap. */}
        <ConditionIcon regime="SCARCITY" x={PLOT_X - QUADRANT_ICON - 2} y={TOP_ICON_Y} width={QUADRANT_ICON} height={QUADRANT_ICON} />
        <ConditionIcon regime="DEFENSIVE" x={PLOT_RIGHT + 2} y={TOP_ICON_Y} width={QUADRANT_ICON} height={QUADRANT_ICON} />
        <ConditionIcon regime="VOLATILE" x={PLOT_X - QUADRANT_ICON - 2} y={BOTTOM_ICON_Y} width={QUADRANT_ICON} height={QUADRANT_ICON} />
        <ConditionIcon regime="EXPANSION" x={PLOT_RIGHT + 2} y={BOTTOM_ICON_Y} width={QUADRANT_ICON} height={QUADRANT_ICON} />

        {/* Grid and threshold boundary crosshairs */}
        <line
          x1={PLOT_X}
          y1={boundaryY}
          x2={PLOT_RIGHT}
          y2={boundaryY}
          stroke="var(--phase-boundary)"
          strokeDasharray="3 3"
          strokeWidth="1"
        >
          <title>{`Funding pressure change line at ${tightnessThreshold}`}</title>
        </line>
        <line
          x1={boundaryX}
          y1={PLOT_Y}
          x2={boundaryX}
          y2={PLOT_BOTTOM}
          stroke="var(--phase-boundary)"
          strokeDasharray="3 3"
          strokeWidth="1"
        >
          <title>{`Risk appetite change line at ${riskAppetiteThreshold}`}</title>
        </line>
        {/* Each change line's value at its end, so the quadrants are defined on
            the picture: "70" outside the right edge, "50" above the top. */}
        <text
          x={PLOT_RIGHT + 3}
          y={Math.min(LINE_LABEL_MAX_Y, Math.max(LINE_LABEL_MIN_Y, boundaryY)) + 3}
          className="fill-slate-400 text-[9px] tabular-nums"
          data-change-line="tightness"
        >
          {tightnessLine}
        </text>
        <text
          x={boundaryX}
          y={PLOT_Y - 3}
          textAnchor="middle"
          className="fill-slate-400 text-[9px] tabular-nums"
          data-change-line="riskAppetite"
        >
          {riskAppetiteLine}
        </text>

        {/* Boundary outer frame */}
        <rect
          x={PLOT_X}
          y={PLOT_Y}
          width={PLOT_SIZE}
          height={PLOT_SIZE}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth="1"
        />

        {/* Nearest boundary projection guide */}
        {nearestIsY ? (
          <line
            x1={currentX}
            y1={currentY}
            x2={currentX}
            y2={boundaryY}
            stroke="var(--regime-accent)"
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
            stroke="var(--regime-accent)"
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
              <g key={`${point.x}-${point.y}-${index}`}>
                {point.title ? <title>{point.title}</title> : null}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="2.4"
                  fill="var(--app-text-muted)"
                  fillOpacity={0.3 + (0.6 * (index + 1)) / trailPoints.length}
                />
                {/* The ring is the pointer's target; its radius keeps it from
                    covering a neighbour's date (see hitRadii). */}
                {point.title ? <circle cx={point.x} cy={point.y} r={hitRadii[index]} fill="transparent" /> : null}
              </g>
            ))}
          </g>
        ) : null}

        {/* Previous reading with dashed trail. Named when a surface passes a
            label for it: the scenario studio's hollow dot is this week's
            reading, and an unlabeled hollow dot would leave the two points
            identified only by which one has the filled center. */}
        {hasPrevious && prevX !== null && prevY !== null ? (
          <g>
            {previousLabel ? (
              <title>{`${previousLabel}: Funding pressure ${previousTightness}, Risk appetite ${previousRiskAppetite}`}</title>
            ) : null}
            <line
              x1={prevX}
              y1={prevY}
              x2={currentX}
              y2={currentY}
              stroke="var(--app-text-muted)"
              strokeWidth="1.2"
              strokeDasharray="2 2"
              strokeOpacity="0.6"
            />
            <circle
              cx={prevX}
              cy={prevY}
              r="2.5"
              fill="none"
              stroke="var(--app-text-muted)"
              strokeWidth="1.2"
              strokeOpacity="0.7"
            />
          </g>
        ) : null}

        {/* Current reading marker */}
        <g>
          <title>{`${primaryLabel ?? "Current reading"}: Funding pressure ${tightness}, Risk appetite ${riskAppetite} (${weatherLabel})`}</title>
          {/* Non-root SVG geometry scales from an origin of 0 0 unless told
              otherwise, so the ring would travel toward the bottom-right as it
              expanded; fill-box re-anchors each frame to this circle's own
              center and the pulse expands around the reading it marks.
              Two pulses, then a still ring (2026-10-27): it looped for as long as
              the page was open, which only a reduced-motion setting stopped
              (WCAG 2.2.2 asks that motion beside content end within five
              seconds), and a reading that moves once a week does not need to
              throb. 2 × 2.4s finds the eye and stops. */}
          <circle
            cx={currentX}
            cy={currentY}
            r="9"
            fill="none"
            stroke="var(--regime-accent)"
            strokeWidth="1"
            className="animate-ping motion-reduce:animate-none opacity-25"
            style={{ animationDuration: "2.4s", animationIterationCount: 2, transformBox: "fill-box", transformOrigin: "center" }}
          />
          <circle
            cx={currentX}
            cy={currentY}
            r="6.5"
            fill="none"
            stroke="var(--regime-accent)"
            strokeWidth="1.5"
            strokeOpacity="0.8"
          />
          <circle
            cx={currentX}
            cy={currentY}
            r="3.5"
            fill="var(--regime-accent)"
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
          Funding pressure ↑
        </text>
      </svg>

      {/* Always captioned with which corner is which (2026-10-14). The four
          words read as a severity scale and are not one: Sunny is easy on both
          axes and Freezing hard on both, while Cloudy and Stormy are each hard
          on one. The chart is where that shows, so it says so. */}
      <figcaption className="mt-1 space-y-0.5 text-center text-fluid-nano text-slate-400">
          {/* What the two directions mean before which corner is which
              (2026-10-21): the axes name two scores a first visit has not met,
              and the legend that decodes them in money terms is hidden from `md`
              up, where this chart replaces it. */}
          <span className="block text-slate-300" data-radar-orientation>
            {compact ? <>Up: {CONDITION_SIDE_MEANINGS.pressureAbove}. Right: {CONDITION_SIDE_MEANINGS.appetiteAbove}.</> : <>Higher means {CONDITION_SIDE_MEANINGS.pressureAbove}, further right means {CONDITION_SIDE_MEANINGS.appetiteAbove}. Sunny, bottom right, is the easiest; Freezing, top left, the hardest.</>}
          </span>
          {hasTrail && trailCaption ? <span className="block">{trailCaption}</span> : null}
          {!compact && hasTrail && caveat ? <span className="block">{caveat}</span> : null}
          {compact && (readableReadings.length > 1 || caveat) ? (
            <UrlDetails queryKey="chart" initialOpen={detailsOpen} summary="Scores on this chart"
              className="mx-auto max-w-md text-left" summaryClassName="weather-hit w-fit cursor-pointer">
              {hasTrail && caveat ? <p className="mb-2">{caveat}</p> : null}
              <ul className="list-disc pl-4">
                {readableReadings.map((reading) => <li key={reading.key}>{reading.text}</li>)}
              </ul>
            </UrlDetails>
          ) : readableReadings.length > 1 ? (
            <details className="mx-auto max-w-md text-left">
              {/* `weather-hit`: a 17px line is a 45px target with it, as the other summaries are. */}
              <summary className="weather-hit w-fit cursor-pointer">Scores on this chart</summary>
              <ul className="list-disc pl-4">
                {readableReadings.map((reading) => (
                  <li key={reading.key}>{reading.text}</li>
                ))}
              </ul>
            </details>
          ) : null}
          {footer ? <span className="block pt-1">{footer}</span> : null}
      </figcaption>
    </figure>
  );
}
