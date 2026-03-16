import type { CSSProperties, ReactElement } from "react";
import type { HomeSharePreview } from "../../../lib/report/homeSharePreview";

const frameStyle: CSSProperties = {
  display: "flex",
  position: "relative",
  width: "100%",
  height: "100%",
  padding: "26px",
  background: "linear-gradient(145deg, #030712 0%, #0f172a 55%, #111827 100%)",
  color: "#f8fafc",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
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
  padding: "8px 12px",
  borderRadius: "999px",
  border: `1px solid ${color}55`,
  background: `${color}22`,
  color,
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: "0.03em",
  textTransform: "uppercase" as const,
});

const metricCard = (label: string, value: string, accent: string) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      minHeight: 96,
      padding: "14px 16px",
      borderRadius: 18,
      background: "#0f172acc",
      border: "1px solid #334155",
    }}
  >
    <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
      {label}
    </div>
    <div style={{ fontSize: 26, fontWeight: 800, color: accent }}>
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
      flexDirection: "column",
      gap: 8,
      minHeight: 104,
      padding: "16px 18px",
      borderRadius: 18,
      background,
      border,
    }}
  >
    <div style={{ fontSize: 13, color: labelColor, textTransform: "uppercase", letterSpacing: "0.08em" }}>
      {label}
    </div>
    <div style={{ fontSize: 20, lineHeight: 1.26 }}>
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
          position: "absolute",
          top: 26,
          right: 34,
          width: 260,
          height: 260,
          borderRadius: 260,
          background: `${tone}33`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -80,
          left: -40,
          width: 300,
          height: 300,
          borderRadius: 300,
          background: "#22d3ee22",
        }}
      />
      <div
        style={{
          display: "flex",
          position: "relative",
          width: "100%",
          height: "100%",
          padding: "24px 24px 22px",
          borderRadius: 26,
          border: "1px solid #1f2937",
          background: "#020817e8",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            background: `linear-gradient(90deg, #38bdf8 0%, ${tone} 45%, #f8fafc 100%)`,
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
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#93c5fd" }}>
                  {preview.eyebrow}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <div style={pill(preview.audienceLabel, "#e2e8f0")}>{preview.audienceLabel}</div>
                  <div style={pill(preview.contextLabel, tone)}>{preview.contextLabel}</div>
                  <div style={pill(preview.weekLabel, "#cbd5e1")}>{preview.weekLabel}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 56, lineHeight: 0.98, fontWeight: 900, letterSpacing: "-0.05em" }}>
                  {preview.headline}
                </div>
                <div style={{ fontSize: 23, lineHeight: 1.22, color: "#dbeafe" }}>
                  {preview.whyItMatters}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <div style={pill(preview.statusLabel, tone)}>{preview.statusLabel}</div>
                  <div style={pill(`${preview.confidenceLabel} confidence`, confidenceTone)}>{preview.confidenceLabel} confidence</div>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {detailCard({
                label: "What Changed",
                value: preview.changeSummary,
                background: "#0f172acc",
                border: "1px solid #334155",
                labelColor: "#94a3b8",
              })}
              {detailCard({
                label: "Do Now",
                value: preview.immediateDecision,
                background: "#082032",
                border: "1px solid #155e75",
                labelColor: "#67e8f9",
              })}
              {detailCard({
                label: "Flip When",
                value: preview.flipCondition,
                background: "#1f1720",
                border: "1px solid #7c2d12",
                labelColor: "#fdba74",
              })}
              {detailCard({
                label: "Operating Stance",
                value: preview.operatingStanceLine,
                background: "#15162a",
                border: "1px solid #4338ca",
                labelColor: "#c4b5fd",
              })}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "34%",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "16px 18px",
                borderRadius: 18,
                background: "#0b1220",
                border: "1px solid #334155",
              }}
            >
              <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Snapshot
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <div style={pill(preview.trendLabel, "#e2e8f0")}>{preview.trendLabel}</div>
                <div style={pill(preview.postureDelta, "#c084fc")}>{preview.postureDelta}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {metricCard("Confidence", preview.confidenceLabel, confidenceTone)}
              {metricCard("Trend", preview.trendLabel, "#e2e8f0")}
              {metricCard("Base Rate", preview.baseRateLabel, "#7dd3fc")}
              {metricCard("10Y-2Y", preview.curveSlopeLabel, "#67e8f9")}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                flex: 1,
                padding: "16px 18px",
                borderRadius: 18,
                background: "#0f172acc",
                border: "1px solid #334155",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Trust
                </div>
                <div style={{ fontSize: 17, lineHeight: 1.26, color: "#e2e8f0" }}>
                  {preview.freshnessLine}
                </div>
              </div>
              <div style={{ fontSize: 14, color: "#94a3b8" }}>
                Source: {preview.sourceLabel}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
