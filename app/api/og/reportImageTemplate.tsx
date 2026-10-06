import type { CSSProperties, ReactElement } from "react";
import type { HomeSharePreview } from "../../../lib/report/homeSharePreview";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { formatConfidenceChipLabel } from "../../../lib/report/reportFormatting";
import { REGIME_HEX_COLORS } from "../../../lib/regimePhaseSpace";
import { SANS_EM, DISPLAY_EM, fitLines, wrappedLines } from "../../../lib/image/textFit";
import {
  GlyphMotif,
  OG_BG,
  OG_BORDER,
  OG_FONT_BODY,
  OG_FONT_DISPLAY,
  OG_FONT_STAMP,
  OG_PANEL,
  OG_TEXT,
  OG_TEXT_MUTED,
  OG_TEXT_SECONDARY,
} from "./ogTheme";

/*
 * The weekly card, drawn for the size it is seen at.
 *
 * A feed shows this at roughly 500px wide, so everything on it prints at about
 * 40% of its drawn size. It carried twelve boxes and chips with most labels at
 * 13–17px — about 6px in a feed — so the headline was the only readable thing
 * and the rest read as clutter: two trend chips saying the same thing
 * ("Deteriorating", "Worse than last week"), an audience chip, two raw yield
 * tiles and a freshness line with a UTC timestamp. What remains is what a
 * reader decides on: the conditions, the call, why, what moved, and what would
 * change it, with nothing smaller than 22px.
 */
const frameStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100%",
  padding: "44px 56px 38px",
  background: OG_BG,
  color: OG_TEXT,
  fontFamily: `${OG_FONT_BODY}, ui-sans-serif, system-ui, sans-serif`,
  position: "relative",
};

/*
 * The card's height budget. The canvas is 630px and nothing on it scrolls, and
 * satori cannot measure text, so a block that wraps further than planned does
 * not push the rest down — it draws over it. Until 2026-09-29 the headline
 * switched size at 70 characters, and the week that shipped a 69-character
 * call ("Conditions are tightening. Freeze new commitments and protect
 * runway.") set it at 62px, where it takes three lines, and its third line
 * sat on top of the sentence under it.
 *
 * So each variable block is sized by estimating its wrap, with the estimate
 * the brief card shares (`lib/image/textFit.ts`, which says why it errs high).
 */
const CONTENT_WIDTH = 1200 - 56 * 2;
const BOX_TEXT_WIDTH = (CONTENT_WIDTH - 16) / 2 - 22 * 2 - 2;
/* The least air between the sentence under the headline and the boxes; the
   spacer between them takes whatever the budget leaves over. */
const BOX_ROW_GAP = 12;
/* What the rows other than the headline, the sentence under it and the boxes
   take: padding (44 + 38), the header row (32), the status chip and its margin
   (26 + 52), the gap above the boxes, and the source line and its margin
   (16 + 24). */
const VARIABLE_HEIGHT = 630 - (44 + 38) - 32 - (26 + 52) - BOX_ROW_GAP - (16 + 24);
const HEADLINE_SIZES = [62, 54, 48, 42] as const;
const BOX_VALUE_SIZES = [25, 22] as const;
const WHY_SIZE = 27;
const MAX_BOX_LINES = 3;
const MAX_WHY_LINES = 2;

type ReportCardLayout = {
  headlineSize: number;
  whyItMatters: string;
  boxValueSize: number;
  changeSummary: string;
  flipCondition: string;
};

/** Sizes and fits the card's variable blocks so their total stays inside the canvas. */
export const layoutReportCard = (
  preview: Pick<HomeSharePreview, "headline" | "whyItMatters" | "changeSummary" | "flipCondition">,
): ReportCardLayout => {
  const boxValueSize =
    BOX_VALUE_SIZES.find((size) =>
      [preview.changeSummary, preview.flipCondition].every(
        (text) => wrappedLines(text, size, BOX_TEXT_WIDTH, SANS_EM).length <= MAX_BOX_LINES,
      ),
    ) ?? BOX_VALUE_SIZES[BOX_VALUE_SIZES.length - 1];
  const changeSummary = fitLines(preview.changeSummary, boxValueSize, BOX_TEXT_WIDTH, SANS_EM, MAX_BOX_LINES);
  const flipCondition = fitLines(preview.flipCondition, boxValueSize, BOX_TEXT_WIDTH, SANS_EM, MAX_BOX_LINES);
  const boxLines = Math.max(
    wrappedLines(changeSummary, boxValueSize, BOX_TEXT_WIDTH, SANS_EM).length,
    wrappedLines(flipCondition, boxValueSize, BOX_TEXT_WIDTH, SANS_EM).length,
  );
  /* Padding (18 + 18), the label (20px at 1.2) and the gap under it (8), a border (2). */
  const boxHeight = 36 + 24 + 8 + 2 + boxLines * boxValueSize * 1.3;

  const whyItMatters = fitLines(preview.whyItMatters, WHY_SIZE, CONTENT_WIDTH, SANS_EM, MAX_WHY_LINES);
  const whyHeight = 14 + wrappedLines(whyItMatters, WHY_SIZE, CONTENT_WIDTH, SANS_EM).length * WHY_SIZE * 1.3;

  const room = VARIABLE_HEIGHT - boxHeight - whyHeight;
  const headlineSize =
    HEADLINE_SIZES.find((size) => {
      const lines = wrappedLines(preview.headline, size, CONTENT_WIDTH, DISPLAY_EM).length;
      return lines <= 3 && 18 + lines * size * 1.06 <= room;
    }) ?? HEADLINE_SIZES[HEADLINE_SIZES.length - 1];

  return { headlineSize, whyItMatters, boxValueSize, changeSummary, flipCondition };
};

/* Only when the card is not this week's live reading, and why. */
const contextTone = (preview: HomeSharePreview) => (preview.isHistorical ? "#f59e0b" : "#fb7185");

const box = (label: string, value: string, valueSize: number, labelColor: string, background: string, border: string) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      flex: 1,
      gap: 8,
      padding: "18px 22px",
      borderRadius: 8,
      background,
      border,
    }}
  >
    <div style={{ display: "flex", fontSize: 20, fontWeight: 600, color: labelColor }}>{label}</div>
    <div style={{ display: "flex", fontSize: valueSize, lineHeight: 1.3, color: OG_TEXT_SECONDARY }}>{value}</div>
  </div>
);

export const renderReportOgImage = (preview: HomeSharePreview): ReactElement => {
  const regimeColor = REGIME_HEX_COLORS[preview.regime];
  /* The card travels furthest of anything the site makes; "MED" is the engine's code, not a word. */
  const confidence = formatConfidenceChipLabel(preview.confidenceLabel);
  const layout = layoutReportCard(preview);

  return (
    <div style={frameStyle}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, background: regimeColor }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <GlyphMotif tone={regimeColor} size={32} />
          <div style={{ display: "flex", fontSize: 22, fontWeight: 600, letterSpacing: "0.12em", color: OG_TEXT_MUTED }}>
            {preview.eyebrow.toUpperCase()}
          </div>
        </div>
        {/* The week-ending Friday (`formatWeekEndingUTC`), not the record date: printed
            bare, a Monday card read "Sep 25" two days before it, which looked like a
            reading from the future. */}
        <div style={{ display: "flex", fontSize: 22, color: OG_TEXT_MUTED }}>{`Week ending ${preview.weekLabel}`}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 26 }}>
        <div
          style={{
            display: "flex",
            padding: "8px 16px",
            borderRadius: 4,
            border: `2px solid ${regimeColor}`,
            color: regimeColor,
            fontSize: 26,
            fontWeight: 700,
            fontFamily: `${OG_FONT_STAMP}, ui-sans-serif, system-ui, sans-serif`,
            letterSpacing: "0.06em",
          }}
        >
          {preview.statusLabel.toUpperCase()}
        </div>
        {preview.contextLabel ? (
          <div style={{ display: "flex", fontSize: 22, fontWeight: 600, color: contextTone(preview) }}>
            {preview.contextLabel}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 18,
          fontSize: layout.headlineSize,
          lineHeight: 1.06,
          fontWeight: 700,
          fontFamily: `${OG_FONT_DISPLAY}, ui-sans-serif, system-ui, sans-serif`,
          letterSpacing: "-0.01em",
        }}
      >
        {preview.headline}
      </div>
      <div style={{ display: "flex", marginTop: 14, fontSize: WHY_SIZE, lineHeight: 1.3, color: OG_TEXT_SECONDARY }}>
        {layout.whyItMatters}
      </div>

      <div style={{ display: "flex", flex: 1 }} />

      <div style={{ display: "flex", gap: 16, marginTop: BOX_ROW_GAP }}>
        {box("What changed", layout.changeSummary, layout.boxValueSize, OG_TEXT_MUTED, OG_PANEL, `1px solid ${OG_BORDER}`)}
        {box(DECISION_CONTRACT_LABELS.watch.postureFlips, layout.flipCondition, layout.boxValueSize, "#fcd34d", "#3b2d0b", "1px solid #f59e0b55")}
      </div>

      {/* Single expression on purpose: satori rejects a div holding mixed text
          and expression children unless it declares flex. */}
      <div style={{ display: "flex", marginTop: 16, fontSize: 20, color: OG_TEXT_MUTED }}>
        {`${confidence} · Source: ${preview.sourceLabel}`}
      </div>
    </div>
  );
};
