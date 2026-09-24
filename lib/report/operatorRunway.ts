/**
 * The runway vocabulary an operator can select, and where it lives.
 *
 * Parallel to `operatorStage.ts`, this defines the canonical cash runway bands
 * that scale bounded operating decisions across Whether's surfaces.
 *
 * Stored in `whether-company-runway` cookie and synchronized with the browser's
 * `whether.operatorProfile` localStorage.
 */

export type RunwayBand = "critical" | "tight" | "balanced" | "abundant";

type RunwayBandOption = {
  key: RunwayBand;
  label: string;
  sublabel: string;
  months: number;
  minMonths: number;
  maxMonths: number | null;
};

export const RUNWAY_BAND_OPTIONS: readonly RunwayBandOption[] = [
  /* The sublabels used to be internal band names — "Payback Gate", "Macro Corridor",
     "Counter-Cyclical" — shown to someone picking how much cash they have. They say what the
     band changes now, in the reader's terms. */
  { key: "critical", label: "<6 mo", sublabel: "Cash first", months: 4, minMonths: 0, maxMonths: 6 },
  { key: "tight", label: "6–12 mo", sublabel: "Short payback only", months: 9, minMonths: 6, maxMonths: 12 },
  { key: "balanced", label: "12–24 mo", sublabel: "Follow the guidance", months: 18, minMonths: 12, maxMonths: 24 },
  { key: "abundant", label: "24+ mo", sublabel: "Room to spend", months: 30, minMonths: 24, maxMonths: null },
];

export const DEFAULT_RUNWAY_BAND: RunwayBand = "balanced";

export const OPERATOR_RUNWAY_COOKIE = "whether-company-runway";
const OPERATOR_RUNWAY_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

const RUNWAY_BANDS: ReadonlySet<string> = new Set(RUNWAY_BAND_OPTIONS.map((opt) => opt.key));

export const isRunwayBand = (value: unknown): value is RunwayBand =>
  typeof value === "string" && RUNWAY_BANDS.has(value);

export const runwayBandLabel = (band: RunwayBand): string =>
  RUNWAY_BAND_OPTIONS.find((opt) => opt.key === band)?.label ?? band;

export const runwayBandSublabel = (band: RunwayBand): string =>
  RUNWAY_BAND_OPTIONS.find((opt) => opt.key === band)?.sublabel ?? "";

export const runwayBandForMonths = (months: number | undefined | null): RunwayBand | null => {
  if (typeof months !== "number" || !Number.isFinite(months) || months <= 0) {
    return null;
  }
  if (months < 6) return "critical";
  if (months < 12) return "tight";
  if (months < 24) return "balanced";
  return "abundant";
};

/** A band wins over a figure; a figure alone is banded; neither is null. */
export const resolveRunwayBand = (
  band: RunwayBand | null | undefined,
  months?: number | null,
): RunwayBand | null => band ?? runwayBandForMonths(months);

export const monthsForRunwayBand = (band: RunwayBand): number =>
  RUNWAY_BAND_OPTIONS.find((opt) => opt.key === band)?.months ?? 18;

const readCookieValue = (cookieHeader: string, name: string): string | null => {
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rest] = part.split("=");
    if (rawKey?.trim() !== name) continue;
    try {
      return decodeURIComponent(rest.join("=").trim());
    } catch {
      return null;
    }
  }
  return null;
};

export const readOperatorRunwayCookie = (cookieHeader: string | null | undefined): RunwayBand | null => {
  if (!cookieHeader) return null;
  const value = readCookieValue(cookieHeader, OPERATOR_RUNWAY_COOKIE);
  return isRunwayBand(value) ? value : null;
};

export const parseOperatorRunwayParam = (value: string | null | undefined): RunwayBand | null => {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed) return null;
  if (isRunwayBand(trimmed)) return trimmed;

  const num = Number.parseFloat(trimmed);
  if (Number.isFinite(num) && num > 0) {
    return runwayBandForMonths(num);
  }
  return null;
};

export const buildOperatorRunwayCookie = (band: RunwayBand | null): string => {
  const maxAge = band ? OPERATOR_RUNWAY_COOKIE_MAX_AGE_SECONDS : 0;
  return `${OPERATOR_RUNWAY_COOKIE}=${band ?? ""}; path=/; max-age=${maxAge}; SameSite=Lax`;
};

/**
 * The runway figure to store when a band is picked. A figure the operator
 * entered that already sits inside the picked band is kept — picking "12–24 mo"
 * over an exact 13 must not rewrite it to 18 — and otherwise the band's
 * representative figure stands in. No band clears the figure.
 */
export const runwayMonthsForBandPick = (
  currentMonths: number | undefined,
  band: RunwayBand | null,
): number | undefined => {
  if (!band) return undefined;
  if (runwayBandForMonths(currentMonths) === band) return currentMonths;
  return monthsForRunwayBand(band);
};
