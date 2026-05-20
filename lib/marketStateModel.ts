import { assembleHomePage } from "./report/homePageAssembler";
import { buildAgentInterfaceResponse } from "./agentInterface";

export interface MarketState {
  regime: string;
  posture: string;
  decision: string;
  tightness: number;
  riskAppetite: number;
  tightnessDelta: number;
  riskAppetiteDelta: number;
  confidenceLabel: string;
  recordDate: string;
  fetchedAt: string;
}

/**
 * Loads the current market state for the public /state page.
 * Uses the same data pipeline as the homepage (assembleHomePage)
 * but extracts only the subset needed for a public-facing summary.
 *
 * Falls back to null on error so the page can render a graceful
 * "unable to load" message instead of crashing.
 */
export async function loadMarketState(): Promise<MarketState | null> {
  try {
    const homepage = await assembleHomePage({});
    const weeklyCard = homepage.weeklyDecisionCardModel;

    const canonicalDecision = weeklyCard.decision.canonicalDecisionCopy;
    const decision =
      canonicalDecision?.doNowLines?.[0] ??
      weeklyCard.decision.actionNowShort ??
      weeklyCard.decision.immediateDecision;

    return {
      regime: homepage.reportShell.regime,
      posture:
        weeklyCard.status.postureWithStageLabel ??
        weeklyCard.status.postureLabel,
      decision,
      tightness: weeklyCard.diagnostics.currentScores.tightness,
      riskAppetite: weeklyCard.diagnostics.currentScores.riskAppetite,
      tightnessDelta:
        weeklyCard.decision.reportDynamics.changedSignals.find(
          (s) => s.key === "tightness"
        )?.delta ?? 0,
      riskAppetiteDelta:
        weeklyCard.decision.reportDynamics.changedSignals.find(
          (s) => s.key === "riskAppetite"
        )?.delta ?? 0,
      confidenceLabel: weeklyCard.status.confidenceLabel,
      recordDate: homepage.reportShell.recordDateLabel,
      fetchedAt: homepage.reportShell.fetchedAtLabel,
    };
  } catch (error) {
    console.error("[marketState] Failed to load market state:", error);
    return null;
  }
}

/**
 * Builds a minimal market summary using the agent interface.
 * Kept as a secondary path for future use (e.g. lightweight API
 * call when assembleHomePage is overkill), but the primary path
 * above from assembleHomePage provides richer data.
 */
export async function loadMarketStateFromAgent(): Promise<MarketState | null> {
  try {
    const response = await buildAgentInterfaceResponse("weekly");

    return {
      regime: (
        response.summary as Record<string, unknown> & { regime?: string }
      ).regime ?? "Unknown",
      posture: (
        response.summary as Record<string, unknown> & {
          action?: string;
        }
      ).action ?? "Hold",
      decision:
        (response.summary as Record<string, unknown> & {
          action?: string;
        }).action ?? "Review operating posture",
      tightness: 0,
      riskAppetite: 0,
      tightnessDelta: 0,
      riskAppetiteDelta: 0,
      confidenceLabel: "MED",
      recordDate: response.recordDateLabel ?? "Unavailable",
      fetchedAt: response.generatedAt,
    };
  } catch (error) {
    console.error(
      "[marketState] Failed to load market state from agent:",
      error
    );
    return null;
  }
}
