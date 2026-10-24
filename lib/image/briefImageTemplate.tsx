import type { CSSProperties, ReactElement } from "react";
import type { ScoreReadingParts } from "../export/scoreReference";
import { REGIME_HEX_COLORS } from "../regimePhaseSpace";
import { getRegimePublicLabel, isRegimeKey } from "../regimePresentation";
import { formatMarginBand } from "../report/reportFormatting";
import { OG_FONT_BODY, OG_FONT_DISPLAY, OG_FONT_STAMP, toImageSafeText } from "./ogFonts";
import { OG_BG, OG_BORDER, OG_CONDITION_INK, OG_LINE_CROSSED, OG_PANEL, OG_TEXT, OG_TEXT_MUTED, OG_TEXT_SECONDARY } from "./ogTheme";
import { SANS_EM, DISPLAY_EM, fitLines, wrappedLines } from "./textFit";

export type BriefImageProps = {
  /** The call: this week's do-now line. */
  decision: string;
  /** The engine key; it picks the weather word and its colour. */
  regime: string;
  /** Both scores with the line each is judged against and the earlier reading, dated (`buildScoreReadings`). */
  readings: readonly ScoreReadingParts[];
  confidenceLabel: string;
  recordDate: string;
  briefLabel?: string;
  /** Who the card is scoped to, or why it is not this week's live reading. */
  contextLabel?: string;
  /** Where the reading came from, in a reader's words. */
  sourceLabel?: string;
};

export type BriefImageLayout = "standard" | "landscape" | "square" | "portrait";
export type BriefImageTheme = "dark" | "light";
type BriefImageVariant = {
  layout: BriefImageLayout;
  theme: BriefImageTheme;
  width: number;
  height: number;
};

const IMAGE_SIZES = {
  standard: { width: 1200, height: 800 },
  landscape: { width: 1200, height: 675 },
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
} as const;

/** Presentation only: the report request context and its deadlines stay unchanged. */
export const parseBriefImageVariant = (source: { get(name: string): string | null }): BriefImageVariant => {
  const requestedLayout = source.get("layout");
  const layout: BriefImageLayout = requestedLayout === "landscape" || requestedLayout === "square" || requestedLayout === "portrait"
    ? requestedLayout
    : "standard";
  return { layout, theme: source.get("theme") === "light" ? "light" : "dark", ...IMAGE_SIZES[layout] };
};

/*
 * The brief card, drawn for the size it is seen at.
 *
 * It lands in a Slack channel or a link unfurl at roughly 40% of its drawn
 * size, and it used to set its two most useful facts (the confidence chip and
 * the data line) at 12-13px, about 5px in a feed. It also spent its middle on
 * one score of the two, with a gauge whose end labels were bare numbers, and
 * never said where either score sat against the line that changes the call.
 * The card now prints both readings the way `/share` and every paste do
 * (`lib/export/scoreReference.ts`), with nothing under 22px -- the floor the
 * weekly card holds (`app/api/og/reportImageTemplate.tsx`).
 *
 * Satori cannot measure text, so the one block that varies in length, the
 * call, is sized by estimating its wrap (`lib/image/textFit.ts`). Worst case on
 * the 800px canvas, measured off a render: padding (44 + 38), the header (30),
 * the stamp and its margin (22 + 54), a three-line call at 56px (14 + 185), the
 * least air (20), two readings of three lines each (2 x 131 + 10 between) and
 * the footer, chip row then source line (14 + 40 + 8 + 28) come to 769px.
 */
const WIDTH = 1200;
const HEIGHT = 800;
const PAD_X = 56;
const CONTENT_WIDTH = WIDTH - PAD_X * 2;
const CALL_SIZES = [56, 50, 46, 42] as const;
const MAX_CALL_LINES = 3;
/* The value is set at 84px, where a digit is about 50px wide; both rows share
   one column, sized for the longer value, so their labels start on one edge. */
const VALUE_SIZE = 84;
const VALUE_GLYPH_WIDTH = 52;
/* The source has a line of its own under the chip: the label names three inputs, and
   "Source: " takes about 90px of the row. */
const SOURCE_WIDTH = CONTENT_WIDTH - 90;
/* The weather stamp takes about 190px of its row; the scope beside it gets the rest, on one line. */
const CONTEXT_WIDTH = CONTENT_WIDTH - 230;

/* A wide margin is the clear state (the ink); a medium or narrow one is close
   to a line, the crossed state's red, as the site prints it. */
const confidenceColor = (label: string, palette: typeof DARK_PALETTE) => (label === "HIGH" ? palette.text : palette.crossed);

const frameStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: WIDTH,
  height: HEIGHT,
  padding: "44px 56px 38px",
  background: OG_BG,
  color: OG_TEXT,
  fontFamily: `${OG_FONT_BODY}, ui-sans-serif, system-ui, sans-serif`,
  position: "relative",
};

/** The largest call size that keeps to three lines, and the call cut to fit at the smallest. */
const layoutCall = (decision: string): { size: number; text: string } => {
  const size =
    CALL_SIZES.find((candidate) => wrappedLines(decision, candidate, CONTENT_WIDTH, DISPLAY_EM).length <= MAX_CALL_LINES) ??
    CALL_SIZES[CALL_SIZES.length - 1];
  return { size, text: fitLines(decision, size, CONTENT_WIDTH, DISPLAY_EM, MAX_CALL_LINES) };
};

/*
 * Every div that holds an element or a list carries an explicit display: satori
 * throws mid-render on one that does not, which surfaces as a 200 with an empty
 * body rather than an error. So text that reads as one line is built as one
 * string here instead of several adjacent JSX children.
 */
const readingRow = (reading: ScoreReadingParts, valueWidth: number, palette: typeof DARK_PALETTE) => {
  /* The order every surface prints: the line, how far from it, then the earlier reading. */
  const detail = [reading.line, reading.distance, reading.previous].filter((part) => part !== null).join(" \u00b7 ");
  return (
    <div
      key={reading.metric}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 28,
        padding: "12px 24px",
        borderRadius: 8,
        background: palette.panel,
        border: `1px solid ${palette.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          width: valueWidth,
          fontSize: VALUE_SIZE,
          fontWeight: 600,
          lineHeight: 1,
          color: palette.text,
        }}
      >
        {reading.value}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 4 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: palette.text }}>{reading.label}</div>
          <div style={{ display: "flex", fontSize: 24, color: palette.muted }}>{reading.meaning}</div>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: palette.secondary }}>{detail}</div>
        {reading.resume ? (
          <div style={{ display: "flex", fontSize: 24, color: palette.muted }}>{reading.resume}</div>
        ) : null}
      </div>
    </div>
  );
};

/** Copy arrives from the report model, which is free to use symbols the OG font subset does not carry. */
const toImageSafeReading = (reading: ScoreReadingParts): ScoreReadingParts => ({
  ...reading,
  label: toImageSafeText(reading.label),
  value: toImageSafeText(reading.value),
  meaning: toImageSafeText(reading.meaning),
  reading: toImageSafeText(reading.reading),
  line: toImageSafeText(reading.line),
  distance: toImageSafeText(reading.distance),
  previous: reading.previous === null ? null : toImageSafeText(reading.previous),
  resume: reading.resume === null ? null : toImageSafeText(reading.resume),
});

const renderStandardBriefImage = (props: BriefImageProps, palette: typeof DARK_PALETTE): ReactElement => {
  /* One stray glyph outside the faces' subset aborts the whole render, so
     everything headed for the canvas goes through toImageSafeText. */
  const decision = toImageSafeText(props.decision);
  const recordDate = toImageSafeText(props.recordDate);
  const contextLabel = props.contextLabel === undefined ? undefined : toImageSafeText(props.contextLabel);
  const sourceLabel = props.sourceLabel === undefined ? undefined : toImageSafeText(props.sourceLabel);
  const readings = props.readings.map(toImageSafeReading);

  const regimeColor = isRegimeKey(props.regime) ? REGIME_HEX_COLORS[props.regime] : palette.text;
  const weather = getRegimePublicLabel(props.regime).toUpperCase();
  const call = layoutCall(decision);
  const valueWidth = Math.max(2, ...readings.map((reading) => reading.value.length)) * VALUE_GLYPH_WIDTH;
  const eyebrow = ["WHETHER", toImageSafeText(props.briefLabel ?? "Weekly Brief")].join(" \u00b7 ").toUpperCase();
  /* The card that lands in someone else's Slack channel said "MED CONFIDENCE".
     The colour keys off the raw code, which is what the engine stores; only
     the words a reader sees change. */
  const confidenceColour = confidenceColor(props.confidenceLabel, palette);
  const confidenceBadge = toImageSafeText(formatMarginBand(props.confidenceLabel)).toUpperCase();
  const source = sourceLabel ? `Source: ${fitLines(sourceLabel, 22, SOURCE_WIDTH, SANS_EM, 1)}` : "";
  const context = contextLabel ? fitLines(contextLabel, 22, CONTEXT_WIDTH, SANS_EM, 1) : "";

  return (
    <div style={{ ...frameStyle, background: palette.background, color: palette.text }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, background: regimeColor }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", fontSize: 22, fontWeight: 600, letterSpacing: "0.12em", color: palette.muted }}>
          {eyebrow}
        </div>
        <div style={{ display: "flex", fontSize: 22, color: palette.muted }}>{`Data as of ${recordDate}`}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 22 }}>
        <div
          style={{
            display: "flex",
            padding: "8px 16px",
            borderRadius: 4,
            border: `2px solid ${regimeColor}`,
            color: isRegimeKey(props.regime) ? palette.conditionInk[props.regime] : palette.text,
            fontSize: 26,
            fontWeight: 700,
            fontFamily: `${OG_FONT_STAMP}, ui-sans-serif, system-ui, sans-serif`,
            letterSpacing: "0.06em",
          }}
        >
          {weather}
        </div>
        {context ? <div style={{ display: "flex", fontSize: 22, fontWeight: 600, color: palette.text }}>{context}</div> : null}
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 14,
          fontSize: call.size,
          lineHeight: 1.1,
          fontWeight: 700,
          fontFamily: `${OG_FONT_DISPLAY}, ui-sans-serif, system-ui, sans-serif`,
          letterSpacing: "-0.01em",
        }}
      >
        {call.text}
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 20 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {readings.map((reading) => readingRow(reading, valueWidth, palette))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              padding: "4px 14px",
              borderRadius: 999,
              backgroundColor: `${confidenceColour}20`,
              border: `1px solid ${confidenceColour}50`,
              color: confidenceColour,
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "0.06em",
            }}
          >
            {confidenceBadge}
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: palette.secondary }}>whether.work</div>
        </div>
        {source ? <div style={{ display: "flex", fontSize: 22, color: palette.muted }}>{source}</div> : null}
      </div>
    </div>
  );
};

/* Mirrors the light overrides in app/styles/tokens.css. Generated images cannot
   resolve CSS variables, so the same roles are supplied as actual colours. */
const LIGHT_PALETTE = {
  background: "#f1f4f3",
  panel: "#ffffff",
  border: "rgba(18, 23, 25, 0.14)",
  text: "#121719",
  secondary: "#384145",
  muted: "#525c60",
  crossed: "#b4232a",
  conditionInk: { EXPANSION: "#7a5800", DEFENSIVE: "#74552a", VOLATILE: "#4a4fc0", SCARCITY: "#1d5585" },
};
const DARK_PALETTE = {
  background: OG_BG, panel: OG_PANEL, border: OG_BORDER, text: OG_TEXT,
  secondary: OG_TEXT_SECONDARY, muted: OG_TEXT_MUTED, crossed: OG_LINE_CROSSED,
  conditionInk: OG_CONDITION_INK,
};

/** The same complete reading, reflowed rather than cropped for each destination. */
const renderVariantBriefImage = (props: BriefImageProps, variant: BriefImageVariant): ReactElement => {
  const palette = variant.theme === "light" ? LIGHT_PALETTE : DARK_PALETTE;
  const landscape = variant.layout === "landscape";
  const portrait = variant.layout === "portrait";
  const padding = landscape ? 40 : 48;
  const contentWidth = variant.width - padding * 2;
  const columnWidth = landscape ? (contentWidth - 36) / 2 : contentWidth;
  const readings = props.readings.map(toImageSafeReading);
  const decision = toImageSafeText(props.decision);
  const context = props.contextLabel ? toImageSafeText(props.contextLabel) : null;
  const regime = props.regime;
  const regimeColour = isRegimeKey(regime) ? REGIME_HEX_COLORS[regime] : palette.text;
  const regimeInk = isRegimeKey(regime) ? palette.conditionInk[regime] : palette.text;
  const confidenceInk = props.confidenceLabel === "HIGH" ? palette.text : palette.crossed;
  const callSizes = landscape ? [54, 50, 46, 42, 38, 34, 30] : portrait ? [80, 72, 66, 60, 54, 48] : [66, 60, 56, 52, 48, 44, 40];
  const callHeight = landscape ? 310 : portrait ? 430 : variant.layout === "standard" ? 200 : 250;
  const callSize = callSizes.find((size) => wrappedLines(decision, size, columnWidth, DISPLAY_EM).length * size * 1.08 <= callHeight)
    ?? callSizes[callSizes.length - 1];
  const readingSize = landscape ? 22 : portrait ? 28 : 24;
  const readingValueSize = landscape ? 40 : portrait ? 104 : 88;
  const valueWidth = Math.max(2, ...readings.map((reading) => reading.value.length)) * (portrait ? 62 : 52);

  return (
    <div style={{
      display: "flex", flexDirection: "column", width: variant.width, height: variant.height,
      padding, background: palette.background, color: palette.text, position: "relative",
      fontFamily: `${OG_FONT_BODY}, ui-sans-serif, system-ui, sans-serif`,
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, background: regimeColour }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
        <div style={{ display: "flex", fontSize: 22, fontWeight: 600, letterSpacing: "0.1em", color: palette.muted }}>
          {["WHETHER", toImageSafeText(props.briefLabel ?? "Weekly Brief")].join(" · ").toUpperCase()}
        </div>
        <div style={{ display: "flex", fontSize: 22, color: palette.muted }}>{`Data as of ${toImageSafeText(props.recordDate)}`}</div>
      </div>

      <div style={{ display: "flex", flexDirection: landscape ? "row" : "column", flex: 1, gap: landscape ? 36 : 28, marginTop: 24, justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", width: landscape ? columnWidth : "100%", gap: 16 }}>
          <div style={{ display: "flex" }}>
            <div style={{
              display: "flex", padding: "8px 14px", borderRadius: 2, border: `2px solid ${regimeColour}`,
              fontSize: 26, fontWeight: 700, letterSpacing: "0.06em", color: regimeInk,
              fontFamily: `${OG_FONT_STAMP}, ui-sans-serif, system-ui, sans-serif`,
            }}>{getRegimePublicLabel(props.regime).toUpperCase()}</div>
          </div>
          {context ? <div style={{ display: "flex", fontSize: 22, lineHeight: 1.25, color: palette.secondary }}>{context}</div> : null}
          <div style={{
            display: "flex", fontSize: callSize, lineHeight: 1.08, fontWeight: 700, letterSpacing: "-0.01em",
            fontFamily: `${OG_FONT_DISPLAY}, ui-sans-serif, system-ui, sans-serif`,
          }}>{decision}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: landscape ? columnWidth : "100%", gap: 12, justifyContent: landscape ? "center" : "flex-end" }}>
          {readings.map((reading) => {
            const detail = [reading.line, reading.distance, reading.previous].filter((part) => part !== null).join(" · ");
            return (
              <div key={reading.metric} style={{
                display: "flex", flexDirection: landscape ? "column" : "row", alignItems: landscape ? "stretch" : "center",
                gap: landscape ? 4 : 24, padding: landscape ? "12px 18px" : "16px 24px", borderRadius: 4,
                background: palette.panel, border: `1px solid ${palette.border}`,
              }}>
                {landscape ? null : <div style={{ display: "flex", justifyContent: "flex-end", width: valueWidth, flexShrink: 0, fontSize: readingValueSize, lineHeight: 1, fontWeight: 600 }}>{reading.value}</div>}
                <div style={{ display: "flex", flexDirection: "column", ...(landscape ? {} : { flex: 1 }), minWidth: 0, gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", fontSize: landscape ? 28 : 32, fontWeight: 600 }}>{reading.label}</div>
                    {landscape ? <div style={{ display: "flex", fontSize: readingValueSize, lineHeight: 1, fontWeight: 600 }}>{reading.value}</div> : null}
                  </div>
                  <div style={{ display: "flex", fontSize: readingSize, lineHeight: 1.2, color: palette.muted }}>{reading.meaning}</div>
                  <div style={{ display: "flex", fontSize: readingSize, lineHeight: 1.2, color: palette.secondary }}>{detail}</div>
                  {reading.resume ? <div style={{ display: "flex", fontSize: readingSize, lineHeight: 1.2, color: palette.muted }}>{reading.resume}</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <div style={{ display: "flex", padding: "4px 12px", borderRadius: 2, border: `1px solid ${confidenceInk}`, color: confidenceInk, fontSize: 22, fontWeight: 600, letterSpacing: "0.04em" }}>
            {toImageSafeText(formatMarginBand(props.confidenceLabel)).toUpperCase()}
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: palette.secondary }}>whether.work</div>
        </div>
        {props.sourceLabel ? <div style={{ display: "flex", fontSize: 22, lineHeight: 1.2, color: palette.muted }}>{`Source: ${toImageSafeText(props.sourceLabel)}`}</div> : null}
      </div>
    </div>
  );
};

export const renderBriefImage = (
  props: BriefImageProps,
  variant: BriefImageVariant = parseBriefImageVariant(new URLSearchParams()),
): ReactElement => variant.layout === "standard"
  ? renderStandardBriefImage(props, variant.theme === "light" ? LIGHT_PALETTE : DARK_PALETTE)
  : renderVariantBriefImage(props, variant);
