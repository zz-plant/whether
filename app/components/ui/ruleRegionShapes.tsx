import type { AreaRuleRegions, RuleRegion } from "../../../lib/report/ruleRegions";

type Scale = { x: (riskAppetite: number) => number; y: (tightness: number) => number };

const edgeSegments = (region: RuleRegion, { x, y }: Scale) =>
  region.edges.map((edge) =>
    edge.metric === "tightness"
      ? { key: `t${edge.value}:${edge.span.join("-")}`, x1: x(edge.span[0]), x2: x(edge.span[1]), y1: y(edge.value), y2: y(edge.value) }
      : { key: `r${edge.value}:${edge.span.join("-")}`, x1: x(edge.value), x2: x(edge.value), y1: y(edge.span[0]), y2: y(edge.span[1]) },
  );

/**
 * A reader's own lines over the published regions: each edge of their region, dashed, in the
 * ink. Their lines are theirs, not a line state, so they take no line-state colour (§XVI);
 * the published fills under them keep theirs. Edges only, no fill, so the published shading
 * reads through, and the dash tells the two apart in greyscale.
 */
export function RuleRegionOutline({
  regions,
  x,
  y,
  edgeWidth = 1.25,
  dash = "4 3",
}: {
  regions: readonly RuleRegion[];
  x: (riskAppetite: number) => number;
  y: (tightness: number) => number;
  edgeWidth?: number;
  /** The dash pattern, in the drawing's units. */
  dash?: string;
}) {
  if (regions.length === 0) return null;
  return (
    <g data-rule-outline="">
      {regions.flatMap((region, index) =>
        edgeSegments(region, { x, y }).map(({ key, ...edge }) => (
          <line key={`${index}-${key}`} {...edge} stroke="var(--app-text)" strokeWidth={edgeWidth} strokeDasharray={dash} strokeLinecap="butt" />
        )),
      )}
    </g>
  );
}

/**
 * An area's pause and restart regions, drawn inside a conditions chart's SVG.
 *
 * The geometry is the rule's (`buildRuleRegions`, lib/report/ruleRegions.ts); this only
 * maps it onto the caller's plot: `x` places a risk-appetite score, `y` a funding-pressure
 * score, so the brief's chart and the small multiples on /operate draw one shape at two
 * sizes. Colour is the line states' (§XVI): the front red where the area pauses, the
 * neutral ink where it restarts, each a faint fill with its edge stroked, so the condition
 * washes under them still read. The pause also carries a hatch, so the two tell apart in
 * greyscale, as a condition's pattern does on the record band (§XXX). The band between them
 * is left bare: nothing changes there.
 */
export function RuleRegionShapes({
  regions,
  x,
  y,
  idPrefix,
  edgeWidth = 1.25,
  hatchSpacing = 4,
}: {
  regions: AreaRuleRegions;
  x: (riskAppetite: number) => number;
  y: (tightness: number) => number;
  /** Unique per SVG on the page: the hatch is a `<pattern>` referenced by id. */
  idPrefix: string;
  edgeWidth?: number;
  /** The hatch's pitch, in the drawing's units. */
  hatchSpacing?: number;
}) {
  const hatchId = `${idPrefix}-pause-hatch`;
  const rects = (region: RuleRegion) =>
    region.rects.map((rect) => {
      const left = x(rect.riskAppetite[0]);
      const right = x(rect.riskAppetite[1]);
      const top = y(rect.tightness[0]);
      const bottom = y(rect.tightness[1]);
      return {
        key: `${rect.riskAppetite.join("-")}:${rect.tightness.join("-")}`,
        x: Math.min(left, right),
        y: Math.min(top, bottom),
        width: Math.abs(right - left),
        height: Math.abs(bottom - top),
      };
    });
  const edges = (region: RuleRegion) => edgeSegments(region, { x, y });
  const pauseRects = rects(regions.pause);
  const resumeRects = rects(regions.resume);
  return (
    <g data-rule-regions="">
      <defs>
        <pattern id={hatchId} patternUnits="userSpaceOnUse" width={hatchSpacing} height={hatchSpacing} patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2={hatchSpacing} stroke="var(--line-crossed)" strokeWidth={hatchSpacing / 5} />
        </pattern>
      </defs>
      {/* Each fill as one group at one opacity, so where an "or" pause's two half-planes
          overlap the corner is not drawn darker than the rest of the L. */}
      {resumeRects.length > 0 ? (
        <g data-rule-region="resume" opacity="0.07">
          {resumeRects.map((rect) => (
            <rect key={rect.key} x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill="var(--line-clear)" />
          ))}
        </g>
      ) : null}
      {pauseRects.length > 0 ? (
        <g data-rule-region="pause">
          <g opacity="0.07">
            {pauseRects.map((rect) => (
              <rect key={rect.key} x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill="var(--line-crossed)" />
            ))}
          </g>
          <g opacity="0.28">
            {pauseRects.map((rect) => (
              <rect key={rect.key} x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill={`url(#${hatchId})`} />
            ))}
          </g>
        </g>
      ) : null}
      {edges(regions.resume).map(({ key, ...edge }) => (
        <line key={key} {...edge} data-rule-edge="resume" stroke="var(--line-clear-ink)" strokeWidth={edgeWidth} strokeOpacity="0.6" strokeLinecap="square" />
      ))}
      {edges(regions.pause).map(({ key, ...edge }) => (
        <line key={key} {...edge} data-rule-edge="pause" stroke="var(--line-crossed)" strokeWidth={edgeWidth} strokeLinecap="square" />
      ))}
    </g>
  );
}
