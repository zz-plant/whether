import { areasGovernedBy, decisionAreaLabel, decisionAreaOrder, type DecisionArea } from "./boundedDecisionRules";
import { HOME_DECISION_PARAM, HOME_SECTIONS } from "./home/homeSectionModel";
import type { SignalReferenceRow } from "./evidenceReaderModel";
import type { RegimeSignalKey } from "./reportFormatting";

/**
 * What feeds what, once (2026-11-18): the two market inputs feed the two scores, and each
 * score sets the lines of three areas. `/signals` printed these as a line under each row
 * ("Feeds into Funding pressure", "Affects: Hiring, Fundraising, Spending"), the areas from
 * `areasGovernedBy` and the feeds written into the page. The rows' words and the diagram
 * beside the table read them from here now.
 *
 * The curve sets risk appetite outright and adds to funding pressure only below zero
 * (`computeRiskAppetiteScore` and the inversion points in `regimeEngineCore`), so that
 * feed carries its condition.
 */
type InputKey = Extract<RegimeSignalKey, "baseRate" | "curveSlope">;
type ScoreKey = Extract<RegimeSignalKey, "tightness" | "riskAppetite">;

const SIGNAL_FEEDS: readonly { from: InputKey; to: ScoreKey; condition: string | null; onlyBelowZero?: true }[] = [
  { from: "baseRate", to: "tightness", condition: null },
  { from: "curveSlope", to: "riskAppetite", condition: null },
  { from: "curveSlope", to: "tightness", condition: "only while the 10-year rate is below the 2-year", onlyBelowZero: true },
];

const SCORE_KEYS: readonly ScoreKey[] = ["tightness", "riskAppetite"];
const INPUT_KEYS: readonly InputKey[] = ["baseRate", "curveSlope"];

const isScoreKey = (key: RegimeSignalKey): key is ScoreKey => key === "tightness" || key === "riskAppetite";
const isInputKey = (key: RegimeSignalKey): key is InputKey => key === "baseRate" || key === "curveSlope";

/**
 * The areas a signal moves this week, by the feeds the diagram draws (2026-11-18): a
 * score's own areas, and an input's through the scores it feeds. The curve's feed into
 * funding pressure counts only while the curve is below zero, as the score reads it. The
 * brief's "What changed" marks the rows that move the area a reader has open with this.
 */
export const areasMovedBy = (key: RegimeSignalKey, value?: number | null): DecisionArea[] => {
  if (isScoreKey(key)) return areasGovernedBy(key);
  if (!isInputKey(key)) return [];
  const scores = SIGNAL_FEEDS
    .filter((feed) => feed.from === key && (!feed.onlyBelowZero || (typeof value === "number" && value < 0)))
    .map((feed) => feed.to);
  return decisionAreaOrder.filter((area) => scores.some((score) => areasGovernedBy(score).includes(area)));
};

/** Where an area's link goes from an evidence page: the brief, opened on that area. */
const areaBriefHref = (area: DecisionArea) => `/?${HOME_DECISION_PARAM}=${area}#${HOME_SECTIONS.areas.id}`;

type SignalFlowNode = {
  /** A signal key, or an area. */
  id: string;
  column: "input" | "score" | "area";
  label: string;
  href: string;
  /** The signal's recorded move, signed; null for an area and for a signal with no comparison. */
  delta: number | null;
  betterWhen: "higher" | "lower" | null;
  /** The move in words, for a screen reader beside its arrow: "rose since Nov 9". */
  moved: string | null;
  area: DecisionArea | null;
};

type SignalFlowEdge = { from: string; to: string; condition: string | null };

export type SignalFlow = {
  nodes: SignalFlowNode[];
  edges: SignalFlowEdge[];
  /** For each node, every node on a path through it: what lights when it is pointed at. */
  reach: Record<string, readonly string[]>;
  /** What the drawing shows, in words: its key and what the arrows are measured from. */
  caption: string;
};

/**
 * The diagram beside the table, from the table's own rows: a node per signal in the
 * table, an edge per feed and per governed area, and each node's moves from the row.
 * `since` names the earlier reading the moves are measured from ("Nov 9").
 */
export const buildSignalFlow = (rows: readonly SignalReferenceRow[], since: string): SignalFlow => {
  const byKey = new Map(rows.map((row) => [row.key, row] as const));
  const signalNode = (key: RegimeSignalKey, column: "input" | "score"): SignalFlowNode[] => {
    const row = byKey.get(key);
    return row
      ? [{
          id: key,
          column,
          label: row.label,
          href: `#${key}`,
          delta: row.delta,
          betterWhen: row.betterWhen,
          moved: row.delta ? `${row.delta > 0 ? "rose" : "fell"} since ${since}` : null,
          area: null,
        }]
      : [];
  };
  const governed = new Map(SCORE_KEYS.map((key) => [key, areasGovernedBy(key)] as const));
  const nodes: SignalFlowNode[] = [
    ...INPUT_KEYS.flatMap((key) => signalNode(key, "input")),
    ...SCORE_KEYS.flatMap((key) => signalNode(key, "score")),
    ...decisionAreaOrder
      .filter((area) => SCORE_KEYS.some((key) => governed.get(key)?.includes(area)))
      .map((area) => ({
        id: area,
        column: "area" as const,
        label: decisionAreaLabel(area),
        href: areaBriefHref(area),
        delta: null,
        betterWhen: null,
        moved: null,
        area,
      })),
  ];
  const present = new Set(nodes.map((node) => node.id));
  const feedEdges: SignalFlowEdge[] = SIGNAL_FEEDS.map((feed) => ({ from: feed.from, to: feed.to, condition: feed.condition }));
  const areaEdges: SignalFlowEdge[] = SCORE_KEYS.flatMap((key) =>
    (governed.get(key) ?? []).map((area): SignalFlowEdge => ({ from: key, to: area, condition: null })),
  );
  const edges = [...feedEdges, ...areaEdges].filter((edge) => present.has(edge.from) && present.has(edge.to));

  /* Upstream and downstream of a node, walked separately, so pointing at an input lights
     what it feeds and not the other input beside it. */
  const walk = (start: string, next: (id: string) => string[]) => {
    const seen = new Set<string>([start]);
    const queue = [start];
    while (queue.length > 0) {
      const id = queue.shift() ?? "";
      for (const neighbour of next(id)) {
        if (!seen.has(neighbour)) {
          seen.add(neighbour);
          queue.push(neighbour);
        }
      }
    }
    return seen;
  };
  const downstream = (id: string) => edges.filter((edge) => edge.from === id).map((edge) => edge.to);
  const upstream = (id: string) => edges.filter((edge) => edge.to === id).map((edge) => edge.from);
  const reach = Object.fromEntries(
    nodes.map((node) => [node.id, [...new Set([...walk(node.id, downstream), ...walk(node.id, upstream)])]] as const),
  );
  const moved = nodes.some((node) => typeof node.delta === "number" && node.delta !== 0);
  return {
    nodes,
    edges,
    reach,
    caption:
      "Each market input feeds a score, and three areas pause or restart on each score. Dashed: only while the Recession warning gauge is below zero." +
      (moved ? ` An arrow beside a signal is its move since ${since}.` : ""),
  };
};

/**
 * A row's feeds and areas, for the line under its name: the parts, for the line drawn
 * with links, and the whole as a sentence ("Affects: Hiring, Fundraising, Spending."), for
 * a screen reader where the diagram carries the links.
 */
export const describeSignalRelations = (
  key: RegimeSignalKey,
  labelOf: (key: RegimeSignalKey) => string,
): { feeds: { key: ScoreKey; label: string; condition: string | null }[]; areas: DecisionArea[]; sentence: string } => {
  const feeds = SIGNAL_FEEDS.filter((feed) => feed.from === key).map((feed) => ({
    key: feed.to,
    label: labelOf(feed.to),
    condition: feed.condition,
  }));
  if (feeds.length > 0) {
    const named = feeds.map((feed) => (feed.condition ? `${feed.label} ${feed.condition}` : feed.label));
    return { feeds, areas: [], sentence: `Feeds into ${named.join(", and ")}.` };
  }
  const areas = key === "tightness" || key === "riskAppetite" ? areasGovernedBy(key) : [];
  return { feeds: [], areas, sentence: areas.length > 0 ? `Affects: ${areas.map(decisionAreaLabel).join(", ")}.` : "" };
};
