import type { CSSProperties, ReactElement } from "react";
import type { RegimeKey } from "../../../lib/regimeEngine";

/**
 * Chart-forward social image for a published weekly brief.
 *
 * Discover is a visual feed and explicitly deprioritizes text-heavy graphics, so
 * this leads with the posture timeline and carries only the labels a reader needs
 * to place it: the posture, the week, and the scale.
 */
export type BriefChartPoint = {
  label: string;
  regime: RegimeKey;
  /** 0-1, drives bar height. */
  intensity: number;
};

const regimeColor: Record<RegimeKey, string> = {
  EXPANSION: "#34d399",
  VOLATILE: "#fbbf24",
  DEFENSIVE: "#38bdf8",
  SCARCITY: "#fb7185",
};

const frameStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100%",
  padding: "56px 64px",
  background: "linear-gradient(145deg, #030712 0%, #0f172a 55%, #111827 100%)",
  color: "#f8fafc",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};

export const renderBriefChartOgImage = ({
  posture,
  weekLabel,
  regime,
  points,
}: {
  posture: string;
  weekLabel: string;
  regime: RegimeKey;
  points: BriefChartPoint[];
}): ReactElement => {
  const accent = regimeColor[regime];
  const visible = points.slice(-28);

  return (
    <div style={frameStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", width: 14, height: 14, borderRadius: 999, background: accent }} />
        <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: "0.14em", color: "#94a3b8" }}>
          WHETHER
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: 24 }}>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: accent, lineHeight: 1.05 }}>
          {posture}
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#cbd5f5", marginTop: 10 }}>{weekLabel}</div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          height: 220,
          marginTop: "auto",
        }}
      >
        {visible.map((point, index) => (
          <div
            key={`${point.label}-${index}`}
            style={{
              display: "flex",
              flex: 1,
              height: `${Math.max(12, Math.round(point.intensity * 100))}%`,
              borderRadius: 6,
              background: regimeColor[point.regime],
              opacity: index === visible.length - 1 ? 1 : 0.55,
            }}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 18,
          fontSize: 22,
          color: "#64748b",
        }}
      >
        <div style={{ display: "flex" }}>{visible[0]?.label ?? ""}</div>
        <div style={{ display: "flex" }}>{visible[visible.length - 1]?.label ?? ""}</div>
      </div>
    </div>
  );
};
