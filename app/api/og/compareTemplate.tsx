import type { CSSProperties, ReactElement } from "react";
import type { RegimeKey } from "../../../lib/regimeEngine";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import { REGIME_HEX_COLORS } from "../../../lib/regimePhaseSpace";
import { OPERATING_LATITUDE_LABEL } from "../../../lib/report/reportCopy";
import { regimeSignalLabel } from "../../../lib/report/signalTranslations";

/* The card is shared cold, so it uses the page's names: never "Boldness" or
   the bond desk's "10Y−2Y". A spread's move is in percentage points. */
const RECESSION_GAUGE_NAME = regimeSignalLabel.curveSlope;
import {
  GlyphMotif,
  OG_BG,
  OG_BORDER,
  OG_BORDER_STRONG,
  OG_CONDITION_INK,
  OG_FONT_BODY,
  OG_FONT_DISPLAY,
  OG_LINE_CROSSED,
  OG_PANEL,
  OG_TEXT,
  OG_TEXT_MUTED,
} from "./ogTheme";

export type CompareEpoch = {
  label: string;
  regime: RegimeKey;
  postureLabel: string;
  tightness: number | null;
  boldnessScore: number | null;
  curveSpread: number | null;
};

export type CompareOgImageProps = {
  eyebrow?: string;
  headline: string;
  epochA: CompareEpoch;
  epochB: CompareEpoch;
};

/* The site's four hues, not a local table that had Stormy amber and Cloudy sky. */
const regimeAccent = REGIME_HEX_COLORS;

/* "Sunny for 9 months" already names the conditions; "Freezing" alone would print
   "Freezing — Freezing" under a naive join. */
const epochTitle = (epoch: CompareEpoch) => {
  const conditions = getRegimePublicLabel(epoch.regime);
  return epoch.postureLabel.startsWith(conditions) ? epoch.postureLabel : `${conditions} — ${epoch.postureLabel}`;
};

const formatPercent = (value: number | null, decimals = 2) =>
  value === null || !Number.isFinite(value) ? "n/a" : `${value.toFixed(decimals)}%`;

const formatScore = (value: number | null) =>
  value === null || !Number.isFinite(value) ? "n/a" : value.toFixed(0);

const frameStyle: CSSProperties = {
  display: "flex",
  position: "relative",
  width: "100%",
  height: "100%",
  padding: "28px",
  background: OG_BG,
  color: OG_TEXT,
  fontFamily: `${OG_FONT_BODY}, ui-sans-serif, system-ui, sans-serif`,
};

const blockStyle: CSSProperties = {
  display: "flex",
  flex: 1,
  flexDirection: "column",
  gap: 12,
  padding: "20px 22px",
  borderRadius: 10,
  background: OG_PANEL,
  border: `1px solid ${OG_BORDER}`,
};

const metricRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 8,
};

const metricLabelStyle: CSSProperties = {
  display: "flex",
  fontSize: 14,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: OG_TEXT_MUTED,
};

const metricValueStyle: CSSProperties = {
  display: "flex",
  fontSize: 24,
  fontWeight: 700,
  color: OG_TEXT,
};

export const renderCompareOgImage = ({
  eyebrow = "Compare periods",
  headline,
  epochA,
  epochB,
}: CompareOgImageProps): ReactElement => {
  const accentA = regimeAccent[epochA.regime];
  const accentB = regimeAccent[epochB.regime];

  return (
    <div style={frameStyle}>
      <div
        style={{
          display: "flex",
          position: "relative",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "26px 28px 0",
          borderRadius: 12,
          border: `1px solid ${OG_BORDER}`,
          background: OG_BG,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", position: "absolute", top: 0, left: 0, right: 0, height: 6, background: OG_BORDER_STRONG }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <GlyphMotif tone={accentB} size={28} />
          <div style={{ display: "flex", fontSize: 15, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: OG_TEXT_MUTED }}>
            {eyebrow}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 40, lineHeight: 1.14, fontWeight: 700, fontFamily: `${OG_FONT_DISPLAY}, ui-sans-serif, system-ui, sans-serif`, letterSpacing: "-0.01em", marginTop: 16 }}>
          {headline}
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 18, marginTop: 22 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <EpochBlock label="Period A" accent={accentA} epoch={epochA} />
            <EpochBlock label="Period B" accent={accentB} epoch={epochB} />
          </div>
          <div style={{ display: "flex", gap: 32, alignItems: "baseline" }}>
            <div style={{ ...metricRowStyle, gap: 12 }}>
              <span style={metricLabelStyle}>{`${OPERATING_LATITUDE_LABEL}, A against B`}</span>
              <LatitudeDelta epochA={epochA} epochB={epochB} />
            </div>
            <div style={{ ...metricRowStyle, gap: 12 }}>
              <span style={metricLabelStyle}>{`${RECESSION_GAUGE_NAME}, A against B`}</span>
              <CurveDelta epochA={epochA} epochB={epochB} />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 18, color: OG_TEXT_MUTED, padding: "0 0 22px" }}>
          Whether — weekly operating guidance
        </div>
      </div>
    </div>
  );
};

const EpochBlock = ({ label, accent, epoch }: { label: string; accent: string; epoch: CompareEpoch }) => (
  <div style={{ ...blockStyle, border: `1px solid ${accent}66` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ display: "flex", width: 8, height: 8, borderRadius: 8, background: accent }} />
      <span style={{ display: "flex", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: OG_CONDITION_INK[epoch.regime] }}>{label}</span>
      <span style={{ display: "flex", flex: 1 }} />
      <span style={{ display: "flex", fontSize: 13, color: OG_TEXT_MUTED }}>{epoch.label}</span>
    </div>
    <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: OG_TEXT, lineHeight: 1.2 }}>
      {epochTitle(epoch)}
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
      <div style={metricRowStyle}>
        <span style={metricLabelStyle}>Funding pressure</span>
        <span style={metricValueStyle}>{formatScore(epoch.tightness)}</span>
      </div>
      <div style={metricRowStyle}>
        <span style={metricLabelStyle}>{OPERATING_LATITUDE_LABEL}</span>
        <span style={metricValueStyle}>{formatScore(epoch.boldnessScore)}</span>
      </div>
      <div style={metricRowStyle}>
        <span style={metricLabelStyle}>{RECESSION_GAUGE_NAME}</span>
        <span style={metricValueStyle}>{formatPercent(epoch.curveSpread)}</span>
      </div>
    </div>
  </div>
);

const LatitudeDelta = ({ epochA, epochB }: { epochA: CompareEpoch; epochB: CompareEpoch }) => {
  const a = epochA.boldnessScore;
  const b = epochB.boldnessScore;
  if (a === null || b === null) {
    return <span style={metricValueStyle}>n/a</span>;
  }
  const delta = a - b;
  const tone = delta < 0 ? OG_LINE_CROSSED : OG_TEXT;
  return (
    <span style={{ ...metricValueStyle, color: tone }}>
      {delta > 0 ? "+" : ""}{delta.toFixed(0)} points
    </span>
  );
};

const CurveDelta = ({ epochA, epochB }: { epochA: CompareEpoch; epochB: CompareEpoch }) => {
  const a = epochA.curveSpread;
  const b = epochB.curveSpread;
  if (a === null || b === null) {
    return <span style={metricValueStyle}>n/a</span>;
  }
  const delta = a - b;
  const tone = delta < 0 ? OG_LINE_CROSSED : OG_TEXT;
  return (
    <span style={{ ...metricValueStyle, color: tone }}>
      {delta > 0 ? "+" : ""}{delta.toFixed(2)} percentage points
    </span>
  );
};
