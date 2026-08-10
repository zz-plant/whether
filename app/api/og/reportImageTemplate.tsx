import type { CSSProperties, ReactElement } from "react";
import type { HomeSharePreview } from "../../../lib/report/homeSharePreview";
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

const frameStyle: CSSProperties = {
  display: "flex",
  position: "relative",
  width: "100%",
  height: "100%",
  padding: "26px",
  background: OG_BG,
  color: OG_TEXT,
  fontFamily: `${OG_FONT_BODY}, ui-sans-serif, system-ui, sans-serif`,
};

const metricToneByConfidence = {
  HIGH: "#34d399",
  MED: "#fbbf24",
  LOW: "#f87171",
} as const;

const contextTone = (preview: HomeSharePreview) => {
  if (preview.isHistorical) {
    return "#f59e0b";
  }

  if (preview.isFallback) {
    return "#fb7185";
  }

  return "#38bdf8";
};

const pill = (label: string, color: string): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  padding: "7px 12px",
  borderRadius: 4,
  border: `1px solid ${color}55`,
  background: `${color}1a`,
  color,
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
});

const metricCard = (label: string, value: string, accent: string) => (
  <div
    style={{
      display: "flex",
      flex: 1,
      flexDirection: "column",
      justifyContent: "space-between",
      minHeight: 96,
      padding: "14px 16px",
      borderRadius: 8,
      background: OG_PANEL,
      border: `1px solid ${OG_BORDER}`,
    }}
  >
    <div style={{ fontSize: 13, fontWeight: 600, color: OG_TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>
      {label}
    </div>
    <div style={{ fontSize: 26, fontWeight: 600, color: accent }}>
      {value}
    </div>
  </div>
);

const detailCard = ({
  label,
  value,
  background,
  border,
  labelColor,
}: {
  label: string;
  value: string;
  background: string;
  border: string;
  labelColor: string;
}) => (
  <div
    style={{
      display: "flex",
      flex: 1,
      flexDirection: "column",
      gap: 8,
      minHeight: 104,
      padding: "16px 18px",
      borderRadius: 8,
      background,
      border,
    }}
  >
    <div style={{ fontSize: 13, fontWeight: 600, color: labelColor, textTransform: "uppercase", letterSpacing: "0.08em" }}>
      {label}
    </div>
    <div style={{ fontSize: 20, lineHeight: 1.26, color: OG_TEXT_SECONDARY }}>
      {value}
    </div>
  </div>
);

export const renderReportOgImage = (preview: HomeSharePreview): ReactElement => {
  const tone = contextTone(preview);
  const confidenceTone = metricToneByConfidence[preview.confidenceLabel];

  return (
    <div style={frameStyle}>
      <div
        style={{
          display: "flex",
          position: "relative",
          width: "100%",
          height: "100%",
          padding: "24px 24px 22px",
          borderRadius: 12,
          border: `1px solid ${OG_BORDER}`,
          background: OG_BG,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: tone,
          }}
        />
        <div
          style={{
            display: "flex",
            width: "100%",
            gap: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: "66%",
              paddingTop: 4,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <GlyphMotif tone={tone} size={30} />
                  <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: OG_TEXT_MUTED }}>
                    {preview.eyebrow}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <div style={pill(preview.audienceLabel, "#e2e8f0")}>{preview.audienceLabel}</div>
                  <div style={pill(preview.contextLabel, tone)}>{preview.contextLabel}</div>
                  <div style={pill(preview.weekLabel, "#cbd5e1")}>{preview.weekLabel}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 52, lineHeight: 1.06, fontWeight: 600, fontFamily: `${OG_FONT_DISPLAY}, Georgia, serif`, letterSpacing: "-0.01em" }}>
                  {preview.headline}
                </div>
                <div style={{ fontSize: 22, lineHeight: 1.28, color: OG_TEXT_SECONDARY }}>
                  {preview.whyItMatters}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <div style={pill(preview.statusLabel, tone)}>{preview.statusLabel}</div>
                  <div style={pill(`${preview.confidenceLabel} confidence`, confidenceTone)}>{preview.confidenceLabel} confidence</div>
                </div>
              </div>
            </div>
            {/* Satori has no display:grid — rows of flex:1 cards instead.
                Card hues mirror the site's decision semantics in tokens.css:
                neutral, decision-do (emerald), caution (amber), flip (sky). */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 12 }}>
                {detailCard({
                  label: "What Changed",
                  value: preview.changeSummary,
                  background: OG_PANEL,
                  border: `1px solid ${OG_BORDER}`,
                  labelColor: OG_TEXT_MUTED,
                })}
                {detailCard({
                  label: "Do Now",
                  value: preview.immediateDecision,
                  background: "#123023",
                  border: "1px solid #34d39955",
                  labelColor: "#6ee7b7",
                })}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {detailCard({
                  label: "Flip When",
                  value: preview.flipCondition,
                  background: "#3b2d0b",
                  border: "1px solid #f59e0b55",
                  labelColor: "#fcd34d",
                })}
                {detailCard({
                  label: "Operating Stance",
                  value: preview.operatingStanceLine,
                  background: "#0c2536",
                  border: "1px solid #38bdf855",
                  labelColor: "#7dd3fc",
                })}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "16px 18px",
                borderRadius: 8,
                background: OG_PANEL,
                border: `1px solid ${OG_BORDER}`,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: OG_TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Snapshot
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <div style={pill(preview.trendLabel, "#e2e8f0")}>{preview.trendLabel}</div>
                <div style={pill(preview.postureDelta, "#c084fc")}>{preview.postureDelta}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 10 }}>
                {metricCard("Confidence", preview.confidenceLabel, confidenceTone)}
                {metricCard("Trend", preview.trendLabel, "#e2e8f0")}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {metricCard("Base Rate", preview.baseRateLabel, "#7dd3fc")}
                {metricCard("10Y-2Y", preview.curveSlopeLabel, "#67e8f9")}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                flex: 1,
                padding: "16px 18px",
                borderRadius: 8,
                background: OG_PANEL,
                border: `1px solid ${OG_BORDER}`,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: OG_TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Trust
                </div>
                <div style={{ fontSize: 17, lineHeight: 1.26, color: OG_TEXT_SECONDARY }}>
                  {preview.freshnessLine}
                </div>
              </div>
              {/* Single expression on purpose: satori rejects a div holding
                  mixed text + expression children unless it declares flex. */}
              <div style={{ fontSize: 14, color: OG_TEXT_MUTED }}>
                {`Source: ${preview.sourceLabel}`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
