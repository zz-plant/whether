/**
 * Sector Sensitivity Overlays for Whether.
 * Tunes macro tightness and risk appetite for sector-specific capital dynamics.
 */
import type { RegimeAssessment } from "./regimeEngine";

type SectorType = "b2b_saas" | "ai_compute" | "biotech" | "hardware";

interface SectorOverlayConfig {
  id: SectorType;
  label: string;
  tightnessModifier: number;
  riskModifier: number;
  primaryRiskFactor: string;
  sectorDirective: string;
}

const SECTOR_CONFIGS: Record<SectorType, SectorOverlayConfig> = {
  b2b_saas: {
    id: "b2b_saas",
    label: "B2B SaaS / Enterprise Software",
    tightnessModifier: 0,
    riskModifier: 0,
    primaryRiskFactor: "Enterprise procurement cycle length & seat contraction",
    sectorDirective: "Condition all discounts on 100% upfront annual cash collection.",
  },
  ai_compute: {
    id: "ai_compute",
    label: "AI / Foundation Models / GPU Heavy",
    tightnessModifier: +8,
    riskModifier: -5,
    primaryRiskFactor: "High fixed GPU cluster depreciation & token margin compression",
    sectorDirective: "Avoid >12m fixed compute commitments; maintain on-demand or convertible reservations.",
  },
  biotech: {
    id: "biotech",
    label: "Biotech / Clinical Stage",
    tightnessModifier: +12,
    riskModifier: -10,
    primaryRiskFactor: "Zero-revenue clinical trial milestones & high cost of capital",
    sectorDirective: "Extend minimum cash runway buffer to 24+ months before starting new clinical trials.",
  },
  hardware: {
    id: "hardware",
    label: "Hardware / Robotics / Physical Devices",
    tightnessModifier: +6,
    riskModifier: -4,
    primaryRiskFactor: "Supply chain component lead times & working capital lock-in",
    sectorDirective: "Maintain lean inventory buffers; negotiate milestone-gated batch POs.",
  },
};

interface SectorAssessmentResult {
  sector: SectorOverlayConfig;
  effectiveTightness: number;
  effectiveRiskAppetite: number;
  sectorSpecificDirective: string;
  adjustedRegime: string;
}

export function applySectorOverlay(
  assessment: RegimeAssessment,
  sectorType: SectorType
): SectorAssessmentResult {
  const config = SECTOR_CONFIGS[sectorType] ?? SECTOR_CONFIGS.b2b_saas;
  const baseScores = assessment.scores;

  const effectiveTightness = Math.max(0, Math.min(100, baseScores.tightness + config.tightnessModifier));
  const effectiveRiskAppetite = Math.max(0, Math.min(100, baseScores.riskAppetite + config.riskModifier));

  let adjustedRegime = assessment.regime;
  if (effectiveTightness >= 75 && effectiveRiskAppetite <= 35) {
    adjustedRegime = "SCARCITY";
  }

  return {
    sector: config,
    effectiveTightness,
    effectiveRiskAppetite,
    sectorSpecificDirective: `${config.primaryRiskFactor}: ${config.sectorDirective}`,
    adjustedRegime,
  };
}
