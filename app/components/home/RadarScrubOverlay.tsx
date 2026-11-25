/**
 * The conditions chart's drag overlay, drawn inside its SVG only while a reader drags
 * the reading or it springs back (`RegimeRadar`): guides from the dragged point to both
 * change lines, the path from the live reading, and the dragged point itself. In the
 * week's ink, as the condition it is being dragged through is named in. Moved out of
 * `RegimeRadar.tsx` unchanged (2026-11-18) to keep that file under the 800-line cap.
 */
export function RadarScrubOverlay({
  scrubX,
  scrubY,
  currentX,
  currentY,
  boundaryX,
  boundaryY,
}: {
  scrubX: number;
  scrubY: number;
  currentX: number;
  currentY: number;
  boundaryX: number;
  boundaryY: number;
}) {
  const guide = { stroke: "var(--regime-ink)", strokeDasharray: "1.5 1.5", strokeWidth: "1", strokeOpacity: "0.85" };
  return (
    <g data-radar-scrub-overlay>
      {/* Projection guides from scrubbed crosshair to both change lines */}
      <line x1={scrubX} y1={scrubY} x2={scrubX} y2={boundaryY} {...guide} />
      <line x1={scrubX} y1={scrubY} x2={boundaryX} y2={scrubY} {...guide} />
      {/* Vector from live reading to scrubbed crosshair */}
      <line x1={currentX} y1={currentY} x2={scrubX} y2={scrubY} stroke="var(--regime-ink)" strokeWidth="1.25" strokeOpacity="0.9" />
      <circle cx={scrubX} cy={scrubY} r="7.5" fill="none" stroke="var(--regime-ink)" strokeWidth="1.4" strokeOpacity="0.9" />
      <circle cx={scrubX} cy={scrubY} r="3.2" fill="var(--regime-ink)" />
    </g>
  );
}
