"use client";

import { useEffect, useState } from "react";
import type { RegimeContext, RegimeProjection } from "../../../lib/report/regimeContext";

export function RegimeContextBlock({
  regimeKey,
  tightness,
  riskAppetite,
  tightnessDelta,
  riskAppetiteDelta,
}: {
  regimeKey?: string;
  tightness: number;
  riskAppetite: number;
  tightnessDelta: number;
  riskAppetiteDelta: number;
}) {
  const [ctx, setCtx] = useState<RegimeContext | null>(null);
  const [proj, setProj] = useState<RegimeProjection | null>(null);

  useEffect(() => {
    if (!regimeKey) return;
    import("../../../lib/report/regimeContext").then((mod) => {
      setCtx(mod.getRegimeContext(regimeKey));
      setProj(mod.getRegimeProjection(regimeKey, tightness, riskAppetite, tightnessDelta, riskAppetiteDelta));
    });
  }, [regimeKey, tightness, riskAppetite, tightnessDelta, riskAppetiteDelta]);

  if (!ctx || ctx.weeksActive < 2) return null;

  const lines: string[] = [];
  lines.push(`${regimeKey}, week ${ctx.weeksActive}.`);

  if (ctx.historicalAvgWeeks) {
    const diff = ctx.weeksActive - ctx.historicalAvgWeeks;
    if (diff > 2) {
      lines.push(`Longer than typical (avg ${ctx.historicalAvgWeeks} weeks).`);
    } else if (diff < -2) {
      lines.push(`Earlier than typical duration (avg ${ctx.historicalAvgWeeks} weeks).`);
    }
  }

  if (ctx.commonOutcome && ctx.outcomeProbability && ctx.outcomeProbability >= 40) {
    lines.push(`Historically followed by ${ctx.commonOutcome} ${ctx.outcomeProbability}% of the time.`);
  }

  if (lines.length <= 1 && !proj?.weeksToFlip) return null;

  return (
    <p className="text-fluid-micro text-slate-500 leading-relaxed">
      {lines.join(" ")}
      {proj?.weeksToFlip ? ` ${proj.velocityLabel}` : ""}
    </p>
  );
}
