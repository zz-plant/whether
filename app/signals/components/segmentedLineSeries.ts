/**
 * Line geometry for series that can have holes in them.
 *
 * A missing reading must break the stroke rather than interpolate across it —
 * a line drawn straight through a gap asserts data that was never collected.
 * Gaps come back as `missingColumns` so the caller can shade them, which is what
 * makes the break legible as "no reading" instead of "chart glitch".
 *
 * Extracted from near-identical copies in `signalVisualizationSuite` (as
 * `linePath`) and `signalInversionPreview`.
 */

type SegmentedLineSeries = {
  /** One path per unbroken run of readings. Runs shorter than 2 points are dropped. */
  paths: string[];
  missingColumns: Array<{ x: number; width: number }>;
  /** Last point of the last *rendered* run — never an orphan that wasn't drawn. */
  lastPoint: { x: number; y: number; value: number; index: number } | null;
};

export const buildSegmentedLineSeries = ({
  values,
  width,
  height,
  min,
  max,
}: {
  values: Array<number | null>;
  width: number;
  height: number;
  min: number;
  max: number;
}): SegmentedLineSeries => {
  const range = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);
  const paths: string[] = [];
  const points: Array<{ x: number; y: number; value: number; index: number }> = [];
  const missingColumns: Array<{ x: number; width: number }> = [];
  let currentPath: string[] = [];
  let currentPoints: Array<{ x: number; y: number; value: number; index: number }> = [];

  values.forEach((value, index) => {
    if (typeof value !== "number") {
      if (currentPath.length >= 2) {
        paths.push(currentPath.join(" "));
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

    const x = index * step;
    const y = height - ((value - min) / range) * height;
    currentPath.push(`${currentPath.length === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
    currentPoints.push({ x, y, value, index });
  });

  if (currentPath.length >= 2) {
    paths.push(currentPath.join(" "));
    points.push(...currentPoints);
  }

  return { paths, missingColumns, lastPoint: points[points.length - 1] ?? null };
};
