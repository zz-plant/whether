/**
 * Historical Analog Playbook Engine for Whether.
 * Matches current macro coordinates to historical analog cycles and extracts
 * the consensus trap, the winning counter-intuitive move, and the reversal marker.
 */
import type { RegimeScores } from "./regimeEngine";
import { regimeSignalLabel } from "./report/signalTranslations";

type AnalogCoordinate = {
  key: "baseRate" | "curveSlope" | "tightness" | "riskAppetite";
  label: string;
  /** The reference cycle's value. */
  historical: number;
  /** The live value it was compared against. */
  live: number;
  unit: "%" | "pts";
};

interface AnalogPlaybookResult {
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
    regimeType: "High rates, recession warning about to fire",
    baseRate: 5.25,
    curveSlope: -0.25,
    tightness: 70,
    riskAppetite: 40,
    consensusTrap:
      "Hired enterprise sales ahead of a fourth-quarter rebound that did not come, as enterprise buying cycles lengthened.",
    winningMove:
      "Moved to annual contracts paid up front, with a 15% discount for doing so; turned open engineering roles into 6-month contract-to-hire positions.",
    reversalMarker:
      "The recession warning gauge climbing back above +0.25%, with funding pressure falling two months in a row, marked the safe time to expand again.",
  },
  {
    id: "q4_2018",
    period: "Q4 2018",
    regimeType: "A rate-rise scare mid-expansion",
    baseRate: 2.50,
    curveSlope: 0.15,
    tightness: 62,
    riskAppetite: 35,
    consensusTrap:
      "Froze product releases and cut marketing spend in a panic, right before the Federal Reserve stopped raising rates.",
    winningMove:
      "Kept shipping core product while spending elsewhere was cut; moved annual cloud contracts to month-to-month.",
    reversalMarker:
      "The Federal Reserve's pause, and risk appetite rising past 55, marked the time to restart sales and marketing spending.",
  },
  {
    id: "q2_2022",
    period: "Q2 2022",
    regimeType: "Fast rate rises and falling valuations",
    baseRate: 3.50,
    curveSlope: -0.40,
    tightness: 78,
    riskAppetite: 28,
    consensusTrap:
      "Kept spending heavily on the assumption that the next venture round would still come at 2021 valuations.",
    winningMove:
      "Cut non-essential software subscriptions at once; extended runway past 24 months to avoid raising at a lower valuation than the last round.",
    reversalMarker:
      "Short-term rates stopped climbing and funding pressure settled below 65.",
  },
  {
    id: "q2_2021",
    period: "Q2 2021",
    regimeType: "Near-zero rates, easy money",
    baseRate: 0.25,
    curveSlope: 1.20,
    tightness: 25,
    riskAppetite: 85,
    consensusTrap:
      "Hired fast without the onboarding to support it; output per person fell and fixed costs swelled.",
    winningMove:
      "Raised enough for several years while borrowing cost almost nothing; signed long-term contracts with large anchor customers.",
    reversalMarker:
      "Inflation rising above 3.5%, and the gap between long- and short-term rates narrowing, marked the end of cheap money.",
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
    { key: "baseRate", label: "Short-term borrowing rate", historical: bestMatch.baseRate, live: baseRate, unit: "%" },
    { key: "curveSlope", label: "Recession warning gauge (10-year minus 2-year rate)", historical: bestMatch.curveSlope, live: currentSlope, unit: "%" },
    { key: "tightness", label: regimeSignalLabel.tightness, historical: bestMatch.tightness, live: tightness, unit: "pts" },
    { key: "riskAppetite", label: regimeSignalLabel.riskAppetite, historical: bestMatch.riskAppetite, live: riskAppetite, unit: "pts" },
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
