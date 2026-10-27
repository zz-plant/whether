import { ScreenshotCaption } from "../screenshotCaption";
import { scaleLinear } from "d3-scale";
import { ActionLink } from "../ui/actionLink";
import { UrlDetails } from "../ui/urlDetails";
import { Fact, FactList } from "../ui/factList";
import {
  PHASE_SPANS,
  REGIME_HEX_COLORS,
  buildRegimePhaseModel,
  describePhaseGap,
  type PhasePoint,
  type PhaseSeriesEntry,
  type PhaseSpanKey,
} from "../../../lib/regimePhaseSpace";
import type { RegimeKey } from "../../../lib/types";
import Link from "next/link";
import { regimeDataAttribute } from "../../../lib/regimeAccent";

/**
 * The regime plane. Both scores on one pair of axes, with the classifier's two
 * boundaries drawn where they actually cut, and the record's path across them.
 *
 * The page this replaced showed the same 175 months as twelve rows of text and
 * two trailing-12-month line charts in a collapsed disclosure. Those charts
 * answer "did each number move"; none of the surface answered "where is the
 * reading relative to the rule", which is the only question the archive exists
 * to settle.
 *
 * ## No JavaScript, on purpose
 *
 * There is no client bundle here. The whole chart — quadrants, boundaries, the
 * trace, every label — is server-rendered SVG, and the one control writes to the
 * URL as a plain link, so the back button reverses it and a shared link opens on
 * the same window (UI standards §V). This product's artifact is a screenshot
 * pasted into Slack; a chart whose content depends on hover state is a chart
 * that screenshots empty.
 *
 * For the same reason nothing here animates. A pulsing "you are here" marker
 * would be captured at whatever opacity the animation happened to be at.
 */

const VIEW_W = 332;
const VIEW_H = 344;
const PLOT_X = 46;
const PLOT_Y = 18;
/** Square, so a reader who does compare the axes by eye is not misled by the
 *  frame. What the square must not invite is a diagonal — see the note on
 *  Euclidean distance in `lib/regimePhaseSpace.ts`. */
const PLOT_SIZE = 268;
const PLOT_RIGHT = PLOT_X + PLOT_SIZE;
const PLOT_BOTTOM = PLOT_Y + PLOT_SIZE;

const TICKS = [0, 25, 50, 75, 100] as const;

const xScale = scaleLinear().domain([0, 100]).range([PLOT_X, PLOT_RIGHT]).clamp(true);
const yScale = scaleLinear().domain([0, 100]).range([PLOT_BOTTOM, PLOT_Y]).clamp(true);

const xFor = (riskAppetite: number) => xScale(riskAppetite);
const yFor = (tightness: number) => yScale(tightness);

const toPath = (points: PhasePoint[]) =>
  points
    .map((point, index) => `${index === 0 ? "M" : "L"}${xFor(point.riskAppetite).toFixed(1)} ${yFor(point.tightness).toFixed(1)}`)
    .join(" ");

/**
 * Consecutive months sharing a regime, as one path each, so the trace carries the
 * call it was under without one `<path>` per month. Each run reaches one point
 * into the next so the segments meet; the joining segment takes the colour of the
 * regime it left, which is the same convention the timeline rail uses.
 */
const buildRuns = (points: PhasePoint[]) => {
  const runs: { regime: RegimeKey; d: string; endIndex: number }[] = [];
  let start = 0;

  for (let index = 1; index <= points.length; index += 1) {
    const ended = index === points.length || points[index]!.regime !== points[start]!.regime;
    if (!ended) continue;
    const slice = points.slice(start, Math.min(index + 1, points.length));
    if (slice.length > 1) {
      runs.push({ regime: points[start]!.regime, d: toPath(slice), endIndex: index - 1 });
    }
    start = index;
  }

  return runs;
};

const percent = (share: number) => `${Math.round(share * 100)}%`;

type RegimePhaseMapProps = {
  /** Oldest first, already windowed to the active span by the caller. */
  series: PhaseSeriesEntry[];
  activeSpan: PhaseSpanKey;
  /** The caller owns the rest of the query string, so it owns the href. */
  spanHref: (span: PhaseSpanKey) => string;
  /** Months in the full record, for the line that says what the window is a slice of. */
  totalMonths: number;
  /** Server-resolved open state: a shared `?map=1` link, or a window link (`?span=`). */
  open?: boolean;
};

export function RegimePhaseMap({ series, activeSpan, spanHref, totalMonths, open = false }: RegimePhaseMapProps) {
  const model = buildRegimePhaseModel(series);
  if (!model) return null;

  const { current, gaps, thresholds } = model;
  const boundaryX = xFor(thresholds.riskAppetite);
  const boundaryY = yFor(thresholds.tightness);
  const currentX = xFor(current.riskAppetite);
  const currentY = yFor(current.tightness);

  /* Corner-anchored so the four names stay clear of the crosshair the boundaries
     make in the middle, which is exactly where the interesting readings sit. */
  const quadrants = [
    { regime: "SCARCITY" as const, x: PLOT_X, y: PLOT_Y, w: boundaryX - PLOT_X, h: boundaryY - PLOT_Y, tx: PLOT_X + 8, ty: PLOT_Y + 17, anchor: "start" as const, fill: "var(--phase-scarcity)" },
    { regime: "DEFENSIVE" as const, x: boundaryX, y: PLOT_Y, w: PLOT_RIGHT - boundaryX, h: boundaryY - PLOT_Y, tx: PLOT_RIGHT - 8, ty: PLOT_Y + 17, anchor: "end" as const, fill: "var(--phase-defensive)" },
    { regime: "VOLATILE" as const, x: PLOT_X, y: boundaryY, w: boundaryX - PLOT_X, h: PLOT_BOTTOM - boundaryY, tx: PLOT_X + 8, ty: PLOT_BOTTOM - 9, anchor: "start" as const, fill: "var(--phase-volatile)" },
    { regime: "EXPANSION" as const, x: boundaryX, y: boundaryY, w: PLOT_RIGHT - boundaryX, h: PLOT_BOTTOM - boundaryY, tx: PLOT_RIGHT - 8, ty: PLOT_BOTTOM - 9, anchor: "end" as const, fill: "var(--phase-expansion)" },
  ];

  const runs = buildRuns(model.points);
  const oldest = model.points[0]!;
  const spanDescription = PHASE_SPANS.find((span) => span.key === activeSpan)?.description ?? "";

  /* SVG `<title>` is a text-only element, so React cannot separate two children
     with a comment the way it does elsewhere: the server writes one text node,
     the client expects two, and hydration fails on the whole page. Every title
     below is therefore assembled here and passed as a single string. */
  const chartTitle = `Funding pressure against risk appetite, ${spanDescription}`;
  const currentTitle = `${current.monthLabel}: ${current.regimeLabel} — funding pressure ${current.tightness}, risk appetite ${current.riskAppetite}`;
  const description = [
    `${current.monthLabel} reads ${current.regimeLabel}: funding pressure ${current.tightness}, risk appetite ${current.riskAppetite}.`,
    `Conditions change when funding pressure crosses ${thresholds.tightness} or risk appetite crosses ${thresholds.riskAppetite}.`,
    describePhaseGap(gaps.tightness),
    describePhaseGap(gaps.riskAppetite),
    `The plotted path covers ${model.points.length} months, from ${oldest.monthLabel} to ${current.monthLabel}, and crosses a change line ${model.changes.length} times.`,
  ].join(" ");

  return (
    /* Closed until asked. The month strip, the published weeks and the track
       record answer what the page is for; this chart explains the mechanism,
       and open it was the tallest block on the page, ahead of the month table
       and the published weeks. The heading is the summary, so the outline and
       the rail still name it. */
    <UrlDetails
      queryKey="map"
      initialOpen={open}
      className="weather-auto-chevron weather-panel px-5 max-sm:px-0 py-5"
      summaryClassName="cursor-pointer select-none"
      summary={
        /* Headed as the mechanism, not the reading. The month strip and the
           track record above already give the record's answer; this chart
           is the second read — how the two scores decide the call — and a
           heading that said "where this month sits" made it compete with
           them for the first question. */
        <h2 className="text-[1.375rem] leading-tight font-semibold text-white sm:text-2xl" id="phase-map-heading">
          How the two scores set conditions
        </h2>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="max-w-prose text-sm text-slate-300">
              Funding pressure and risk appetite together are one point on this chart, and conditions
              follow whichever quarter of it the point lands in. The lines at {thresholds.tightness} and{" "}
              {thresholds.riskAppetite} are the same two numbers the weekly brief cites.
            </p>
          </div>

          {/* A control, not navigation, but it changes the URL rather than client
              state so a shared link opens on the window the sharer was reading. */}
          <nav aria-label="Window shown on the phase map" className="flex shrink-0 flex-wrap gap-1.5">
            {PHASE_SPANS.map((span) => {
              const active = span.key === activeSpan;
              return (
                <ActionLink
                  key={span.key}
                  href={spanHref(span.key)}
                  scroll={false}
                  variant="pill"
                  aria-current={active ? "true" : undefined}
                  aria-label={`Show ${span.description}`}
                  /* Padding and weight only. The pill's 44px floor is the touch
                     target the standards set, and a segmented row is exactly the
                     place the temptation to shrink it turns up. */
                  className={active ? "border-sky-400/60 bg-sky-500/15 text-sky-100" : "text-slate-300"}
                >
                  {span.label}
                </ActionLink>
              );
            })}
          </nav>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <figure className="m-0">
            {/* The chart is hidden from assistive tech, and real text carries its
                content instead: the paragraph below, the visible caption, and the
                full table further down. `role="img"` would prune the ~200 shapes to one
                labelled node, which is the usual fix, but it collapses the whole
                thing to a single `<desc>` string — and a reader who wants the March
                2024 coordinate cannot get at it that way. Prose plus a table is both
                more useful and more portable than a description AT announces
                inconsistently. */}
            <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="mx-auto block h-auto w-full max-w-[30rem]" aria-hidden="true">
              {/* Kept under aria-hidden because a native tooltip is a pointer
                  affordance, not an accessibility one; the table is the other route. */}
              <title>{chartTitle}</title>

              {quadrants.map((quadrant) => (
                <rect key={quadrant.regime} x={quadrant.x} y={quadrant.y} width={quadrant.w} height={quadrant.h} fill={quadrant.fill} />
              ))}

              {TICKS.filter((tick) => tick > 0 && tick < 100).map((tick) => (
                <g key={`grid-${tick}`}>
                  <line x1={xFor(tick)} y1={PLOT_Y} x2={xFor(tick)} y2={PLOT_BOTTOM} stroke="var(--phase-grid)" strokeWidth="1" />
                  <line x1={PLOT_X} y1={yFor(tick)} x2={PLOT_RIGHT} y2={yFor(tick)} stroke="var(--phase-grid)" strokeWidth="1" />
                </g>
              ))}

              {/* The frame, minus its top edge. That edge is funding pressure 100,
                  which is where the score stops distinguishing expensive money from
                  very expensive money — so when the window holds clipped months it
                  is drawn as a broken line rather than as an ordinary axis end, and
                  markers pinned there sit visibly on it. Saying so costs no extra
                  ink and no label that could collide with the quadrant names; the
                  caption and the table's asterisk carry the wording. */}
              <path
                d={`M${PLOT_X} ${PLOT_Y} V${PLOT_BOTTOM} H${PLOT_RIGHT} V${PLOT_Y}`}
                fill="none"
                stroke="var(--phase-grid)"
                strokeWidth="1"
              />
              <line
                x1={PLOT_X}
                y1={PLOT_Y}
                x2={PLOT_RIGHT}
                y2={PLOT_Y}
                stroke={model.saturatedMonths > 0 ? "var(--phase-boundary)" : "var(--phase-grid)"}
                strokeWidth={model.saturatedMonths > 0 ? 1.5 : 1}
                strokeDasharray={model.saturatedMonths > 0 ? "2 3" : undefined}
              />

              {quadrants.map((quadrant) => (
                <text
                  key={`label-${quadrant.regime}`}
                  x={quadrant.tx}
                  y={quadrant.ty}
                  textAnchor={quadrant.anchor}
                  fontSize="13"
                  fontWeight="600"
                  letterSpacing="0.04em"
                  data-regime={regimeDataAttribute(quadrant.regime)}
                  fill="var(--regime-ink)"
                >
                  {model.occupancy.find((row) => row.regime === quadrant.regime)?.regimeLabel.toUpperCase()}
                </text>
              ))}

              {/* The rule itself. Heavier than the grid because these two lines are
                  the only ones that decide anything. */}
              <line x1={boundaryX} y1={PLOT_Y} x2={boundaryX} y2={PLOT_BOTTOM} stroke="var(--phase-boundary)" strokeWidth="1.5" />
              <line x1={PLOT_X} y1={boundaryY} x2={PLOT_RIGHT} y2={boundaryY} stroke="var(--phase-boundary)" strokeWidth="1.5" />

              {runs.map((run, index) => (
                <path
                  key={`run-${index}`}
                  d={run.d}
                  fill="none"
                  stroke={REGIME_HEX_COLORS[run.regime]}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  /* Older runs recede rather than disappear: the decade parked at the
                     zero bound is the context that makes the excursion legible. */
                  opacity={(0.22 + 0.55 * (run.endIndex / Math.max(model.points.length - 1, 1))).toFixed(2)}
                />
              ))}

              {model.recent.map((point, index) => (
                <circle
                  key={`recent-${point.recordDate}`}
                  cx={xFor(point.riskAppetite)}
                  cy={yFor(point.tightness)}
                  r={1.6 + 1.1 * (index / Math.max(model.recent.length - 1, 1))}
                  fill={REGIME_HEX_COLORS[point.regime]}
                  opacity={(0.45 + 0.45 * (index / Math.max(model.recent.length - 1, 1))).toFixed(2)}
                />
              ))}

              {/* The months the call actually changed — the events the track record
                  below calls the thing worth reading. Rings, not dots, so they read
                  as annotation over the trace rather than as more of it. */}
              {model.changes.map((point) => (
                <g key={`change-${point.recordDate}`}>
                  <title>{`${point.monthLabel}: changed to ${point.regimeLabel} — funding pressure ${point.tightness}, risk appetite ${point.riskAppetite}`}</title>
                  <circle
                    cx={xFor(point.riskAppetite)}
                    cy={yFor(point.tightness)}
                    r="4"
                    fill="none"
                    stroke={REGIME_HEX_COLORS[point.regime]}
                    strokeWidth="1.5"
                    opacity="0.9"
                  />
                </g>
              ))}

              {/* Both gaps, each on its own axis, each in its own points. Never a
                  hypotenuse — the two scales are not commensurable and a diagonal
                  would quietly claim they are. */}
              <g stroke={REGIME_HEX_COLORS[current.regime]} strokeWidth="1" strokeDasharray="3 3" opacity="0.75">
                <line x1={currentX} y1={currentY} x2={boundaryX} y2={currentY} />
                <line x1={currentX} y1={currentY} x2={currentX} y2={boundaryY} />
              </g>
              {/* Knocked out of whatever they land on. A gap label sits by
                  construction in the busiest part of the plot — between the reading
                  and the rule — so relying on placement alone to keep it off the
                  trace does not survive a change of window. */}
              {/* Each label sits at the rule end of its own gap line, just past
                  the rule, on the side away from the marker. They used to sit at
                  the midpoints, which for a reading near both rules — the usual
                  case, since a call is made near its lines — put the two labels
                  on the same few units of plot and on the marker's halo. */}
              <g fontSize="12" fontWeight="600" fill="var(--app-text-secondary)" stroke="var(--bg-panel)" strokeWidth="3.5" paintOrder="stroke">
                <text
                  x={boundaryX + (boundaryX < currentX ? -5 : 5)}
                  y={currentY + 3.2}
                  textAnchor={boundaryX < currentX ? "end" : "start"}
                >
                  {gaps.riskAppetite.distance} pts
                </text>
                <text
                  x={currentX}
                  y={boundaryY < currentY ? boundaryY - 5 : boundaryY + 11}
                  textAnchor="middle"
                >
                  {gaps.tightness.distance} pts
                </text>
              </g>

              <g>
                <title>{currentTitle}</title>
                <circle cx={currentX} cy={currentY} r="9" fill={REGIME_HEX_COLORS[current.regime]} opacity="0.18" />
                <circle
                  cx={currentX}
                  cy={currentY}
                  r="4.5"
                  fill={REGIME_HEX_COLORS[current.regime]}
                  stroke="var(--bg-panel)"
                  strokeWidth="1.5"
                />
              </g>
              <text
                x={currentX + (current.riskAppetite > 70 ? -13 : 13)}
                y={currentY + 3.5}
                textAnchor={current.riskAppetite > 70 ? "end" : "start"}
                fontSize="12"
                fontWeight="700"
                fill="var(--app-text)"
                stroke="var(--bg-panel)"
                strokeWidth="3.5"
                paintOrder="stroke"
              >
                {current.monthLabel}
              </text>

              {/* Where the drawn path starts, so the trace reads as a direction
                  rather than as a cloud with one highlighted member. A bare marker,
                  named in the caption instead of in the plot: the oldest reading
                  lands wherever the window happens to open, and every in-plot label
                  for it collided with a quadrant name for some window — at five
                  years it sat on top of SUNNY. */}
              <circle
                cx={xFor(oldest.riskAppetite)}
                cy={yFor(oldest.tightness)}
                r="2.5"
                fill="none"
                stroke="var(--phase-trace)"
                strokeWidth="1.5"
              />

              {TICKS.map((tick) => (
                <text key={`x-tick-${tick}`} x={xFor(tick)} y={PLOT_BOTTOM + 15} textAnchor="middle" fontSize="12" fill="var(--app-text-muted)">
                  {tick}
                </text>
              ))}
              {TICKS.map((tick) => (
                <text key={`y-tick-${tick}`} x={PLOT_X - 8} y={yFor(tick) + 3.4} textAnchor="end" fontSize="12" fill="var(--app-text-muted)">
                  {tick}
                </text>
              ))}

              <text x={PLOT_X + PLOT_SIZE / 2} y={VIEW_H - 8} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--app-text-secondary)">
                Risk appetite →
              </text>
              <text
                x={13}
                y={PLOT_Y + PLOT_SIZE / 2}
                textAnchor="middle"
                fontSize="13"
                fontWeight="600"
                fill="var(--app-text-secondary)"
                transform={`rotate(-90 13 ${PLOT_Y + PLOT_SIZE / 2})`}
              >
                Funding pressure →
              </text>
            </svg>

            <p className="sr-only">{description}</p>

            <figcaption className="mt-2 max-w-prose text-fluid-nano text-white/45">
              {model.points.length} of {totalMonths.toLocaleString("en-US")} months on record, from {oldest.monthLabel} at
              the hollow grey marker to {current.monthLabel} at the filled one. Coloured rings mark the{" "}
              {model.changes.length}{" "}
              {model.changes.length === 1 ? "month" : "months"} conditions changed.
              {model.saturatedMonths > 0 ? (
                <>
                  {" "}
                  The broken top edge is the score ceiling: funding pressure stops separating expensive
                  money from very expensive money there, and {model.saturatedMonths}{" "}
                  {model.saturatedMonths === 1 ? "month sits" : "months sit"} pinned against it.
                </>
              ) : null}
            </figcaption>
            <ScreenshotCaption detail={`${oldest.monthLabel} to ${current.monthLabel}`} className="mt-2" />
          </figure>

          <div className="space-y-4">
            {/* Not "Reading now". `current` is the last plotted point, and every
                point here is a month-end reading from the archive, so this is the
                last completed month — up to five weeks behind the weekly call,
                and regularly a different regime from it. Labelled "Reading now"
                this panel told a reader the call was Sunny on a week the brief
                was calling Freezing. /signals already states the same caveat over
                the same series; this is that sentence, on the page a reader comes
                to when they want to check the record. */}
            {/* Unframed (2026-10-09): the reading, then its distances from the
                two lines. It was a stat tile, a framed box with a bold figure,
                which set the one month a step above the chart it reads from. */}
            <div className="space-y-2">
              <FactList>
                <Fact
                  label="Last completed month"
                  value={
                    <span className="inline-flex items-baseline gap-2">
                      <span
                        aria-hidden="true"
                        className="size-2.5 shrink-0 self-center rounded-full"
                        style={{ background: REGIME_HEX_COLORS[current.regime] }}
                      />
                      {current.regimeLabel}
                    </span>
                  }
                  unit={current.monthLabel}
                />
              </FactList>
              <dl className="space-y-1 text-fluid-xs">
                {[gaps.tightness, gaps.riskAppetite].map((gap) => (
                  <div key={gap.axis} className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <dt className="text-slate-400">{gap.label}</dt>
                    {/* Out of 100, and the distance said as a direction: "72 / +2 from
                        70" asked the reader to know the scale and to read a slash
                        and a sign as "two above the line". */}
                    {/* The score and the distance each stay whole, so "from 70" never
                        splits, but the distance may drop under the score: held on one
                        line, it ran past the card's edge on a 360px phone. */}
                    <dd className="ml-auto text-right tabular-nums text-slate-200">
                      <span className="whitespace-nowrap">
                        {gap.axis === "tightness" ? current.tightness : current.riskAppetite}/100
                        <span className="text-slate-500"> ·</span>
                      </span>{" "}
                      <span className="whitespace-nowrap text-slate-500">
                        {gap.side === "on"
                          ? "on"
                          : `${gap.distance} ${gap.side}`}{" "}
                        the line at {gap.axis === "tightness" ? thresholds.tightness : thresholds.riskAppetite}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="border-t border-[color:var(--border-subtle)] pt-2 text-fluid-nano text-slate-400">
                {gaps.tightness.distance <= gaps.riskAppetite.distance
                  ? describePhaseGap(gaps.tightness)
                  : describePhaseGap(gaps.riskAppetite)}
              </p>
              <p className="text-fluid-nano text-slate-500">
                Every point here is a month-end reading, so this is the last completed
                month rather than{" "}
                <Link href="/" className="text-sky-300">
                  this week&rsquo;s guidance
                </Link>
                .
              </p>
            </div>

            {/* Published conditions, not dot positions, and headed so. It read
                "Months in each quadrant" while counting the conditions each month
                published, which trail a dot that has crossed a line until the
                crossing holds — Apr 2025 sat at 90/55, in the Cloudy quadrant,
                and was counted as Freezing. The count is the honest one for a
                record; the heading and the line under it now say which it is. */}
            <div>
              <p className="type-eyebrow text-fluid-nano">Months under each set of conditions</p>
              <ul className="mt-2 space-y-1.5">
                {model.occupancy.map((row) => (
                  <li key={row.regime} className="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-2 text-fluid-nano">
                    <span className="truncate text-slate-300">{row.regimeLabel}</span>
                    {/* `block`, not the default inline: an inline box ignores the
                        height and the child's percentage width resolves against a
                        shrink-to-fit line box, so every bar rendered full-length.
                        The track is a token rather than `bg-white/[0.06]`, which is
                        a dark-theme idiom — on the light ground it disappeared, and
                        a proportion bar with no track shows no proportion. */}
                    <span className="block h-1.5 overflow-hidden rounded-full" style={{ background: "var(--phase-grid)" }}>
                      <span
                        className="block h-full rounded-full"
                        style={{ width: percent(row.share), background: REGIME_HEX_COLORS[row.regime] }}
                      />
                    </span>
                    <span className="text-right tabular-nums text-slate-400">{row.months}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-fluid-nano text-slate-500">
                {model.offQuadrantMonths === 0
                  ? "These are the conditions we published each month. Here they also match the quadrant every dot sits in."
                  : `These are the conditions we published each month, not the quadrant each dot sits in: the two differ in ${model.offQuadrantMonths.toLocaleString("en-US")} of these ${model.points.length.toLocaleString("en-US")} months.`}
              </p>
            </div>
          </div>
        </div>

        {/* The chart's data, not a summary of it. A `<desc>` tells a screen reader
            what the picture shows; this is what a sighted reader can get by
            looking at a point, and there is no other route to it. */}
        <details className="weather-auto-chevron">
          <summary className="text-fluid-nano text-slate-400">
            Plotted months, as a table
          </summary>
          <div className="mt-2 max-h-64 overflow-auto overscroll-contain rounded-md border border-[color:var(--border-faint)]">
            <table className="w-full text-left text-fluid-nano tabular-nums">
              <caption className="sr-only">
                Every month drawn on the phase map, newest first, with its coordinates and the conditions it
                produced.
              </caption>
              <thead className="sticky top-0 bg-slate-950/90 text-slate-400">
                <tr>
                  <th scope="col" className="px-2.5 py-1.5 font-medium">Month</th>
                  <th scope="col" className="px-2.5 py-1.5 font-medium">Conditions</th>
                  <th scope="col" className="px-2.5 py-1.5 text-right font-medium">Funding pressure (0–100)</th>
                  <th scope="col" className="px-2.5 py-1.5 text-right font-medium">Risk appetite (0–100)</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {[...model.points].reverse().map((point) => (
                  <tr key={point.recordDate} className="border-t border-[color:var(--border-faint)]">
                    <th scope="row" className="px-2.5 py-1 font-normal text-slate-400">{point.monthLabel}</th>
                    <td className="px-2.5 py-1">
                      {point.regimeLabel}
                      {point.changed ? <span className="ml-1.5 text-slate-100">changed</span> : null}
                    </td>
                    <td className="px-2.5 py-1 text-right">
                      {point.tightness}
                      {point.saturated ? <span className="text-slate-500" title="Clipped at the score ceiling">*</span> : null}
                    </td>
                    <td className="px-2.5 py-1 text-right">{point.riskAppetite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </UrlDetails>
  );
}
