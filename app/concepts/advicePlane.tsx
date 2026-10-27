import { ADVICE_STANCE_DEFINITIONS, ADVICE_STANCES, type AdviceStance } from "../../lib/adviceStance";
import { DEFAULT_THRESHOLDS } from "../../lib/regimeEngineCore";
import { regimeAtCoordinates } from "../../lib/regimePhaseSpace";
import { REGIME_LABELS } from "../../lib/regimePresentation";
import { CALL_CHANGE_RULE } from "../../lib/report/trackRecordCopy";
import type { RegimeKey } from "../../lib/types";
import { ConditionIcon } from "../components/ui/conceptIcons";

/**
 * The texts on the two-score plane: one mark per text, at the month-end it came
 * out, shaped by the advice it gives.
 *
 * The plane is the one /history draws (`RegimePhaseMap`): risk appetite across,
 * funding pressure up, the two change lines where the classifier cuts, the same
 * quadrant washes (`--phase-*`) and the conditions' glyphs from
 * `ui/conceptIcons`. What is new is only the marks. Shape carries the advice, so
 * the chart reads in greyscale: an upward triangle for Expand, a downward one for
 * Conserve, a hollow ring for Craft. Colour stays with the conditions.
 *
 * Server-rendered SVG with no client code, for the reason the phase map gives:
 * a chart whose content depends on hover screenshots empty. Hover titles name
 * each mark, and a screen-reader table carries every one of them.
 */

export type AdvicePlanePoint = {
  slug: string;
  title: string;
  published: string;
  stance: AdviceStance;
  regime: RegimeKey;
  conditions: string;
  fundingPressure: number;
  riskAppetite: number;
};

const VIEW_W = 340;
const VIEW_H = 336;
const PLOT_X = 46;
const PLOT_Y = 22;
const PLOT_SIZE = 266;
const PLOT_RIGHT = PLOT_X + PLOT_SIZE;
const PLOT_BOTTOM = PLOT_Y + PLOT_SIZE;
const ICON = 13;

/* Capital marks are drawn larger than craft rings: they are the question, and
   craft is the control. */
const RADIUS: Record<AdviceStance, number> = { expand: 5.5, conserve: 5.5, craft: 3.4 };

const xFor = (riskAppetite: number) => PLOT_X + (Math.max(0, Math.min(100, riskAppetite)) / 100) * PLOT_SIZE;
const yFor = (fundingPressure: number) => PLOT_Y + (1 - Math.max(0, Math.min(100, fundingPressure)) / 100) * PLOT_SIZE;

type PlacedMark = AdvicePlanePoint & { x: number; y: number; r: number };

/**
 * Marks at the same reading are stacked upward until none overlaps, so every
 * text shows. Capital marks are placed first, at their true positions; craft
 * rings stack around them. Most of the record sits at funding pressure 0, so
 * the stacks rise off the bottom edge, and the caption says so.
 */
const placeMarks = (points: readonly AdvicePlanePoint[]): PlacedMark[] => {
  const ordered = [...points].sort((left, right) => Number(left.stance === "craft") - Number(right.stance === "craft"));
  const placed: PlacedMark[] = [];
  for (const point of ordered) {
    const r = RADIUS[point.stance];
    const x = xFor(point.riskAppetite);
    let y = yFor(point.fundingPressure);
    const overlaps = () => placed.some((mark) => Math.hypot(mark.x - x, mark.y - y) < mark.r + r + 0.6);
    while (overlaps()) y -= 1;
    placed.push({ ...point, x, y, r });
  }
  return placed;
};

function Mark({ stance, x, y, r }: { stance: AdviceStance; x: number; y: number; r: number }) {
  if (stance === "craft") {
    return <circle cx={x} cy={y} r={r} fill="var(--bg-panel)" stroke="var(--app-text-muted)" strokeWidth="1.2" />;
  }
  const h = r * 1.15;
  const points =
    stance === "expand"
      ? `${x},${y - h} ${x + r},${y + h * 0.75} ${x - r},${y + h * 0.75}`
      : `${x},${y + h} ${x + r},${y - h * 0.75} ${x - r},${y - h * 0.75}`;
  return <polygon points={points} fill="var(--app-text)" stroke="var(--bg-panel)" strokeWidth="1" strokeLinejoin="round" />;
}

/** The legend's swatch: the same mark, in a 14px box of its own. */
function MarkSwatch({ stance }: { stance: AdviceStance }) {
  return (
    <svg viewBox="0 0 14 14" className="size-3.5 shrink-0" aria-hidden="true" focusable="false">
      <Mark stance={stance} x={7} y={7} r={stance === "craft" ? 4 : 5.5} />
    </svg>
  );
}

export function AdvicePlane({
  points,
  lines,
}: {
  points: readonly AdvicePlanePoint[];
  lines: { fundingPressure: number; riskAppetite: number };
}) {
  if (points.length === 0) return null;
  const boundaryX = xFor(lines.riskAppetite);
  const boundaryY = yFor(lines.fundingPressure);
  const marks = placeMarks(points);
  const thresholds = { ...DEFAULT_THRESHOLDS, tightnessRegime: lines.fundingPressure, riskAppetiteRegime: lines.riskAppetite };
  const offCorner = points.filter((point) => regimeAtCoordinates(point.fundingPressure, point.riskAppetite, thresholds) !== point.regime).length;
  const drawn = ADVICE_STANCES.filter((stance) => points.some((point) => point.stance === stance));

  /* Corner-anchored, with each glyph on the outer side of its word. The lower
     two sit just under the funding-pressure line, clear of the marks stacked
     along the bottom edge. */
  const quadrants: { regime: RegimeKey; x: number; y: number; w: number; h: number; fill: string; left: boolean; labelY: number }[] = [
    { regime: "SCARCITY", x: PLOT_X, y: PLOT_Y, w: boundaryX - PLOT_X, h: boundaryY - PLOT_Y, fill: "var(--phase-scarcity)", left: true, labelY: PLOT_Y + 8 },
    { regime: "DEFENSIVE", x: boundaryX, y: PLOT_Y, w: PLOT_RIGHT - boundaryX, h: boundaryY - PLOT_Y, fill: "var(--phase-defensive)", left: false, labelY: PLOT_Y + 8 },
    { regime: "VOLATILE", x: PLOT_X, y: boundaryY, w: boundaryX - PLOT_X, h: PLOT_BOTTOM - boundaryY, fill: "var(--phase-volatile)", left: true, labelY: boundaryY + 8 },
    { regime: "EXPANSION", x: boundaryX, y: boundaryY, w: PLOT_RIGHT - boundaryX, h: PLOT_BOTTOM - boundaryY, fill: "var(--phase-expansion)", left: false, labelY: boundaryY + 8 },
  ];

  return (
    <figure className="m-0 space-y-3" data-advice-plane>
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="block h-auto w-full max-w-[26rem]" aria-hidden="true">
        {quadrants.map((quadrant) => (
          <rect key={quadrant.regime} x={quadrant.x} y={quadrant.y} width={quadrant.w} height={quadrant.h} fill={quadrant.fill} />
        ))}
        <rect x={PLOT_X} y={PLOT_Y} width={PLOT_SIZE} height={PLOT_SIZE} fill="none" stroke="var(--phase-grid)" strokeWidth="1" />

        {quadrants.map((quadrant) => {
          const iconX = quadrant.left ? PLOT_X + 6 : PLOT_RIGHT - 6 - ICON;
          const textX = quadrant.left ? iconX + ICON + 4 : iconX - 4;
          return (
            <g key={`label-${quadrant.regime}`}>
              <ConditionIcon regime={quadrant.regime} x={iconX} y={quadrant.labelY} width={ICON} height={ICON} />
              <text
                x={textX}
                y={quadrant.labelY + 10.5}
                textAnchor={quadrant.left ? "start" : "end"}
                fontSize="12"
                fontWeight="600"
                letterSpacing="0.04em"
                data-regime={quadrant.regime}
                fill="var(--regime-ink)"
              >
                {REGIME_LABELS[quadrant.regime].toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* The two lines that decide anything, heavier than the frame. */}
        <line x1={boundaryX} y1={PLOT_Y} x2={boundaryX} y2={PLOT_BOTTOM} stroke="var(--phase-boundary)" strokeWidth="1.5" />
        <line x1={PLOT_X} y1={boundaryY} x2={PLOT_RIGHT} y2={boundaryY} stroke="var(--phase-boundary)" strokeWidth="1.5" />

        {marks.map((mark) => (
          <g key={mark.slug} data-advice={mark.stance}>
            <title>{`${mark.title}, ${mark.published}: ${mark.conditions}, funding pressure ${mark.fundingPressure}, risk appetite ${mark.riskAppetite}`}</title>
            <Mark stance={mark.stance} x={mark.x} y={mark.y} r={mark.r} />
          </g>
        ))}

        {/* Ticks at the ends and at each change line, so the lines are numbered on the picture. */}
        {[0, lines.riskAppetite, 100].map((tick) => (
          <text key={`x-${tick}`} x={xFor(tick)} y={PLOT_BOTTOM + 16} textAnchor="middle" fontSize="12" fill="var(--app-text-muted)">
            {tick}
          </text>
        ))}
        {[0, lines.fundingPressure, 100].map((tick) => (
          <text key={`y-${tick}`} x={PLOT_X - 7} y={yFor(tick) + 4} textAnchor="end" fontSize="12" fill="var(--app-text-muted)">
            {tick}
          </text>
        ))}
        <text x={PLOT_X + PLOT_SIZE / 2} y={VIEW_H - 6} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--app-text-secondary)">
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

      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-300">
        {drawn.map((stance) => (
          <li key={stance} className="flex items-center gap-1.5">
            <MarkSwatch stance={stance} />
            <span>
              <span className="text-slate-100">{ADVICE_STANCE_DEFINITIONS[stance].label}.</span> {ADVICE_STANCE_DEFINITIONS[stance].definition}
            </span>
          </li>
        ))}
      </ul>


      {/* The wrapper is what hides it: a table sized to 1px still lays out at its
          content's width and pushed a 390px page to 1,050px. */}
      <div className="sr-only">
        <table>
          <caption>Each text on the chart, oldest first, with its month, the advice it gives, the conditions published that month and both scores</caption>
          <thead>
            <tr>
              <th scope="col">Text</th>
              <th scope="col">Month</th>
              <th scope="col">Advice</th>
              <th scope="col">Conditions</th>
              <th scope="col">Funding pressure</th>
              <th scope="col">Risk appetite</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.slug}>
                <th scope="row">{point.title}</th>
                <td>{point.published}</td>
                <td>{ADVICE_STANCE_DEFINITIONS[point.stance].label}</td>
                <td>{point.conditions}</td>
                <td>{point.fundingPressure}</td>
                <td>{point.riskAppetite}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <figcaption className="max-w-prose text-fluid-nano text-slate-400">
        {`Each mark is one text, plotted at the scores for the month it came out. Marks at the same reading are stacked upward so each one shows.`}
        {offCorner > 0
          ? ` ${offCorner === 1 ? "One sits" : `${offCorner} sit`} in a different corner from the conditions published that month. ${CALL_CHANGE_RULE}`
          : null}
      </figcaption>
    </figure>
  );
}
