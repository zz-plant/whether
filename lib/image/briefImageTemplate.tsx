import type { CSSProperties, ReactElement } from "react";
import type { ScoreReadingParts } from "../export/scoreReference";
import { REGIME_HEX_COLORS } from "../regimePhaseSpace";
import { getRegimePublicLabel, isRegimeKey } from "../regimePresentation";
import { formatConfidenceChipLabel } from "../report/reportFormatting";
import { OG_FONT_BODY, OG_FONT_DISPLAY, toImageSafeText } from "./ogFonts";
import { OG_ACCENT, OG_BG, OG_BORDER, OG_PANEL, OG_TEXT, OG_TEXT_MUTED, OG_TEXT_SECONDARY } from "./ogTheme";
import { SANS_EM, SERIF_EM, fitLines, wrappedLines } from "./textFit";

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

const confidenceColor = (label: string) =>
  label === "HIGH" ? "#34d399" : label === "MED" ? "#fbbf24" : "#f87171";

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
    CALL_SIZES.find((candidate) => wrappedLines(decision, candidate, CONTENT_WIDTH, SERIF_EM).length <= MAX_CALL_LINES) ??
    CALL_SIZES[CALL_SIZES.length - 1];
  return { size, text: fitLines(decision, size, CONTENT_WIDTH, SERIF_EM, MAX_CALL_LINES) };
};

/*
 * Every div that holds an element or a list carries an explicit display: satori
 * throws mid-render on one that does not, which surfaces as a 200 with an empty
 * body rather than an error. So text that reads as one line is built as one
 * string here instead of several adjacent JSX children.
 */
const readingRow = (reading: ScoreReadingParts, valueWidth: number) => {
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
        background: OG_PANEL,
        border: `1px solid ${OG_BORDER}`,
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
          color: OG_TEXT,
        }}
      >
        {reading.value}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 4 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: OG_TEXT }}>{reading.label}</div>
          <div style={{ display: "flex", fontSize: 24, color: OG_TEXT_MUTED }}>{reading.meaning}</div>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: OG_TEXT_SECONDARY }}>{detail}</div>
        {reading.resume ? (
          <div style={{ display: "flex", fontSize: 24, color: OG_TEXT_MUTED }}>{reading.resume}</div>
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

export const renderBriefImage = (props: BriefImageProps): ReactElement => {
  /* One stray glyph outside the faces' subset aborts the whole render, so
     everything headed for the canvas goes through toImageSafeText. */
  const decision = toImageSafeText(props.decision);
  const recordDate = toImageSafeText(props.recordDate);
  const contextLabel = props.contextLabel === undefined ? undefined : toImageSafeText(props.contextLabel);
  const sourceLabel = props.sourceLabel === undefined ? undefined : toImageSafeText(props.sourceLabel);
  const readings = props.readings.map(toImageSafeReading);

  const regimeColor = isRegimeKey(props.regime) ? REGIME_HEX_COLORS[props.regime] : OG_ACCENT;
  const weather = getRegimePublicLabel(props.regime).toUpperCase();
  const call = layoutCall(decision);
  const valueWidth = Math.max(2, ...readings.map((reading) => reading.value.length)) * VALUE_GLYPH_WIDTH;
  const eyebrow = ["WHETHER", toImageSafeText(props.briefLabel ?? "Weekly Brief")].join(" \u00b7 ").toUpperCase();
  /* The card that lands in someone else's Slack channel said "MED CONFIDENCE".
     The colour keys off the raw code, which is what the engine stores; only
     the words a reader sees change. */
  const confidenceColour = confidenceColor(props.confidenceLabel);
  const confidenceBadge = toImageSafeText(formatConfidenceChipLabel(props.confidenceLabel)).toUpperCase();
  const source = sourceLabel ? `Source: ${fitLines(sourceLabel, 22, SOURCE_WIDTH, SANS_EM, 1)}` : "";
  const context = contextLabel ? fitLines(contextLabel, 22, CONTEXT_WIDTH, SANS_EM, 1) : "";

  return (
    <div style={frameStyle}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, background: regimeColor }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", fontSize: 22, fontWeight: 600, letterSpacing: "0.12em", color: OG_TEXT_MUTED }}>
          {eyebrow}
        </div>
        <div style={{ display: "flex", fontSize: 22, color: OG_TEXT_MUTED }}>{`Data as of ${recordDate}`}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 22 }}>
        <div
          style={{
            display: "flex",
            padding: "8px 16px",
            borderRadius: 4,
            border: `2px solid ${regimeColor}`,
            color: regimeColor,
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: "0.1em",
          }}
        >
          {weather}
        </div>
        {context ? <div style={{ display: "flex", fontSize: 22, fontWeight: 600, color: OG_ACCENT }}>{context}</div> : null}
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 14,
          fontSize: call.size,
          lineHeight: 1.1,
          fontWeight: 600,
          fontFamily: `${OG_FONT_DISPLAY}, Georgia, serif`,
          letterSpacing: "-0.01em",
        }}
      >
        {call.text}
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 20 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {readings.map((reading) => readingRow(reading, valueWidth))}
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
          <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: OG_TEXT_SECONDARY }}>whether.work</div>
        </div>
        {source ? <div style={{ display: "flex", fontSize: 22, color: OG_TEXT_MUTED }}>{source}</div> : null}
      </div>
    </div>
  );
};
