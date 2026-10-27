import type { CSSProperties, ReactElement } from "react";
import type { RegimeKey } from "../../../lib/regimeEngine";
import { REGIME_ORDER, getRegimePublicLabel } from "../../../lib/regimePresentation";
import { REGIME_HEX_COLORS } from "../../../lib/regimePhaseSpace";
import { GlyphMotif, OG_ACCENT, OG_BG, OG_BORDER_STRONG, OG_CONDITION_INK, OG_FONT_BODY, OG_FONT_DISPLAY, OG_TEXT, OG_TEXT_MUTED, OG_TEXT_SECONDARY } from "./ogTheme";

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

/* The site's four hues. This card had its own table, with Stormy amber and Cloudy
   sky — so a Stormy week was the colour of every link on the page it pointed to. */
const regimeColor = REGIME_HEX_COLORS;

const frameStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100%",
  padding: "56px 64px",
  background: OG_BG,
  color: OG_TEXT,
  fontFamily: `${OG_FONT_BODY}, ui-sans-serif, system-ui, sans-serif`,
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <GlyphMotif tone={accent} size={34} />
          <div style={{ display: "flex", fontSize: 26, fontWeight: 600, letterSpacing: "0.14em", color: OG_TEXT_MUTED }}>
            WHETHER
          </div>
        </div>
        {weekLabel ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "6px 14px",
              borderRadius: 6,
              border: `1px solid ${OG_BORDER_STRONG}`,
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: OG_ACCENT,
              textTransform: "uppercase",
            }}
          >
            Published brief
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: 24 }}>
        <div style={{ display: "flex", fontSize: 62, fontWeight: 700, fontFamily: `${OG_FONT_DISPLAY}, ui-sans-serif, system-ui, sans-serif`, color: OG_CONDITION_INK[regime], lineHeight: 1.05 }}>
          {posture}
        </div>
        <div style={{ display: "flex", fontSize: 30, color: OG_TEXT_SECONDARY, marginTop: 10 }}>{weekLabel ? `Week of ${weekLabel}` : "This week's guidance"}</div>
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
          color: OG_TEXT_MUTED,
        }}
      >
        <div style={{ display: "flex" }}>{visible[0]?.label ?? ""}</div>
        {/* The bars are quarters, so the newest one can disagree with this week's
            headline. The caption says what they are; the key says what each hue means. */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 18 }}>
          <div style={{ display: "flex", color: OG_TEXT_SECONDARY }}>Conditions by quarter</div>
          {REGIME_ORDER.map((key) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ display: "flex", width: 12, height: 12, borderRadius: 3, background: regimeColor[key] }} />
              <div style={{ display: "flex" }}>{getRegimePublicLabel(key)}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex" }}>{visible[visible.length - 1]?.label ?? ""}</div>
      </div>
    </div>
  );
};
