import type { CSSProperties, ReactElement } from "react";
import { scoreReadingDetail, type ScoreReadingParts } from "../export/scoreReference";
import { getRegimePublicLabel, isRegimeKey } from "../regimePresentation";
import { formatMarginStamp } from "../report/reportFormatting";
import { OG_FONT_BODY, OG_FONT_DISPLAY, OG_FONT_STAMP, toImageSafeText } from "./ogFonts";
import { OG_BG, OG_SKY, OG_SKY_PAPER, OG_TEXT, OG_TEXT_MUTED, ogSkyGround } from "./ogTheme";
import { SANS_EM, DISPLAY_EM, fitLines, wrappedLines } from "./textFit";

export type BriefImageProps = {
  /** The call: this week's do-now line. */
  decision: string;
  /** The engine key; it picks the weather word and its colour. */
  regime: string;
  /** Both scores with the earlier reading, dated, and what would change things (`buildScoreReadings`). */
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
 * the footer, chip row then source line (14 + 40 + 8 + 28) come to 769px. A
 * reading draws two lines since 2026-11-03 (its restart line no longer takes a
 * third), so that is a ceiling now.
 *
 * The card sits on the week's sky since 2026-11-17, as the homepage's first
 * screen does (`OG_SKY`, lib/image/ogTheme.ts): the condition is the ground, its
 * word is set boxless in the display voice, and the two readings and the margin
 * stamp stand on paper. It was the flat page colour under an 8px rule, with the
 * word in a ruled box, so every week's card was the same picture at feed size;
 * the light card also still wore the green paper the site left on 2026-11-12.
 * The word takes the stamp's rows (22 + 54 above), so the budget is unchanged.
 */
const WIDTH = 1200;
const HEIGHT = 800;
const PAD_X = 56;
const CONTENT_WIDTH = WIDTH - PAD_X * 2;
const CALL_SIZES = [56, 50, 46, 42] as const;
const MAX_CALL_LINES = 3;
/* The value is set at 84px in the figure face, Bricolage Grotesque 800 as on the site
   (.type-figure), where the widest digit (0 and 8) is 0.639em, 54px; both rows share
   one column, sized for the longer value, so their labels start on one edge. */
const VALUE_SIZE = 84;
const VALUE_GLYPH_WIDTH = 54;
/* The source has a line of its own under the chip: the label names three inputs, and
   "Source: " takes about 90px of the row. */
const SOURCE_WIDTH = CONTENT_WIDTH - 90;
/* The weather word takes up to about 220px of its row ("Freezing" at 44px); the scope beside it gets the rest, on one line. */
const CONTEXT_WIDTH = CONTENT_WIDTH - 230;
const WEATHER_SIZE = 44;

/**
 * What a card is painted with: the sky and its two inks for everything set on it, and
 * the paper the readings and the margin stamp stand on. A reading that names no
 * condition gets the theme's plain ground and inks.
 */
type CardPalette = {
  ground: string;
  ink: string;
  muted: string;
  paper: { panel: string; border: string; text: string; secondary: string; muted: string; crossed: string };
};

const PLAIN_GROUND = {
  dark: { ground: OG_BG, ink: OG_TEXT, muted: OG_TEXT_MUTED },
  /* The light theme's page and inks (--bg-body, --app-text, --app-text-muted in tokens.css). */
  light: { ground: "#eef1f6", ink: "#0f1419", muted: "#4a5568" },
} as const;

const cardPalette = (theme: BriefImageTheme, regime: string): CardPalette => {
  const sky = isRegimeKey(regime) ? OG_SKY[theme][regime] : null;
  const plain = PLAIN_GROUND[theme];
  return {
    ground: ogSkyGround(sky, plain.ground),
    ink: sky?.ink ?? plain.ink,
    muted: sky?.muted ?? plain.muted,
    paper: OG_SKY_PAPER[theme],
  };
};

/* A wide margin is the clear state (the ink); a medium or narrow one is close
   to a line, the crossed state's red, as the site prints it. */
const confidenceColor = (label: string, palette: CardPalette) => (label === "HIGH" ? palette.paper.text : palette.paper.crossed);

/* The condition, as the site's first screen sets it: a word in the display voice on the sky, no box. */
const weatherWord = (regime: string, palette: CardPalette): ReactElement => (
  <div
    style={{
      display: "flex",
      color: palette.ink,
      fontSize: WEATHER_SIZE,
      fontWeight: 700,
      fontFamily: `${OG_FONT_STAMP}, ui-sans-serif, system-ui, sans-serif`,
      letterSpacing: "-0.02em",
      lineHeight: 1.16,
    }}
  >
    {getRegimePublicLabel(regime)}
  </div>
);

/* How much room the reading has, as a stamp: sharp-cornered, on paper, in the line's ink (§XIV). */
const marginStamp = (label: string, palette: CardPalette): ReactElement => {
  const ink = confidenceColor(label, palette);
  return (
    <div
      style={{
        display: "flex",
        padding: "4px 14px",
        borderRadius: 4,
        backgroundColor: palette.paper.panel,
        border: `1px solid ${ink}`,
        color: ink,
        fontSize: 22,
        fontWeight: 600,
        letterSpacing: "0.06em",
      }}
    >
      {toImageSafeText(formatMarginStamp(label)).toUpperCase()}
    </div>
  );
};

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
const readingRow = (reading: ScoreReadingParts, valueWidth: number, palette: CardPalette["paper"]) => {
  /* The order every surface prints: the earlier reading, then what would change things. */
  const detail = scoreReadingDetail(reading);
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
          fontWeight: 700,
          fontFamily: `${OG_FONT_STAMP}, ui-sans-serif, system-ui, sans-serif`,
          letterSpacing: "-0.03em",
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
  previous: reading.previous === null ? null : toImageSafeText(reading.previous),
  condition: toImageSafeText(reading.condition),
});

const renderStandardBriefImage = (props: BriefImageProps, palette: CardPalette): ReactElement => {
  /* One stray glyph outside the faces' subset aborts the whole render, so
     everything headed for the canvas goes through toImageSafeText. */
  const decision = toImageSafeText(props.decision);
  const recordDate = toImageSafeText(props.recordDate);
  const contextLabel = props.contextLabel === undefined ? undefined : toImageSafeText(props.contextLabel);
  const sourceLabel = props.sourceLabel === undefined ? undefined : toImageSafeText(props.sourceLabel);
  const readings = props.readings.map(toImageSafeReading);

  const call = layoutCall(decision);
  const valueWidth = Math.max(2, ...readings.map((reading) => reading.value.length)) * VALUE_GLYPH_WIDTH;
  const eyebrow = ["WHETHER", toImageSafeText(props.briefLabel ?? "Weekly Brief")].join(" \u00b7 ").toUpperCase();
  const source = sourceLabel ? `Source: ${fitLines(sourceLabel, 22, SOURCE_WIDTH, SANS_EM, 1)}` : "";
  const context = contextLabel ? fitLines(contextLabel, 22, CONTEXT_WIDTH, SANS_EM, 1) : "";

  return (
    <div style={{ ...frameStyle, background: palette.ground, color: palette.ink }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", fontSize: 22, fontWeight: 600, letterSpacing: "0.12em", color: palette.muted }}>
          {eyebrow}
        </div>
        <div style={{ display: "flex", fontSize: 22, color: palette.muted }}>{`Data as of ${recordDate}`}</div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 22 }}>
        {weatherWord(props.regime, palette)}
        {context ? <div style={{ display: "flex", fontSize: 22, fontWeight: 600, color: palette.ink }}>{context}</div> : null}
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
        {readings.map((reading) => readingRow(reading, valueWidth, palette.paper))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {marginStamp(props.confidenceLabel, palette)}
          <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: palette.ink }}>whether.work</div>
        </div>
        {source ? <div style={{ display: "flex", fontSize: 22, color: palette.muted }}>{source}</div> : null}
      </div>
    </div>
  );
};

/** The same complete reading, reflowed rather than cropped for each destination. */
const renderVariantBriefImage = (props: BriefImageProps, variant: BriefImageVariant): ReactElement => {
  const palette = cardPalette(variant.theme, props.regime);
  const paper = palette.paper;
  const landscape = variant.layout === "landscape";
  const portrait = variant.layout === "portrait";
  const padding = landscape ? 40 : 48;
  const contentWidth = variant.width - padding * 2;
  const columnWidth = landscape ? (contentWidth - 36) / 2 : contentWidth;
  const readings = props.readings.map(toImageSafeReading);
  const decision = toImageSafeText(props.decision);
  const context = props.contextLabel ? toImageSafeText(props.contextLabel) : null;
  const callSizes = landscape ? [54, 50, 46, 42, 38, 34, 30] : portrait ? [80, 72, 66, 60, 54, 48] : [66, 60, 56, 52, 48, 44, 40];
  const callHeight = landscape ? 310 : portrait ? 430 : variant.layout === "standard" ? 200 : 250;
  const callSize = callSizes.find((size) => wrappedLines(decision, size, columnWidth, DISPLAY_EM).length * size * 1.08 <= callHeight)
    ?? callSizes[callSizes.length - 1];
  const readingSize = landscape ? 22 : portrait ? 28 : 24;
  const readingValueSize = landscape ? 40 : portrait ? 104 : 88;
  const valueWidth = Math.max(2, ...readings.map((reading) => reading.value.length)) * (portrait ? 62 : 52);
  const figureFace = `${OG_FONT_STAMP}, ui-sans-serif, system-ui, sans-serif`;

  return (
    <div style={{
      display: "flex", flexDirection: "column", width: variant.width, height: variant.height,
      padding, background: palette.ground, color: palette.ink, position: "relative",
      fontFamily: `${OG_FONT_BODY}, ui-sans-serif, system-ui, sans-serif`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
        <div style={{ display: "flex", fontSize: 22, fontWeight: 600, letterSpacing: "0.1em", color: palette.muted }}>
          {["WHETHER", toImageSafeText(props.briefLabel ?? "Weekly Brief")].join(" · ").toUpperCase()}
        </div>
        <div style={{ display: "flex", fontSize: 22, color: palette.muted }}>{`Data as of ${toImageSafeText(props.recordDate)}`}</div>
      </div>

      <div style={{ display: "flex", flexDirection: landscape ? "row" : "column", flex: 1, gap: landscape ? 36 : 28, marginTop: 24, justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", width: landscape ? columnWidth : "100%", gap: 16 }}>
          <div style={{ display: "flex" }}>{weatherWord(props.regime, palette)}</div>
          {context ? <div style={{ display: "flex", fontSize: 22, lineHeight: 1.25, color: palette.muted }}>{context}</div> : null}
          <div style={{
            display: "flex", fontSize: callSize, lineHeight: 1.08, fontWeight: 700, letterSpacing: "-0.01em",
            fontFamily: `${OG_FONT_DISPLAY}, ui-sans-serif, system-ui, sans-serif`,
          }}>{decision}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: landscape ? columnWidth : "100%", gap: 12, justifyContent: landscape ? "center" : "flex-end" }}>
          {readings.map((reading) => {
            const detail = scoreReadingDetail(reading);
            return (
              <div key={reading.metric} style={{
                display: "flex", flexDirection: landscape ? "column" : "row", alignItems: landscape ? "stretch" : "center",
                gap: landscape ? 4 : 24, padding: landscape ? "12px 18px" : "16px 24px", borderRadius: 8,
                background: paper.panel, border: `1px solid ${paper.border}`, color: paper.text,
              }}>
                {landscape ? null : <div style={{ display: "flex", justifyContent: "flex-end", width: valueWidth, flexShrink: 0, fontSize: readingValueSize, lineHeight: 1, fontWeight: 700, fontFamily: figureFace, letterSpacing: "-0.03em" }}>{reading.value}</div>}
                <div style={{ display: "flex", flexDirection: "column", ...(landscape ? {} : { flex: 1 }), minWidth: 0, gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", fontSize: landscape ? 28 : 32, fontWeight: 600 }}>{reading.label}</div>
                    {landscape ? <div style={{ display: "flex", fontSize: readingValueSize, lineHeight: 1, fontWeight: 700, fontFamily: figureFace, letterSpacing: "-0.03em" }}>{reading.value}</div> : null}
                  </div>
                  <div style={{ display: "flex", fontSize: readingSize, lineHeight: 1.2, color: paper.muted }}>{reading.meaning}</div>
                  <div style={{ display: "flex", fontSize: readingSize, lineHeight: 1.2, color: paper.secondary }}>{detail}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          {marginStamp(props.confidenceLabel, palette)}
          <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: palette.ink }}>whether.work</div>
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
  ? renderStandardBriefImage(props, cardPalette(variant.theme, props.regime))
  : renderVariantBriefImage(props, variant);
