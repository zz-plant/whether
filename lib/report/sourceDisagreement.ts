export type DisagreementResult = {
  hasDisagreement: boolean;
  treasuryDirection: "tightening" | "easing" | "neutral";
  macroDirection: "tightening" | "easing" | "neutral";
  treasurySignals: string[];
  macroSignals: string[];
  driverLabel: string;
} | null;

export function detectSourceDisagreement(treasuryData: {
  tightnessDelta: number;
  riskAppetiteDelta: number;
}, macroData: {
  tightnessDelta: number;
  riskAppetiteDelta: number;
}): DisagreementResult {
  const treasuryDir = treasuryData.tightnessDelta > 1
    ? "tightening" as const
    : treasuryData.tightnessDelta < -1
      ? "easing" as const
      : "neutral" as const;

  const macroDir = macroData.tightnessDelta > 1
    ? "tightening" as const
    : macroData.tightnessDelta < -1
      ? "easing" as const
      : "neutral" as const;

  if (treasuryDir === macroDir || treasuryDir === "neutral" || macroDir === "neutral") {
    return null;
  }

  return {
    hasDisagreement: true,
    treasuryDirection: treasuryDir,
    macroDirection: macroDir,
    treasurySignals: treasuryDir === "tightening"
      ? ["Base rate elevated", "Yield curve inverted"]
      : ["Base rate declining", "Yield curve steepening"],
    macroSignals: macroDir === "tightening"
      ? ["Credit spreads widening", "VIX elevated"]
      : ["Credit spreads narrowing", "VIX declining"],
    driverLabel: "Treasury signals drove the call because they have higher weight in the current regime classification.",
  };
}
