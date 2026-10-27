import { scaleLinear } from "d3-scale";
import { line as d3Line, area as d3Area, curveMonotoneX } from "d3-shape";

/**
 * Line geometry for series that can have holes in them.
 *
 * A missing reading must break the stroke rather than interpolate across it —
 * a line drawn straight through a gap asserts data that was never collected.
 * Gaps come back as `missingColumns` so the caller can shade them, which is what
 * makes the break legible as "no reading" instead of "chart glitch".
 *
 * Built with d3-scale and d3-shape for robust edge-safe projection and
 * monotonic spline generation.
 */

type SegmentedLineSeries = {
  /** One path per unbroken run of readings. Runs shorter than 2 points are dropped. */
  paths: string[];
  missingColumns: Array<{ x: number; width: number }>;
  /** Last point of the last *rendered* run — never an orphan that wasn't drawn. */
  lastPoint: { x: number; y: number; value: number; index: number } | null;
  /** Smooth monotonic spline paths generated via d3-shape. */
  smoothPaths: string[];
  /** Closed area paths between the curve and baselineY (if provided). */
  areaPaths: string[];
};

export const buildSegmentedLineSeries = ({
  values,
  width,
  height,
  min,
  max,
  curve = "linear",
  baselineY,
}: {
  values: Array<number | null>;
  width: number;
  height: number;
  min: number;
  max: number;
  curve?: "linear" | "monotone";
  baselineY?: number;
}): SegmentedLineSeries => {
  const xScale = scaleLinear()
    .domain([0, Math.max(values.length - 1, 1)])
    .range([0, width]);
  const yScale = scaleLinear()
    .domain([min, max])
    .range([height, 0]);

  const step = width / Math.max(values.length - 1, 1);
  const paths: string[] = [];
  const smoothPaths: string[] = [];
  const areaPaths: string[] = [];
  const points: Array<{ x: number; y: number; value: number; index: number }> = [];
  const missingColumns: Array<{ x: number; width: number }> = [];
  let currentPath: string[] = [];
  let currentPoints: Array<{ x: number; y: number; value: number; index: number }> = [];

  const monotoneGen = d3Line<{ x: number; y: number }>()
    .x((d) => Number(d.x.toFixed(2)))
    .y((d) => Number(d.y.toFixed(2)))
    .curve(curveMonotoneX);

  const areaGen =
    typeof baselineY === "number"
      ? (() => {
          const gen = d3Area<{ x: number; y: number }>()
            .x((d) => Number(d.x.toFixed(2)))
            .y0(Number(baselineY.toFixed(2)))
            .y1((d) => Number(d.y.toFixed(2)));
          return curve === "monotone" ? gen.curve(curveMonotoneX) : gen;
        })()
      : null;

  values.forEach((value, index) => {
    if (typeof value !== "number") {
      if (currentPath.length >= 2) {
        paths.push(currentPath.join(" "));
        const smooth = monotoneGen(currentPoints);
        if (smooth) smoothPaths.push(smooth);
        if (areaGen) {
          const area = areaGen(currentPoints);
          if (area) areaPaths.push(area);
        }
        points.push(...currentPoints);
      }
      currentPath = [];
      currentPoints = [];
      missingColumns.push({
        x: Math.max(0, index * step - step / 2),
        width: Math.max(step, 4),
      });
      return;
    }

    const x = xScale(index);
    const y = yScale(value);
    currentPath.push(`${currentPath.length === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
    currentPoints.push({ x, y, value, index });
  });

  if (currentPath.length >= 2) {
    paths.push(currentPath.join(" "));
    const smooth = monotoneGen(currentPoints);
    if (smooth) smoothPaths.push(smooth);
    if (areaGen) {
      const area = areaGen(currentPoints);
      if (area) areaPaths.push(area);
    }
    points.push(...currentPoints);
  }

  return {
    paths: curve === "monotone" ? smoothPaths : paths,
    missingColumns,
    lastPoint: points[points.length - 1] ?? null,
    smoothPaths,
    areaPaths,
  };
};
