import type { AreaRuleRegions, RuleRegion } from "../../../lib/report/ruleRegions";
import { RuleRegionOutline, RuleRegionShapes } from "./ruleRegionShapes";

/* The plot is 0–100 on both scores with a little room for the edge strokes and the dot. */
const PAD = 5;
const SIZE = 100;
const VIEW = SIZE + PAD * 2;
const x = (riskAppetite: number) => PAD + Math.min(100, Math.max(0, riskAppetite));
/* Funding pressure rises downward, as on the brief's conditions chart: easier is up and right. */
const y = (tightness: number) => PAD + Math.min(100, Math.max(0, tightness));

/**
 * One area's rule as a small conditions chart: its pause region, its restart region and
 * this week's reading, at the scale and orientation of the brief's chart (risk appetite
 * 0–100 across, funding pressure 0–100 down), so the five rows of the rules table read as
 * small multiples (§XV). The two change lines are drawn faint for orientation; the caller
 * states the domain once beside the set. A picture with a claim: `label` is the sentence
 * (`describeRegionsAt`), and the table row beside it prints the same lines as text.
 *
 * `outline` draws a reader's own lines over the published ones, dashed in the ink: the
 * /operate form passes the regions of the numbers a reader has moved (`compareOwnRule`).
 */
export function RuleRegionMap({
  area,
  regions,
  scores,
  changeLines,
  label,
  outline = [],
  idPrefix = `rule-map-${area}`,
}: {
  area: string;
  regions: AreaRuleRegions;
  scores: { tightness: number; riskAppetite: number };
  changeLines: { tightness: number; riskAppetite: number };
  label: string;
  outline?: readonly RuleRegion[];
  /** Unique per map on the page: the table and the form both draw an area's map on /operate. */
  idPrefix?: string;
}) {
  const dotX = x(scores.riskAppetite);
  const dotY = y(scores.tightness);
  /* The drawing is hidden from assistive tech and its claim is read as text beside it,
     the way the brief's chart carries its own (RegimeRadar). */
  return (
    <span className="block" data-rule-region-map={area}>
      <span className="sr-only">{label}</span>
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} aria-hidden="true" focusable="false" className="block size-[4.5rem] shrink-0">
        <rect x={PAD} y={PAD} width={SIZE} height={SIZE} fill="var(--bg-panel)" />
        <RuleRegionShapes regions={regions} x={x} y={y} idPrefix={idPrefix} edgeWidth={2} hatchSpacing={7} />
        {/* Where the conditions change, faint, so the map reads as the brief's chart. */}
        <line x1={x(changeLines.riskAppetite)} x2={x(changeLines.riskAppetite)} y1={PAD} y2={PAD + SIZE} stroke="var(--phase-boundary)" strokeWidth="1" strokeDasharray="3 3" />
        <line x1={PAD} x2={PAD + SIZE} y1={y(changeLines.tightness)} y2={y(changeLines.tightness)} stroke="var(--phase-boundary)" strokeWidth="1" strokeDasharray="3 3" />
        <rect x={PAD} y={PAD} width={SIZE} height={SIZE} fill="none" stroke="var(--border-strong)" strokeWidth="1" />
        <RuleRegionOutline regions={outline} x={x} y={y} edgeWidth={2.25} dash="6 4" />
        {/* This week's reading: the ink, ringed in the panel's ground so it holds on either fill. */}
        <circle cx={dotX} cy={dotY} r="6.5" fill="var(--app-text)" stroke="var(--bg-panel)" strokeWidth="2.5" />
      </svg>
    </span>
  );
}
