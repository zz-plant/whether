import { NextResponse } from "next/server";
import {
  DEFAULT_THRESHOLDS,
  getRegimeProfile,
  type RegimeKey,
} from "../../../lib/regimeEngineCore";

const REGIME_CALLS: Record<RegimeKey, string> = {
  SCARCITY: "Freeze discretionary spend",
  DEFENSIVE: "Hold the line",
  VOLATILE: "Position for transition",
  EXPANSION: "Expand opportunistically",
};

const REGIME_ACTIONS: Record<RegimeKey, string> = {
  SCARCITY: "Cut non-essential cost. Gate all hiring. Extend runway.",
  DEFENSIVE: "Gate new hires behind revenue milestones. Run reversible bets only.",
  VOLATILE: "Prepare pipeline. Model both scenarios. Keep decisions reversible.",
  EXPANSION: "Accelerate hiring. Fund growth bets. Lock in favorable terms.",
};

function classifyRegime(
  tightness: number,
  riskAppetite: number,
  tr: number,
  rar: number,
): RegimeKey {
  if (tightness > tr && riskAppetite <= rar) return "SCARCITY";
  if (tightness > tr && riskAppetite > rar) return "DEFENSIVE";
  if (tightness <= tr && riskAppetite <= rar) return "VOLATILE";
  return "EXPANSION";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tightness = Number(searchParams.get("tightness"));
  const riskAppetite = Number(searchParams.get("riskAppetite"));
  const tr = Number(searchParams.get("tightnessRegime")) || DEFAULT_THRESHOLDS.tightnessRegime;
  const rar = Number(searchParams.get("riskAppetiteRegime")) || DEFAULT_THRESHOLDS.riskAppetiteRegime;

  if (Number.isNaN(tightness) || Number.isNaN(riskAppetite)) {
    return NextResponse.json(
      { error: "tightness and riskAppetite query params required" },
      { status: 400 },
    );
  }

  const regime = classifyRegime(
    Math.max(0, Math.min(100, tightness)),
    Math.max(0, Math.min(100, riskAppetite)),
    tr,
    rar,
  );

  const profile = getRegimeProfile(regime);

  return NextResponse.json({
    regime,
    call: REGIME_CALLS[regime],
    action: REGIME_ACTIONS[regime],
    description: profile.description,
    constraints: profile.constraints,
    thresholds: { tightnessRegime: tr, riskAppetiteRegime: rar },
  });
}
