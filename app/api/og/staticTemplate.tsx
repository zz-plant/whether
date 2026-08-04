import type { CSSProperties, ReactElement } from "react";

/**
 * Lens social images for the non-report routes.
 *
 * Previously emitted as a raw SVG string. Most social unfurlers and Google
 * Discover reject `image/svg+xml` outright, so these render through
 * `ImageResponse` as PNG like every other template here.
 */
export type StaticOgTemplate = "operations" | "signals" | "method" | "solutions" | "guides";

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
    body: "Translate macro posture into planning cadence and staffing pacing.",
  },
  signals: {
    label: "SIGNALS LENS",
    title: "Evidence first",
    body: "Track leading indicators, threshold crossings, and direction changes.",
  },
  method: {
    label: "METHOD LENS",
    title: "How it works",
    body: "Make every call traceable to formulas, sources, and update cadence.",
  },
  solutions: {
    label: "SOLUTIONS LENS",
    title: "Decision support",
    body: "Turn climate calls into role-based operating guardrails for teams.",
  },
  guides: {
    label: "GUIDES LENS",
    title: "Team enablement",
    body: "Help leaders align product, finance, and strategy on one posture.",
  },
};

export const staticOgTemplates = Object.keys(templateAccent) as StaticOgTemplate[];

export const isStaticOgTemplate = (value: string): value is StaticOgTemplate =>
  Object.prototype.hasOwnProperty.call(templateAccent, value);

const frameStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100%",
  padding: "60px 64px",
  background: "linear-gradient(145deg, #020617 0%, #0b1220 45%, #111827 100%)",
  color: "#f8fafc",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
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
        <div style={{ display: "flex", width: 14, height: 14, borderRadius: 999, background: accent }} />
        <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: "0.16em", color: "#94a3b8" }}>
          {eyebrow.toUpperCase()}
        </div>
      </div>

      <div style={{ display: "flex", height: 3, background: accent, opacity: 0.5, marginTop: 20 }} />

      <div style={{ display: "flex", flex: 1, gap: 40, marginTop: 36 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 60, fontWeight: 800, lineHeight: 1.08, color: "#f8fafc" }}>
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 28, lineHeight: 1.35, color: "#cbd5f5", marginTop: 22 }}>
            {subtitle}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 380,
            padding: "28px 30px",
            borderRadius: 20,
            border: `1px solid ${accent}55`,
            background: "rgba(15, 23, 42, 0.72)",
          }}
        >
          <div style={{ display: "flex", fontSize: 20, fontWeight: 700, letterSpacing: "0.12em", color: accent }}>
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
