/**
 * Historical Analog Playbook Engine for Whether.
 * Matches current macro coordinates to historical analog cycles and extracts
 * the consensus trap, the winning counter-intuitive move, and the reversal marker.
 */
import type { RegimeAssessment } from "./regimeEngine";

export interface AnalogPlaybookResult {
  analogPeriod: string;
  correlationScore: number;
  regimeType: string;
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
      "What peer startups got wrong: Expanded enterprise direct sales headcount expecting a Q4 demand rebound; burned 35% of cash buffer with zero closed-won conversions as enterprise procurement timelines doubled.",
    winningMove:
      "What top performers executed: Restructured pricing to 100% annual upfront cash collection with a 15% incentive; converted open engineering reqs to 6-month contract-to-hire.",
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
      "What peer startups got wrong: Froze all product releases and panicked on marketing spend right before the Fed pivoted to an easing pause.",
    winningMove:
      "What top performers executed: Accelerated core product velocity while competitors stalled; renegotiated annual cloud commits to monthly rolling tiers.",
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
      "What peer startups got wrong: Maintained high gross burn assuming secondary venture funding rounds would remain available at 2021 valuation multiples.",
    winningMove:
      "What top performers executed: Cut non-essential vendor SaaS bloat immediately; extended runway beyond 24 months to bypass dilutive down-rounds entirely.",
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
      "What peer startups got wrong: Hired indiscriminately without onboarding infrastructure, driving down per-employee productivity and ballooning fixed overhead.",
    winningMove:
      "What top performers executed: Raised multi-year capital reserves while cost of capital was near zero; locked in long-term enterprise anchor customers.",
    reversalMarker:
      "Initial inflation surge above 3.5% and yield curve flattening signaled the impending end of frictionless capital.",
  },
];

export function getHistoricalAnalogPlaybook(assessment: RegimeAssessment): AnalogPlaybookResult {
  const { baseRate, curveSlope, tightness, riskAppetite } = assessment.scores;
  const currentSlope = curveSlope ?? 0;

  let bestMatch = HISTORICAL_CYCLES[0];
  let lowestDistance = Number.POSITIVE_INFINITY;

  for (const cycle of HISTORICAL_CYCLES) {
    // Weighted Euclidean distance across key coordinates
    const rateDiff = (baseRate - cycle.baseRate) * 10;
    const slopeDiff = (currentSlope - cycle.curveSlope) * 20;
    const tightnessDiff = tightness - cycle.tightness;
    const riskDiff = riskAppetite - cycle.riskAppetite;

    const distance = Math.sqrt(
      rateDiff ** 2 + slopeDiff ** 2 + tightnessDiff ** 2 + riskDiff ** 2
    );

    if (distance < lowestDistance) {
      lowestDistance = distance;
      bestMatch = cycle;
    }
  }

  const correlation = Math.max(65, Math.min(96, Math.round(100 - lowestDistance * 0.4)));

  return {
    analogPeriod: bestMatch.period,
    correlationScore: correlation,
    regimeType: bestMatch.regimeType,
    consensusTrap: bestMatch.consensusTrap,
    winningMove: bestMatch.winningMove,
    reversalMarker: bestMatch.reversalMarker,
  };
}
