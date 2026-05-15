/**
 * Ticker-to-sector mapping for company-scoped weekly briefs.
 * Maps public tickers to sector profiles that adjust macro sensitivity
 * weights and bounded decision rules.
 */

export type SectorProfile = {
  sector: string;
  sectorLabel: string;
  macroVectors: Array<{
    signal: string;
    weight: number; // 0-1 how much this signal matters for this sector
    direction: "positive" | "negative" | "neutral";
  }>;
  // Threshold overrides for the regime engine (applied on top of base thresholds)
  thresholdOverrides?: {
    tightnessMultiplier?: number;
    riskAppetiteMultiplier?: number;
  };
};

const SECTOR_PROFILES: Record<string, SectorProfile> = {
  "SaaS-Enterprise": {
    sector: "SaaS-Enterprise",
    sectorLabel: "Enterprise SaaS",
    macroVectors: [
      { signal: "BASE_RATE", weight: 0.4, direction: "negative" },
      { signal: "CURVE_SLOPE", weight: 0.3, direction: "neutral" },
      { signal: "BBB_CREDIT_SPREAD", weight: 0.2, direction: "negative" },
      { signal: "VC_FUNDING_VELOCITY", weight: 0.1, direction: "positive" },
    ],
    thresholdOverrides: {
      tightnessMultiplier: 0.85, // Less sensitive to rate tightness
      riskAppetiteMultiplier: 1.1, // Slightly more risk-tolerant
    },
  },
  "SaaS-SMB": {
    sector: "SaaS-SMB",
    sectorLabel: "SMB SaaS",
    macroVectors: [
      { signal: "BASE_RATE", weight: 0.5, direction: "negative" },
      { signal: "CURVE_SLOPE", weight: 0.2, direction: "neutral" },
      { signal: "BBB_CREDIT_SPREAD", weight: 0.3, direction: "negative" },
      { signal: "VC_FUNDING_VELOCITY", weight: 0.3, direction: "positive" },
    ],
    thresholdOverrides: {
      tightnessMultiplier: 0.9,
      riskAppetiteMultiplier: 0.95,
    },
  },
  Fintech: {
    sector: "Fintech",
    sectorLabel: "Fintech / Payments",
    macroVectors: [
      { signal: "BASE_RATE", weight: 0.6, direction: "negative" },
      { signal: "CURVE_SLOPE", weight: 0.3, direction: "positive" },
      { signal: "BBB_CREDIT_SPREAD", weight: 0.5, direction: "negative" },
      { signal: "VC_FUNDING_VELOCITY", weight: 0.2, direction: "positive" },
    ],
    thresholdOverrides: {
      tightnessMultiplier: 1.0,
      riskAppetiteMultiplier: 0.9,
    },
  },
  "Real-Estate": {
    sector: "Real-Estate",
    sectorLabel: "Real Estate / Proptech",
    macroVectors: [
      { signal: "BASE_RATE", weight: 0.8, direction: "negative" },
      { signal: "CURVE_SLOPE", weight: 0.4, direction: "negative" },
      { signal: "BBB_CREDIT_SPREAD", weight: 0.7, direction: "negative" },
      { signal: "VC_FUNDING_VELOCITY", weight: 0.1, direction: "neutral" },
    ],
    thresholdOverrides: {
      tightnessMultiplier: 1.2, // More sensitive to rate tightness
      riskAppetiteMultiplier: 0.8, // More conservative
    },
  },
  Healthcare: {
    sector: "Healthcare",
    sectorLabel: "Healthcare / Biotech",
    macroVectors: [
      { signal: "BASE_RATE", weight: 0.3, direction: "negative" },
      { signal: "CURVE_SLOPE", weight: 0.2, direction: "neutral" },
      { signal: "BBB_CREDIT_SPREAD", weight: 0.4, direction: "negative" },
      { signal: "VC_FUNDING_VELOCITY", weight: 0.5, direction: "positive" },
    ],
    thresholdOverrides: {
      tightnessMultiplier: 0.75,
      riskAppetiteMultiplier: 1.15,
    },
  },
  Consumer: {
    sector: "Consumer",
    sectorLabel: "Consumer / Retail",
    macroVectors: [
      { signal: "BASE_RATE", weight: 0.5, direction: "negative" },
      { signal: "CURVE_SLOPE", weight: 0.3, direction: "neutral" },
      { signal: "BBB_CREDIT_SPREAD", weight: 0.3, direction: "negative" },
      { signal: "VC_FUNDING_VELOCITY", weight: 0.1, direction: "positive" },
    ],
    thresholdOverrides: {
      tightnessMultiplier: 1.0,
      riskAppetiteMultiplier: 1.0,
    },
  },
  "Enterprise-Tech": {
    sector: "Enterprise-Tech",
    sectorLabel: "Enterprise Technology",
    macroVectors: [
      { signal: "BASE_RATE", weight: 0.4, direction: "negative" },
      { signal: "CURVE_SLOPE", weight: 0.3, direction: "neutral" },
      { signal: "BBB_CREDIT_SPREAD", weight: 0.3, direction: "negative" },
      { signal: "VC_FUNDING_VELOCITY", weight: 0.2, direction: "positive" },
    ],
    thresholdOverrides: {
      tightnessMultiplier: 0.85,
      riskAppetiteMultiplier: 1.05,
    },
  },
  "Financial-Services": {
    sector: "Financial-Services",
    sectorLabel: "Financial Services",
    macroVectors: [
      { signal: "BASE_RATE", weight: 0.7, direction: "positive" },
      { signal: "CURVE_SLOPE", weight: 0.6, direction: "positive" },
      { signal: "BBB_CREDIT_SPREAD", weight: 0.6, direction: "negative" },
      { signal: "VC_FUNDING_VELOCITY", weight: 0.1, direction: "neutral" },
    ],
    thresholdOverrides: {
      tightnessMultiplier: 0.9,
      riskAppetiteMultiplier: 0.95,
    },
  },
  Industrials: {
    sector: "Industrials",
    sectorLabel: "Industrials / Manufacturing",
    macroVectors: [
      { signal: "BASE_RATE", weight: 0.6, direction: "negative" },
      { signal: "CURVE_SLOPE", weight: 0.3, direction: "negative" },
      { signal: "BBB_CREDIT_SPREAD", weight: 0.5, direction: "negative" },
      { signal: "VC_FUNDING_VELOCITY", weight: 0.0, direction: "neutral" },
    ],
    thresholdOverrides: {
      tightnessMultiplier: 1.1,
      riskAppetiteMultiplier: 0.85,
    },
  },
};

const TICKER_TO_SECTOR: Record<string, string> = {
  // Big Tech
  AAPL: "Consumer",
  GOOGL: "Enterprise-Tech",
  GOOG: "Enterprise-Tech",
  MSFT: "Enterprise-Tech",
  META: "Consumer",
  AMZN: "Consumer",
  NFLX: "Consumer",

  // Enterprise SaaS
  CRM: "SaaS-Enterprise",
  NOW: "SaaS-Enterprise",
  WDAY: "SaaS-Enterprise",
  ADBE: "SaaS-Enterprise",
  ORCL: "SaaS-Enterprise",
  SAP: "SaaS-Enterprise",
  TEAM: "SaaS-Enterprise",
  DOCU: "SaaS-Enterprise",
  BOX: "SaaS-Enterprise",
  SMAR: "SaaS-Enterprise",
  MDB: "SaaS-Enterprise",
  DDOG: "SaaS-Enterprise",
  HUBS: "SaaS-Enterprise",
  ZM: "SaaS-Enterprise",
  WK: "SaaS-Enterprise",

  // Fintech
  SQ: "Fintech",
  PYPL: "Fintech",
  STRIPE: "Fintech",
  AFRM: "Fintech",
  SOFI: "Fintech",
  COIN: "Fintech",
  PLTR: "Enterprise-Tech",

  // Real Estate / Proptech
  Z: "Real-Estate",
  RDFN: "Real-Estate",
  OPEN: "Real-Estate",
  COMP: "Real-Estate",
  EXPI: "Real-Estate",

  // Healthcare
  UNH: "Healthcare",
  JNJ: "Healthcare",
  PFE: "Healthcare",
  MRNA: "Healthcare",
  ABBV: "Healthcare",

  // Financial Services
  JPM: "Financial-Services",
  BAC: "Financial-Services",
  GS: "Financial-Services",
  MS: "Financial-Services",
  V: "Fintech",
  MA: "Fintech",

  // Industrials
  GE: "Industrials",
  CAT: "Industrials",
  DE: "Industrials",
  UPS: "Industrials",
  FDX: "Industrials",

  // Selective high-relevance startups
  RBRK: "Enterprise-Tech",
  SPAC: "Consumer",
};

export const getSectorForTicker = (ticker: string): string | null => {
  const normalized = ticker.toUpperCase().trim();
  return TICKER_TO_SECTOR[normalized] ?? null;
};

export const getSectorProfile = (ticker: string): SectorProfile | null => {
  const sector = getSectorForTicker(ticker);
  if (!sector) return null;
  return SECTOR_PROFILES[sector] ?? null;
};

export const getSectorProfileByKey = (sectorKey: string): SectorProfile | null => {
  return SECTOR_PROFILES[sectorKey] ?? null;
};

export const getAllSectors = (): string[] => {
  return Object.keys(SECTOR_PROFILES);
};

export const getAllMappedTickers = (): string[] => {
  return Object.keys(TICKER_TO_SECTOR);
};

export const getTickerCount = (): number => {
  return Object.keys(TICKER_TO_SECTOR).length;
};