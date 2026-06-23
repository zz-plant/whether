/**
 * Shared data shapes for the Regime Station flow.
 * Keeps Treasury source metadata explicit for traceable outputs.
 */
export type RegimeKey = "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION";

export interface SourceProvenance {
  fetched_at: string;
  isLive: boolean;
  fallback_at?: string | null;
  fallback_reason?: string | null;
}

export interface TreasuryYields {
  fedFunds?: number | null;
  oneMonth: number | null;
  threeMonth?: number | null;
  twoYear: number | null;
  tenYear: number | null;
}

export interface TreasuryMetadata extends SourceProvenance {
  source: string;
  record_date: string;
}

export interface TreasuryData extends TreasuryMetadata {
  yields: TreasuryYields;
}

export interface SeriesHistoryPoint {
  date: string;
  value: number | null;
}

export type SensorCategory = "Rates" | "Inflation" | "Labor" | "Credit";

export type SensorTimeWindow = "1M" | "3M" | "6M" | "12M";

export interface SensorGroupMeta {
  id: SensorCategory;
  label: string;
  description: string;
}

export interface SensorWindowAggregation {
  window: SensorTimeWindow;
  change: number | null;
  previousValue: number | null;
}

export interface SensorReading extends SourceProvenance {
  id: "BASE_RATE" | "CURVE_SLOPE";
  label: string;
  value: number | null;
  currentInfluence?: number | null;
  unit: "%" | "bps";
  explanation: string;
  category: SensorCategory;
  group: SensorGroupMeta;
  availableTimeWindows: SensorTimeWindow[];
  sourceLabel: string;
  sourceUrl: string;
  formulaUrl: string;
  record_date: string;
  history?: SeriesHistoryPoint[];
  trend?: SeriesHistoryPoint[];
  timeWindows?: SensorWindowAggregation[];
}

export type MacroSeriesId =
  | "CPI_YOY"
  | "UNEMPLOYMENT_RATE"
  | "BBB_CREDIT_SPREAD"
  | "HY_CREDIT_SPREAD"
  | "CHICAGO_FCI"
  | "VIX_INDEX"
  | "VC_FUNDING_VELOCITY"
  | "TECH_LAYOFF_TREND"
  | "SAAS_VALUATION_MULTIPLE"
  | "EARNINGS_REVISION_INDEX"
  | "AI_COMPUTE_COST_TREND"
  | "REGULATORY_RISK_TRACKER";

export interface MacroSeriesReading extends SourceProvenance {
  id: MacroSeriesId;
  label: string;
  value: number | null;
  unit: "%" | "bps" | "x" | "index";
  explanation: string;
  sourceLabel: string;
  sourceUrl: string;
  formulaUrl: string;
  record_date: string;
  history?: SeriesHistoryPoint[];
}

export interface PostureApiResponse {
  regime: RegimeKey;
  tightness: number;
  direction: string;
  confidence: number;
  week: string;
  summary: string;
  url: string;
  version: string;
}

export const POSTURE_API_VERSION = "1.0";
