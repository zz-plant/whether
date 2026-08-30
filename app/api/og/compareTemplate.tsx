import type { CSSProperties, ReactElement } from "react";
import type { RegimeKey } from "../../../lib/regimeEngine";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import {
  GlyphMotif,
  OG_BG,
  OG_BORDER,
  OG_FONT_BODY,
  OG_FONT_DISPLAY,
  OG_PANEL,
  OG_RAISED,
  OG_TEXT,
  OG_TEXT_MUTED,
  OG_TEXT_SECONDARY,
} from "./ogTheme";

export type CompareEpoch = {
  label: string;
  recordDate: string;
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

const regimeAccent: Record<RegimeKey, string> = {
  EXPANSION: "#34d399",
  VOLATILE: "#fbbf24",
  DEFENSIVE: "#38bdf8",
  SCARCITY: "#fb7185",
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
  fontSize: 12,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: OG_TEXT_MUTED,
};

const metricValueStyle: CSSProperties = {
  display: "flex",
  fontSize: 18,
  fontWeight: 700,
  color: OG_TEXT,
};

export const renderCompareOgImage = ({
  eyebrow = "Epoch Comparison",
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
        <div style={{ display: "flex", position: "absolute", top: 0, left: 0, right: 0, height: 6, background: "#a78bfa" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <GlyphMotif tone={accentB} size={28} />
          <div style={{ display: "flex", fontSize: 15, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: OG_TEXT_MUTED }}>
            {eyebrow}
          </div>
          <div style={{ display: "flex", flex: 1 }} />
          <div style={{ display: "flex", fontSize: 13, fontWeight: 600, color: OG_TEXT_MUTED }}>
            {`${epochA.recordDate} » ${epochB.recordDate}`}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 34, lineHeight: 1.14, fontWeight: 600, fontFamily: `${OG_FONT_DISPLAY}, Georgia, serif`, letterSpacing: "-0.01em", marginTop: 12 }}>
          {headline}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <EpochBlock label="Epoch A" accent={accentA} epoch={epochA} />
            <EpochBlock label="Epoch B" accent={accentB} epoch={epochB} />
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
            <div style={metricRowStyle}>
              <span style={metricLabelStyle}>Boldness delta</span>
              <BoldnessDelta epochA={epochA} epochB={epochB} />
            </div>
            <div style={metricRowStyle}>
              <span style={metricLabelStyle}>Yield-curve delta</span>
              <CurveDelta epochA={epochA} epochB={epochB} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EpochBlock = ({ label, accent, epoch }: { label: string; accent: string; epoch: CompareEpoch }) => (
  <div style={{ ...blockStyle, border: `1px solid ${accent}66` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ display: "flex", width: 8, height: 8, borderRadius: 8, background: accent }} />
      <span style={{ display: "flex", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: accent }}>{label}</span>
      <span style={{ display: "flex", flex: 1 }} />
      <span style={{ display: "flex", fontSize: 13, color: OG_TEXT_MUTED }}>{epoch.label}</span>
    </div>
    <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: OG_TEXT, lineHeight: 1.2 }}>
      {getRegimePublicLabel(epoch.regime)} — {epoch.postureLabel}
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
      <div style={metricRowStyle}>
        <span style={metricLabelStyle}>Tightness</span>
        <span style={metricValueStyle}>{formatScore(epoch.tightness)}</span>
      </div>
      <div style={metricRowStyle}>
        <span style={metricLabelStyle}>Boldness</span>
        <span style={metricValueStyle}>{formatScore(epoch.boldnessScore)}</span>
      </div>
      <div style={metricRowStyle}>
        <span style={metricLabelStyle}>10Y−2Y</span>
        <span style={metricValueStyle}>{formatPercent(epoch.curveSpread)}</span>
      </div>
    </div>
  </div>
);

const BoldnessDelta = ({ epochA, epochB }: { epochA: CompareEpoch; epochB: CompareEpoch }) => {
  const a = epochA.boldnessScore;
  const b = epochB.boldnessScore;
  if (a === null || b === null) {
    return <span style={metricValueStyle}>n/a</span>;
  }
  const delta = a - b;
  const tone = delta === 0 ? OG_TEXT : delta > 0 ? "#34d399" : "#fb7185";
  return (
    <span style={{ ...metricValueStyle, color: tone }}>
      {delta > 0 ? "+" : ""}{delta.toFixed(0)}
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
  const tone = delta === 0 ? OG_TEXT : delta > 0 ? "#34d399" : "#fb7185";
  return (
    <span style={{ ...metricValueStyle, color: tone }}>
      {delta > 0 ? "+" : ""}{delta.toFixed(2)}%
    </span>
  );
};
