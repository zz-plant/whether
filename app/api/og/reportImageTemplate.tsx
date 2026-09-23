import type { CSSProperties, ReactElement } from "react";
import type { HomeSharePreview } from "../../../lib/report/homeSharePreview";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { formatConfidenceChipLabel } from "../../../lib/report/reportFormatting";
import { REGIME_HEX_COLORS } from "../../../lib/regimePhaseSpace";
import {
  GlyphMotif,
  OG_BG,
  OG_BORDER,
  OG_FONT_BODY,
  OG_FONT_DISPLAY,
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

/* Only when the card is not this week's live reading, and why. */
const contextTone = (preview: HomeSharePreview) => (preview.isHistorical ? "#f59e0b" : "#fb7185");

const box = (label: string, value: string, labelColor: string, background: string, border: string) => (
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
    <div style={{ display: "flex", fontSize: 25, lineHeight: 1.3, color: OG_TEXT_SECONDARY }}>{value}</div>
  </div>
);

export const renderReportOgImage = (preview: HomeSharePreview): ReactElement => {
  const regimeColor = REGIME_HEX_COLORS[preview.regime];
  /* The card travels furthest of anything the site makes; "MED" is the engine's code, not a word. */
  const confidence = formatConfidenceChipLabel(preview.confidenceLabel);
  const headlineSize = preview.headline.length > 70 ? 54 : 62;

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
            letterSpacing: "0.1em",
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
          fontSize: headlineSize,
          lineHeight: 1.06,
          fontWeight: 600,
          fontFamily: `${OG_FONT_DISPLAY}, Georgia, serif`,
          letterSpacing: "-0.01em",
        }}
      >
        {preview.headline}
      </div>
      <div style={{ display: "flex", marginTop: 14, fontSize: 27, lineHeight: 1.3, color: OG_TEXT_SECONDARY }}>
        {preview.whyItMatters}
      </div>

      <div style={{ display: "flex", flex: 1 }} />

      <div style={{ display: "flex", gap: 16 }}>
        {box("What changed", preview.changeSummary, OG_TEXT_MUTED, OG_PANEL, `1px solid ${OG_BORDER}`)}
        {box(DECISION_CONTRACT_LABELS.watch.postureFlips, preview.flipCondition, "#fcd34d", "#3b2d0b", "1px solid #f59e0b55")}
      </div>

      {/* Single expression on purpose: satori rejects a div holding mixed text
          and expression children unless it declares flex. */}
      <div style={{ display: "flex", marginTop: 16, fontSize: 20, color: OG_TEXT_MUTED }}>
        {`${confidence} · Source: ${preview.sourceLabel}`}
      </div>
    </div>
  );
};
