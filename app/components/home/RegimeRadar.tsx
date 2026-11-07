"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { scaleLinear } from "d3-scale";
import { CONDITION_SIDE_MEANINGS, getRegimePublicLabel } from "../../../lib/regimePresentation";
import { formatThresholdNumber } from "../../../lib/formatters";
import { classifyRegime } from "../../../lib/regimeEngineCore";
import { UrlDetails } from "../ui/urlDetails";
import { ConditionIcon } from "../ui/conceptIcons";
import type { RegimeKey } from "../../../lib/types";

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
  /** A last line under the caption. */
  footer?: ReactNode;
  /**
   * The id the "Scores on this chart" fold takes, so a tap on the map opens it: the
   * dots name their readings in hover titles, which a touch screen never shows.
   * Unique per page; without it the map is a picture and nothing more.
   */
  readingsId?: string;
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
  /** Where the reading would sit with the left-out inputs counted: its condition's own glyph, plotted. */
  feelsLike?: { regime: RegimeKey; tightness: number; riskAppetite: number } | null;
  /**
   * Direct-manipulation callback when a surface (such as Scenario Studio) commits
   * the scrubbed coordinates rather than springing back to the live reading.
   */
  onScrubScores?: (scores: { tightness: number; riskAppetite: number }) => void;
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
const FEELS_LIKE_ICON = 11;
const TOP_ICON_Y = PLOT_Y + 12 - 3.6 - QUADRANT_ICON / 2;
const BOTTOM_ICON_Y = PLOT_BOTTOM - 6 - 3.6 - QUADRANT_ICON / 2;

/* Where a change line's value is printed: "70" just outside the right edge at
   the funding-pressure line, clear of the corner glyphs above and below it. */
const LINE_LABEL_MIN_Y = TOP_ICON_Y + QUADRANT_ICON + 7;
const LINE_LABEL_MAX_Y = BOTTOM_ICON_Y - 2;
const SNAP_DETENT_POINTS = 1.6;
const DRAG_ACTIVATION_PX = 4;

const xScale = scaleLinear().domain([0, 100]).range([PLOT_X, PLOT_RIGHT]).clamp(true);
/* Funding pressure rises downward (2026-11-03), so up and right are both the easier
   side and Sunny is the top-right corner. The two scores read in opposite directions
   (high pressure is bad, high appetite is good), and an up-and-right map whose best
   corner was bottom right asked the reader to hold that in mind on every look. The
   number and its name do not change: the published record prints them. */
const yScale = scaleLinear().domain([0, 100]).range([PLOT_Y, PLOT_BOTTOM]).clamp(true);

const xFor = (riskAppetite: number) => xScale(riskAppetite);
const yFor = (tightness: number) => yScale(tightness);

const clampScore = (value: number) => Math.min(100, Math.max(0, value));

const formatSignedDelta = (delta: number) => {
  const rounded = Math.round(delta);
  if (rounded > 0) return `+${rounded}`;
  if (rounded < 0) return `−${Math.abs(rounded)}`;
  return "0";
};

const snapToThreshold = (value: number, threshold: number) =>
  Math.abs(value - threshold) <= SNAP_DETENT_POINTS ? threshold : value;

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
  readingsId,
  primaryLabel,
  previousLabel,
  feelsLike,
  onScrubScores,
  className = "",
}: RegimeRadarProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    didDrag: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const [scrub, setScrub] = useState<{
    tightness: number;
    riskAppetite: number;
    settling: boolean;
  } | null>(null);
  const scrubRef = useRef(scrub);

  const updateScrub = (
    next: { tightness: number; riskAppetite: number; settling: boolean } | null,
  ) => {
    scrubRef.current = next;
    setScrub(next);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const stopSpring = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const animateBackToRest = (startTightness: number, startRiskAppetite: number) => {
    stopSpring();
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      (Math.abs(startTightness - tightness) < 0.25 && Math.abs(startRiskAppetite - riskAppetite) < 0.25)
    ) {
      updateScrub(null);
      return;
    }

    let posT = startTightness;
    let posR = startRiskAppetite;
    let velT = 0;
    let velR = 0;
    let lastTime = performance.now();
    const stiffness = 290;
    const damping = 28;

    const step = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const forceT = -stiffness * (posT - tightness) - damping * velT;
      const forceR = -stiffness * (posR - riskAppetite) - damping * velR;
      velT += forceT * dt;
      velR += forceR * dt;
      posT += velT * dt;
      posR += velR * dt;

      if (
        Math.hypot(posT - tightness, posR - riskAppetite) < 0.35 &&
        Math.hypot(velT, velR) < 1.5
      ) {
        rafRef.current = null;
        updateScrub(null);
        return;
      }

      updateScrub({
        tightness: clampScore(posT),
        riskAppetite: clampScore(posR),
        settling: true,
      });
      rafRef.current = requestAnimationFrame(step);
    };

    updateScrub({
      tightness: startTightness,
      riskAppetite: startRiskAppetite,
      settling: true,
    });
    rafRef.current = requestAnimationFrame(step);
  };

  const readPointerScores = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const viewX = ((clientX - rect.left) / rect.width) * VIEW_W;
    const viewY = ((clientY - rect.top) / rect.height) * VIEW_H;
    const rawRisk = ((viewX - PLOT_X) / PLOT_SIZE) * 100;
    const rawTightness = ((viewY - PLOT_Y) / PLOT_SIZE) * 100;
    const nextRisk = snapToThreshold(clampScore(rawRisk), riskAppetiteThreshold);
    const nextTightness = snapToThreshold(clampScore(rawTightness), tightnessThreshold);
    return {
      tightness: Math.round(nextTightness),
      riskAppetite: Math.round(nextRisk),
    };
  };

  const applyScrub = (next: { tightness: number; riskAppetite: number }) => {
    stopSpring();
    if (onScrubScores) {
      onScrubScores(next);
      updateScrub({ ...next, settling: false });
      return;
    }
    updateScrub({ ...next, settling: false });
  };

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    stopSpring();
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      didDrag: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (onScrubScores) {
      const initial = readPointerScores(event.clientX, event.clientY);
      if (initial) {
        dragStateRef.current.didDrag = true;
        applyScrub(initial);
      }
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - state.startX, event.clientY - state.startY);
    if (!state.didDrag && distance < DRAG_ACTIVATION_PX) return;
    state.didDrag = true;
    const next = readPointerScores(event.clientX, event.clientY);
    if (next) applyScrub(next);
  };

  const finishPointerInteraction = (event: ReactPointerEvent<SVGSVGElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (state.didDrag) {
      suppressClickRef.current = true;
      const latest = scrubRef.current;
      if (onScrubScores) {
        updateScrub(null);
      } else if (latest) {
        animateBackToRest(latest.tightness, latest.riskAppetite);
      }
    } else if (scrubRef.current) {
      animateBackToRest(scrubRef.current.tightness, scrubRef.current.riskAppetite);
    }
  };

  /* The plotted glyph and Freezing's corner word want the same corner when the left-out
     inputs land there: the word moves to the top of its quadrant, and the plotted glyph
     stands in for the one beside it. */
  const freezingUp =
    Boolean(feelsLike) && yFor(feelsLike?.tightness ?? 0) > PLOT_BOTTOM - 26 && xFor(feelsLike?.riskAppetite ?? 100) < PLOT_X + 76;
  const boundaryX = xFor(riskAppetiteThreshold);
  const boundaryY = yFor(tightnessThreshold);
  const currentX = xFor(riskAppetite);
  const currentY = yFor(tightness);

  const isScrubbing = scrub !== null;
  const scrubTightness = scrub ? Math.round(scrub.tightness) : tightness;
  const scrubRiskAppetite = scrub ? Math.round(scrub.riskAppetite) : riskAppetite;
  const scrubX = scrub ? xFor(scrub.riskAppetite) : currentX;
  const scrubY = scrub ? yFor(scrub.tightness) : currentY;
  const scrubbedRegime = isScrubbing
    ? classifyRegime(scrubTightness, scrubRiskAppetite, {
        tightnessRegime: tightnessThreshold,
        riskAppetiteRegime: riskAppetiteThreshold,
      })
    : null;
  const scrubbedWeatherLabel = scrubbedRegime ? getRegimePublicLabel(scrubbedRegime) : null;
  const snapTightnessActive = isScrubbing && Math.abs(scrub.tightness - tightnessThreshold) < 0.5;
  const snapRiskActive = isScrubbing && Math.abs(scrub.riskAppetite - riskAppetiteThreshold) < 0.5;

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
     values here. A table since 2026-11-03: one sentence per month named both
     scores in every row, twice per page. */
  const readableReadings = [
    ...(trail ?? []).flatMap((point, index) =>
      point.label ? [{ key: `trail-${index}`, label: point.label, tightness: point.tightness, riskAppetite: point.riskAppetite }] : []),
    ...(hasPrevious && previousLabel
      ? [{ key: "previous", label: previousLabel, tightness: previousTightness, riskAppetite: previousRiskAppetite }]
      : []),
    { key: "current", label: primaryLabel ?? "Current reading", tightness, riskAppetite },
  ];
  const readingsTable = (
    <table className="w-full border-collapse text-left tabular-nums">
      <thead>
        <tr className="text-slate-400">
          <th scope="col" className="py-0.5 pr-3 font-medium">Reading</th>
          <th scope="col" className="py-0.5 pr-3 font-medium">Funding pressure</th>
          <th scope="col" className="py-0.5 font-medium">Risk appetite</th>
        </tr>
      </thead>
      <tbody>
        {readableReadings.map((reading) => (
          <tr key={reading.key}>
            <th scope="row" className="whitespace-nowrap py-0.5 pr-3 font-normal">{reading.label}</th>
            <td className="py-0.5 pr-3">{reading.tightness}</td>
            <td className="py-0.5">{reading.riskAppetite}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

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
    { key: "SCARCITY", x: PLOT_X, y: boundaryY, width: boundaryX - PLOT_X, height: PLOT_BOTTOM - boundaryY, fill: "var(--phase-scarcity)" },
    { key: "DEFENSIVE", x: boundaryX, y: boundaryY, width: PLOT_RIGHT - boundaryX, height: PLOT_BOTTOM - boundaryY, fill: "var(--phase-defensive)" },
    { key: "VOLATILE", x: PLOT_X, y: PLOT_Y, width: boundaryX - PLOT_X, height: boundaryY - PLOT_Y, fill: "var(--phase-volatile)" },
    { key: "EXPANSION", x: boundaryX, y: PLOT_Y, width: PLOT_RIGHT - boundaryX, height: boundaryY - PLOT_Y, fill: "var(--phase-expansion)" },
  ];
  const activeKey = (scrubbedRegime ?? currentRegime).toUpperCase();
  const hasActive = quadrants.some((quadrant) => quadrant.key === activeKey);
  /* A tap on the map opens the readings it plots (2026-11-03). Out of the tab order and
     hidden like the picture: the fold's own summary is the keyboard's way in. */
  const readingsFold = compact ? readableReadings.length > 1 || Boolean(caveat) : readableReadings.length > 1;
  const linkToReadings = (chart: ReactNode) =>
    readingsId && readingsFold ? (
      <a href={`#${readingsId}`} tabIndex={-1} aria-hidden="true" title="Scores on this chart" className="block w-full max-w-[16rem]">
        {chart}
      </a>
    ) : (
      chart
    );

  return (
    <figure
      className={`relative m-0 flex flex-col items-center justify-center rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-nested)] p-3 ${className}`.trim()}
      aria-label={`Conditions radar: ${weatherLabel}, funding pressure ${tightness}, risk appetite ${riskAppetite}`}
      data-scrubbing={isScrubbing ? "" : undefined}
    >
      <div className="mb-1.5 flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1 text-fluid-nano text-slate-300">
        <span className="font-semibold text-slate-100">
          {isScrubbing && scrubbedWeatherLabel ? (
            <span data-radar-scrub-status>
              {scrub.settling ? "Returning · " : "Exploring "}
              <span className="text-[color:var(--regime-ink)]">{scrubbedWeatherLabel}</span>
              {scrubbedRegime !== currentRegime.toUpperCase() ? " (changes conditions)" : ""}
            </span>
          ) : (
            "Conditions"
          )}
        </span>
        {/* Not on the card (2026-11-03): the facts line beside the map states both scores. */}
        {isScrubbing ? (
          <span className="tabular-nums text-slate-200" data-radar-scrub-readout>
            {`Pressure ${scrubTightness} (${formatSignedDelta(scrubTightness - tightness)}) · Appetite ${scrubRiskAppetite} (${formatSignedDelta(scrubRiskAppetite - riskAppetite)})`}
          </span>
        ) : compact ? null : (
          <span className="tabular-nums text-slate-400">
            Funding pressure {tightness} · Risk appetite {riskAppetite}
          </span>
        )}
      </div>
      {/* The picture's text alternative: which side of each change line is which
          condition. On the brief it is the only statement of the four from `md`
          up, where the one-line conditions legend gives way to this map. */}
      <p className="sr-only">
        {/* The two cuts once (2026-11-03): it repeated both numbers for each of the four. */}
        {`Funding pressure below ${tightnessLine} and risk appetite above ${riskAppetiteLine}: Sunny. The opposite: Freezing. Both above: Cloudy. Both below: Stormy.`}
      </p>

      {linkToReadings(<svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        /* 16rem (256px) at most: the plot is the card's one picture, and at
           200px its month-end trail bunched into a knot beside the current
           point. The viewBox text scales with it, to about 13px at the cap
           (§XVII). Rem, not px (2026-10-14), so the map grows with the large-
           display root step instead of shrinking against the text beside it. */
        className="block h-auto w-full max-w-[16rem]"
        aria-hidden="true"
        style={isScrubbing ? { touchAction: "none", userSelect: "none", cursor: "grabbing" } : { touchAction: "none", userSelect: "none", cursor: "crosshair" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerInteraction}
        onPointerCancel={finishPointerInteraction}
        onClick={(event) => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <title>{`Funding pressure ${tightness} vs risk appetite ${riskAppetite} (${weatherLabel})`}</title>

        {/* The four conditions: Stormy top left, Sunny top right, Freezing
            bottom left, Cloudy bottom right. The week's is drawn twice over. */}
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
          y={freezingUp ? boundaryY + 12 : PLOT_BOTTOM - 6}
          className="text-[11px] font-bold uppercase tracking-wider"
          fill="var(--color-condition-freezing-ink)"
        >
          Freezing
        </text>
        <text
          x={PLOT_RIGHT - 6}
          y={PLOT_BOTTOM - 6}
          textAnchor="end"
          className="text-[11px] font-bold uppercase tracking-wider"
          fill="var(--color-condition-cloudy-ink)"
        >
          Cloudy
        </text>
        <text
          x={PLOT_X + 6}
          y={PLOT_Y + 12}
          className="text-[11px] font-bold uppercase tracking-wider"
          fill="var(--color-condition-stormy-ink)"
        >
          Stormy
        </text>
        <text
          x={PLOT_RIGHT - 6}
          y={PLOT_Y + 12}
          textAnchor="end"
          className="text-[11px] font-bold uppercase tracking-wider"
          fill="var(--color-condition-sunny-ink)"
        >
          Sunny
        </text>

        {/* Each corner's weather glyph, just outside the frame beside its
            word: left of the two left-hand words, right of the two right-hand
            ones. Inside, "Freezing" and its glyph would reach the change line
            at the default risk-appetite line of 50. 12.5 units is 16px at the
            plot's 16rem (256px) cap. */}
        {freezingUp ? null : <ConditionIcon regime="SCARCITY" x={PLOT_X - QUADRANT_ICON - 2} y={BOTTOM_ICON_Y} width={QUADRANT_ICON} height={QUADRANT_ICON} />}
        <ConditionIcon regime="DEFENSIVE" x={PLOT_RIGHT + 2} y={BOTTOM_ICON_Y} width={QUADRANT_ICON} height={QUADRANT_ICON} />
        <ConditionIcon regime="VOLATILE" x={PLOT_X - QUADRANT_ICON - 2} y={TOP_ICON_Y} width={QUADRANT_ICON} height={QUADRANT_ICON} />
        <ConditionIcon regime="EXPANSION" x={PLOT_RIGHT + 2} y={TOP_ICON_Y} width={QUADRANT_ICON} height={QUADRANT_ICON} />

        {/* Grid and threshold boundary crosshairs */}
        <line
          x1={PLOT_X}
          y1={boundaryY}
          x2={PLOT_RIGHT}
          y2={boundaryY}
          stroke={snapTightnessActive ? "var(--regime-ink)" : "var(--phase-boundary)"}
          strokeDasharray={snapTightnessActive ? undefined : "3 3"}
          strokeWidth={snapTightnessActive ? "1.6" : "1"}
        >
          <title>{`Funding pressure change line at ${tightnessThreshold}`}</title>
        </line>
        <line
          x1={boundaryX}
          y1={PLOT_Y}
          x2={boundaryX}
          y2={PLOT_BOTTOM}
          stroke={snapRiskActive ? "var(--regime-ink)" : "var(--phase-boundary)"}
          strokeDasharray={snapRiskActive ? undefined : "3 3"}
          strokeWidth={snapRiskActive ? "1.6" : "1"}
        >
          <title>{`Risk appetite change line at ${riskAppetiteThreshold}`}</title>
        </line>
        {/* Each change line's value at its end, so the quadrants are defined on
            the picture: "70" outside the right edge, "50" above the top. */}
        <text
          x={PLOT_RIGHT + 3}
          y={Math.min(LINE_LABEL_MAX_Y, Math.max(LINE_LABEL_MIN_Y, boundaryY)) + 3}
          className="fill-slate-400 text-[11px] tabular-nums"
          data-change-line="tightness"
        >
          {tightnessLine}
        </text>
        <text
          x={boundaryX}
          y={PLOT_Y - 3}
          textAnchor="middle"
          className="fill-slate-400 text-[11px] tabular-nums"
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

        {/* Where it feels like: the other condition's own glyph, tied to the reading. */}
        {feelsLike ? (
          <g data-feels-like-point>
            <line
              x1={currentX}
              y1={currentY}
              x2={xFor(feelsLike.riskAppetite)}
              y2={yFor(feelsLike.tightness)}
              stroke={`var(--color-condition-${getRegimePublicLabel(feelsLike.regime).toLowerCase()}-ink)`}
              strokeDasharray="2 2"
              strokeWidth="1"
            />
            <ConditionIcon
              regime={feelsLike.regime}
              x={xFor(feelsLike.riskAppetite) - FEELS_LIKE_ICON / 2}
              y={yFor(feelsLike.tightness) - FEELS_LIKE_ICON / 2}
              width={FEELS_LIKE_ICON}
              height={FEELS_LIKE_ICON}
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

        {/* Direct-manipulation scrub overlay: rendered only while actively scrubbing or spring-settling */}
        {isScrubbing ? (
          <g data-radar-scrub-overlay>
            {/* Projection guides from scrubbed crosshair to both change lines */}
            <line
              x1={scrubX}
              y1={scrubY}
              x2={scrubX}
              y2={boundaryY}
              stroke="var(--regime-ink)"
              strokeDasharray="1.5 1.5"
              strokeWidth="1"
              strokeOpacity="0.85"
            />
            <line
              x1={scrubX}
              y1={scrubY}
              x2={boundaryX}
              y2={scrubY}
              stroke="var(--regime-ink)"
              strokeDasharray="1.5 1.5"
              strokeWidth="1"
              strokeOpacity="0.85"
            />
            {/* Vector from live reading to scrubbed crosshair */}
            <line
              x1={currentX}
              y1={currentY}
              x2={scrubX}
              y2={scrubY}
              stroke="var(--regime-ink)"
              strokeWidth="1.25"
              strokeOpacity="0.9"
            />
            <circle
              cx={scrubX}
              cy={scrubY}
              r="7.5"
              fill="none"
              stroke="var(--regime-ink)"
              strokeWidth="1.4"
              strokeOpacity="0.9"
            />
            <circle
              cx={scrubX}
              cy={scrubY}
              r="3.2"
              fill="var(--regime-ink)"
            />
          </g>
        ) : null}

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
          ← Funding pressure
        </text>
      </svg>)}

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
            {compact ? <>Up: {CONDITION_SIDE_MEANINGS.pressureBelow}. Right: {CONDITION_SIDE_MEANINGS.appetiteAbove}.</> : <>Up means {CONDITION_SIDE_MEANINGS.pressureBelow}, right means {CONDITION_SIDE_MEANINGS.appetiteAbove}. Sunny, top right, is the easiest; Freezing, bottom left, the hardest.</>}
          </span>
          {hasTrail && trailCaption ? <span className="block">{trailCaption}</span> : null}
          {feelsLike && !compact ? (
            <span className="block" data-feels-like-key>
              <ConditionIcon regime={feelsLike.regime} className="mr-1 inline align-text-bottom" />
              Where it feels like.
            </span>
          ) : null}
          {!compact && hasTrail && caveat ? <span className="block">{caveat}</span> : null}
          {compact && (readableReadings.length > 1 || caveat) ? (
            <UrlDetails id={readingsId} queryKey="chart" initialOpen={detailsOpen} summary="Scores on this chart"
              className="mx-auto max-w-md text-left" summaryClassName="weather-hit w-fit cursor-pointer">
              {hasTrail && caveat ? <p className="mb-2">{caveat}</p> : null}
              {readingsTable}
            </UrlDetails>
          ) : readableReadings.length > 1 ? (
            <details id={readingsId} className="mx-auto max-w-md text-left">
              {/* `weather-hit`: a 17px line is a 45px target with it, as the other summaries are. */}
              <summary className="weather-hit w-fit cursor-pointer">Scores on this chart</summary>
              {readingsTable}
            </details>
          ) : null}
          {footer ? <span className="block pt-1">{footer}</span> : null}
      </figcaption>
    </figure>
  );
}
