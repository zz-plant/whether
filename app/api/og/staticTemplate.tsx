import type { CSSProperties, ReactElement } from "react";
import { GlyphMotif, OG_BG, OG_FONT_BODY, OG_FONT_DISPLAY, OG_PANEL, OG_TEXT, OG_TEXT_MUTED, OG_BORDER } from "./ogTheme";

/**
 * Lens social images for the non-report routes.
 *
 * Previously emitted as a raw SVG string. Most social unfurlers and Google
 * Discover reject `image/svg+xml` outright, so these render through
 * `ImageResponse` as PNG like every other template here.
 */
type StaticOgTemplate = "operations" | "signals" | "method" | "solutions" | "guides";

const templateAccent: Record<StaticOgTemplate, string> = {
  operations: "#22d3ee",
  signals: "#38bdf8",
  method: "#a78bfa",
  solutions: "#34d399",
  guides: "#f59e0b",
};

const templatePanelCopy: Record<StaticOgTemplate, { label: string; title: string; body: string }> = {
  operations: {
    label: "OPERATIONS LENS",
    title: "Execution rhythm",
    body: "Turn market conditions into a planning pace and a hiring plan.",
  },
  signals: {
    label: "SIGNALS LENS",
    title: "Evidence first",
    body: "See which readings moved, which lines they crossed, and which way they point.",
  },
  method: {
    label: "METHOD LENS",
    title: "How it works",
    body: "Trace every call to its formula, its sources and when they last updated.",
  },
  solutions: {
    label: "SOLUTIONS LENS",
    title: "Decision support",
    body: "Turn the weekly call into pause and resume lines for each team.",
  },
  guides: {
    label: "GUIDES LENS",
    title: "Team enablement",
    body: "Give product, finance and strategy one call to plan against.",
  },
};

const frameStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100%",
  padding: "60px 64px",
  background: OG_BG,
  color: OG_TEXT,
  fontFamily: `${OG_FONT_BODY}, ui-sans-serif, system-ui, sans-serif`,
};

export const renderStaticOgImage = ({
  template,
  eyebrow,
  title,
  subtitle,
  kicker,
}: {
  template: StaticOgTemplate;
  eyebrow: string;
  title: string;
  subtitle: string;
  kicker: string;
}): ReactElement => {
  const accent = templateAccent[template];
  const panel = templatePanelCopy[template];

  return (
    <div style={frameStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <GlyphMotif tone={accent} size={34} />
        <div style={{ display: "flex", fontSize: 24, fontWeight: 600, letterSpacing: "0.16em", color: OG_TEXT_MUTED }}>
          {eyebrow.toUpperCase()}
        </div>
      </div>

      <div style={{ display: "flex", height: 3, background: accent, opacity: 0.5, marginTop: 20 }} />

      <div style={{ display: "flex", flex: 1, gap: 40, marginTop: 36 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 58, fontWeight: 600, lineHeight: 1.08, fontFamily: `${OG_FONT_DISPLAY}, Georgia, serif`, color: OG_TEXT }}>
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 28, lineHeight: 1.35, color: "#cbd5e1", marginTop: 22 }}>
            {subtitle}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 380,
            padding: "28px 30px",
            borderRadius: 8,
            border: `1px solid ${OG_BORDER}`,
            background: OG_PANEL,
          }}
        >
          <div style={{ display: "flex", fontSize: 20, fontWeight: 600, letterSpacing: "0.12em", color: accent }}>
            {panel.label}
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#f8fafc", marginTop: 14 }}>
            {panel.title}
          </div>
          <div style={{ display: "flex", fontSize: 22, lineHeight: 1.4, color: "#94a3b8", marginTop: 14 }}>
            {panel.body}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", fontSize: 22, color: "#64748b", marginTop: 28 }}>{kicker}</div>
    </div>
  );
};
