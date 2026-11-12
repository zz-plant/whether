import type { RegimeKey } from "../types";

/**
 * The record band's months as one short string, for the readout that runs in the
 * browser (app/components/recordBandReadout.tsx). Kept apart from the geometry
 * (recordBand.ts) so the client reads seven characters a month and imports nothing
 * else: a client component that reaches a data module ships the data with it.
 *
 * One token a month: the regime's initial, then funding pressure and risk appetite,
 * three digits each.
 *
 * The line geometry lives here too, for the same reason: the server draws the band
 * with it (recordBand.ts) and History's canvas draws the denser plate with it
 * (app/history/recordPlateCanvas.tsx), so the two cannot disagree about where a
 * month's reading sits.
 */
const REGIME_INITIAL: Record<RegimeKey, string> = { EXPANSION: "E", VOLATILE: "V", DEFENSIVE: "D", SCARCITY: "S" };
const INITIAL_REGIME: Record<string, RegimeKey> = { E: "EXPANSION", V: "VOLATILE", D: "DEFENSIVE", S: "SCARCITY" };
const TOKEN_LENGTH = 7;

const score = (value: number) => String(Math.min(Math.max(Math.round(value), 0), 100)).padStart(3, "0");

export const encodeRecordBandMonth = (entry: { regime: RegimeKey; tightness: number; riskAppetite: number }) =>
  `${REGIME_INITIAL[entry.regime]}${score(entry.tightness)}${score(entry.riskAppetite)}`;

export const recordBandMonthCount = (encoded: string) => Math.floor(encoded.length / TOKEN_LENGTH);

export const decodeRecordBandMonth = (
  encoded: string,
  index: number,
): { regime: RegimeKey; tightness: number; riskAppetite: number } | null => {
  const token = encoded.slice(index * TOKEN_LENGTH, (index + 1) * TOKEN_LENGTH);
  const regime = INITIAL_REGIME[token[0] ?? ""];
  if (token.length < TOKEN_LENGTH || !regime) return null;
  return { regime, tightness: Number(token.slice(1, 4)), riskAppetite: Number(token.slice(4, 7)) };
};

/** The calendar month of a slot, counted from the band's first date. */
export const recordBandMonthAt = (firstDate: string, index: number) => {
  const total = Number(firstDate.slice(0, 4)) * 12 + (Number(firstDate.slice(5, 7)) - 1) + index;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
};

/** The viewBox height. Tall, so integer coordinates resolve a fifth of a pixel on a 200px band. */
export const RECORD_BAND_HEIGHT = 1000;

/**
 * Stormy is the one dark fill (Forecast, 2026-11-12); it takes the pale line and the other
 * three the dark one. Until then Sunny and Stormy were the light pair and Cloudy and
 * Freezing the dense, because the Covenant fills encoded the price of money as lightness.
 */
export const isLightField = (regime: RegimeKey) => regime !== "VOLATILE";

/**
 * Each condition's line pattern, so a stretch reads without its colour: plain for
 * Sunny, a slow wave for Stormy, a tight ripple for Cloudy, a zigzag for Freezing.
 * Amplitude is in viewBox units, wavelength in months.
 */
const LINE_PATTERN: Record<RegimeKey, { amplitude: number; wavelength: number; shape: "sine" | "triangle" }> = {
  EXPANSION: { amplitude: 0, wavelength: 1, shape: "sine" },
  VOLATILE: { amplitude: 12, wavelength: 4, shape: "sine" },
  DEFENSIVE: { amplitude: 7, wavelength: 4 / 3, shape: "triangle" },
  SCARCITY: { amplitude: 13, wavelength: 2, shape: "triangle" },
};

/* Where the two bundles sit in the band's height. Risk appetite reads 100 at the top of
   its range; funding pressure reads 0 at the top of its own, so a tighter month is lower
   and easier is up, as on every other drawing. */
const RISK_TOP = 93;
const RISK_SPAN = 293;
const PRESSURE_TOP = 560;
const PRESSURE_SPAN = 267;

/** A light three-month smoothing: one noisy month does not kink the line, a real cliff stays a cliff. */
export const smoothRecordSeries = (values: readonly number[]) =>
  values.map((value, index) => ((values[index - 1] ?? value) + 2 * value + (values[index + 1] ?? value)) / 4);

const valueAt = (values: readonly number[], month: number) => {
  const position = Math.min(Math.max(month, 0), values.length - 1);
  const low = Math.floor(position);
  const high = Math.min(low + 1, values.length - 1);
  return (values[low] ?? 0) * (1 - (position - low)) + (values[high] ?? 0) * (position - low);
};

const wave = (shape: "sine" | "triangle", phase: number) =>
  shape === "sine" ? Math.sin(phase) : (2 / Math.PI) * Math.asin(Math.sin(phase));

/**
 * Where one line of a bundle sits at a point in time, in viewBox units of height.
 * `month` counts from the band's left edge, so 0.5 is the middle of the first month.
 */
export const recordBandLineY = ({
  bundle,
  line,
  month,
  regime,
  series,
  pattern,
  spread,
}: {
  bundle: "risk" | "pressure";
  line: number;
  month: number;
  regime: RegimeKey;
  series: { risk: readonly number[]; pressure: readonly number[] };
  /** Whether to draw the condition's line pattern; off where it would alias. */
  pattern: boolean;
  /** How far apart the bundle's lines sit, as a multiple of the band's own spacing. */
  spread: number;
}) => {
  const { amplitude, wavelength, shape } = LINE_PATTERN[regime];
  const ripple = pattern && amplitude > 0 ? amplitude * wave(shape, (month / wavelength) * 2 * Math.PI + line * 0.9) : 0;
  /* A reading sits at the middle of its month, so each end half-month holds the end value. */
  if (bundle === "risk") {
    const value = valueAt(series.risk, month - 0.5);
    return RISK_TOP + (1 - value / 100) * RISK_SPAN + line * spread * (14.7 + 8.7 * (value / 100)) + ripple;
  }
  const value = valueAt(series.pressure, month - 0.5);
  return PRESSURE_TOP + (value / 100) * PRESSURE_SPAN + line * spread * (14.7 + 8.7 * (1 - value / 100)) + ripple;
};
