/**
 * Historical Analog Playbook Engine for Whether.
 * Matches current macro coordinates to historical analog cycles and extracts
 * the consensus trap, the winning counter-intuitive move, and the reversal marker.
 */
import type { RegimeScores } from "./regimeEngine";

type AnalogCoordinate = {
  key: "baseRate" | "curveSlope" | "tightness" | "riskAppetite";
  label: string;
  /** The reference cycle's value. */
  historical: number;
  /** The live value it was compared against. */
  live: number;
  unit: "%" | "pts";
};

export interface AnalogPlaybookResult {
  analogPeriod: string;
  /**
   * Nearness of the closest reference cycle, 0–100, as `100 / (1 + d)` where `d`
   * is the coordinate distance below. 100 is an exact coordinate match; it falls
   * away smoothly and has no floor.
   *
   * It is a nearness score against four hand-picked cycles — not a correlation,
   * not a probability, and not evidence that the analog will repeat. It was
   * called `correlationScore` and floored at 65, so the worst possible match
   * still reported 65% similarity to anything reading the API.
   */
  matchScore: number;
  regimeType: string;
  /** How many reference cycles were compared. Four, hand-picked — say so. */
  referenceCycleCount: number;
  /** The four coordinates the match was made on, then vs now. */
  matchBasis: AnalogCoordinate[];
  consensusTrap: string;
  winningMove: string;
  reversalMarker: string;
}

interface HistoricalCycle {
  id: string;
  period: string;
  regimeType: string;
  baseRate: number;
  curveSlope: number;
  tightness: number;
  riskAppetite: number;
  consensusTrap: string;
  winningMove: string;
  reversalMarker: string;
}

const HISTORICAL_CYCLES: HistoricalCycle[] = [
  {
    id: "q3_2007",
    period: "Q3 2007",
    regimeType: "Late-Cycle Pre-Inversion",
    baseRate: 5.25,
    curveSlope: -0.25,
    tightness: 70,
    riskAppetite: 40,
    consensusTrap:
      "Expanded enterprise direct sales headcount expecting a Q4 demand rebound; burned 35% of cash buffer with zero closed-won conversions as enterprise procurement timelines doubled.",
    winningMove:
      "Restructured pricing to 100% annual upfront cash collection with a 15% incentive; converted open engineering reqs to 6-month contract-to-hire.",
    reversalMarker:
      "Yield curve un-inversion past +0.25% combined with 2 consecutive months of tightening contraction signaled the safe expansion window.",
  },
  {
    id: "q4_2018",
    period: "Q4 2018",
    regimeType: "Mid-Cycle Tightening Scare",
    baseRate: 2.50,
    curveSlope: 0.15,
    tightness: 62,
    riskAppetite: 35,
    consensusTrap:
      "Froze all product releases and panicked on marketing spend right before the Fed pivoted to an easing pause.",
    winningMove:
      "Accelerated core product velocity while competitors stalled; renegotiated annual cloud commits to monthly rolling tiers.",
    reversalMarker:
      "Fed pause announcement and Risk Appetite rising past 55 signaled the green light for aggressive GTM resumption.",
  },
  {
    id: "q2_2022",
    period: "Q2 2022",
    regimeType: "Rapid Rate & Valuation Shock",
    baseRate: 3.50,
    curveSlope: -0.40,
    tightness: 78,
    riskAppetite: 28,
    consensusTrap:
      "Maintained high gross burn assuming secondary venture funding rounds would remain available at 2021 valuation multiples.",
    winningMove:
      "Cut non-essential vendor SaaS bloat immediately; extended runway beyond 24 months to bypass dilutive down-rounds entirely.",
    reversalMarker:
      "Stabilization of base rate hikes and tightness leveling off below 65.",
  },
  {
    id: "q2_2021",
    period: "Q2 2021",
    regimeType: "Accommodative Expansion",
    baseRate: 0.25,
    curveSlope: 1.20,
    tightness: 25,
    riskAppetite: 85,
    consensusTrap:
      "Hired indiscriminately without onboarding infrastructure, driving down per-employee productivity and ballooning fixed overhead.",
    winningMove:
      "Raised multi-year capital reserves while cost of capital was near zero; locked in long-term enterprise anchor customers.",
    reversalMarker:
      "Initial inflation surge above 3.5% and yield curve flattening signaled the impending end of frictionless capital.",
  },
];

/**
 * Spread of each coordinate across the reference set, used to make the four
 * terms of the distance comparable.
 *
 * The previous distance applied fixed weights — rate ×10, slope ×20, the two
 * scores ×1 — which did not do what they read as. `tightness` and `riskAppetite`
 * are largely derived from `baseRate` and `curveSlope`, and tightness alone moves
 * up to 90 units for a one-point rate difference, so the derived terms swamped
 * the nominal weights on the inputs they came from. Dividing by each
 * coordinate's own spread gives every axis one unit of range to contribute.
 */
const MATCH_COORDINATE_KEYS = ["baseRate", "curveSlope", "tightness", "riskAppetite"] as const;

type MatchCoordinateKey = (typeof MATCH_COORDINATE_KEYS)[number];

/** A degenerate spread would divide by zero; 1 leaves that axis in raw units. */
const spreadOf = (key: MatchCoordinateKey): number => {
  const values = HISTORICAL_CYCLES.map((cycle) => cycle[key]);
  return Math.max(...values) - Math.min(...values) || 1;
};

const COORDINATE_SPREADS: Record<MatchCoordinateKey, number> = {
  baseRate: spreadOf("baseRate"),
  curveSlope: spreadOf("curveSlope"),
  tightness: spreadOf("tightness"),
  riskAppetite: spreadOf("riskAppetite"),
};

type Coordinates = Record<MatchCoordinateKey, number>;

/** Root-mean-square distance in spread-normalised units. 0 is an exact match. */
const coordinateDistance = (live: Coordinates, cycle: Coordinates): number => {
  const keys = MATCH_COORDINATE_KEYS;
  const total = keys.reduce((sum: number, key) => {
    const scaled = (live[key] - cycle[key]) / COORDINATE_SPREADS[key];
    return sum + scaled ** 2;
  }, 0);
  return Math.sqrt(total / keys.length);
};

/** Only the four match coordinates are read, so that is all this asks for. */
export type AnalogPlaybookInput = {
  scores: Pick<RegimeScores, "baseRate" | "curveSlope" | "tightness" | "riskAppetite">;
};

export function getHistoricalAnalogPlaybook(assessment: AnalogPlaybookInput): AnalogPlaybookResult {
  const { baseRate, curveSlope, tightness, riskAppetite } = assessment.scores;
  const currentSlope = curveSlope ?? 0;

  let bestMatch = HISTORICAL_CYCLES[0];
  let lowestDistance = Number.POSITIVE_INFINITY;

  for (const cycle of HISTORICAL_CYCLES) {
    const distance = coordinateDistance(
      { baseRate, curveSlope: currentSlope, tightness, riskAppetite },
      cycle,
    );

    if (distance < lowestDistance) {
      lowestDistance = distance;
      bestMatch = cycle;
    }
  }

  const matchScore = Math.max(0, Math.min(100, Math.round(100 / (1 + lowestDistance))));

  const matchBasis: AnalogCoordinate[] = [
    { key: "baseRate", label: "Base rate", historical: bestMatch.baseRate, live: baseRate, unit: "%" },
    { key: "curveSlope", label: "10Y−2Y slope", historical: bestMatch.curveSlope, live: currentSlope, unit: "%" },
    { key: "tightness", label: "Funding pressure", historical: bestMatch.tightness, live: tightness, unit: "pts" },
    { key: "riskAppetite", label: "Risk appetite", historical: bestMatch.riskAppetite, live: riskAppetite, unit: "pts" },
  ];

  return {
    analogPeriod: bestMatch.period,
    matchScore,
    regimeType: bestMatch.regimeType,
    referenceCycleCount: HISTORICAL_CYCLES.length,
    matchBasis,
    consensusTrap: bestMatch.consensusTrap,
    winningMove: bestMatch.winningMove,
    reversalMarker: bestMatch.reversalMarker,
  };
}
