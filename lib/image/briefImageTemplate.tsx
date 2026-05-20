import type { CSSProperties, ReactElement } from "react";

export type BriefImageProps = {
  decision: string;
  regime: string;
  postureLabel: string;
  tightness: number;
  riskAppetite: number;
  tightnessDelta: number;
  riskAppetiteDelta: number;
  confidenceLabel: string;
  recordDate: string;
};

const escapeText = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const confidenceColors: Record<string, string> = {
  HIGH: "#34d399",
  MED: "#fbbf24",
  LOW: "#f87171",
};

const frameStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: 1200,
  height: 800,
  padding: "48px 64px",
  background: "linear-gradient(160deg, #020617 0%, #0a0f1f 40%, #0f172a 100%)",
  color: "#f8fafc",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  justifyContent: "space-between",
};

const scoreBox = (
  label: string,
  value: number,
  delta: number,
  positiveIsGreen: boolean,
): ReactElement => {
  const deltaColor =
    delta === 0
      ? "#475569"
      : delta > 0
        ? (positiveIsGreen ? "#34d399" : "#fbbf24")
        : (positiveIsGreen ? "#fbbf24" : "#34d399");

  const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "—";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 160,
        padding: "20px 28px",
        borderRadius: 16,
        background: "rgba(15,23,42,0.75)",
        border: "1px solid rgba(51,65,85,0.6)",
      }}
    >
      <div
        style={{
          fontSize: 14,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 42, fontWeight: 800, color: "#f8fafc" }}>
          {value}
        </span>
        <span style={{ fontSize: 22, fontWeight: 600, color: deltaColor }}>
          {arrow}{delta !== 0 ? Math.abs(delta) : ""}
        </span>
      </div>
    </div>
  );
};

const compassBox = (
  tightness: number,
  riskAppetite: number,
  regime: string,
): ReactElement => {
  const tx = (tightness / 100) * 220;
  const ty = 220 - (riskAppetite / 100) * 220;

  const quadrantBg = (isLeft: boolean, isTop: boolean) => {
    if (isLeft && isTop) return "rgba(52,211,153,0.08)";
    if (!isLeft && isTop) return "rgba(251,191,36,0.07)";
    if (isLeft && !isTop) return "rgba(71,85,105,0.1)";
    return "rgba(251,191,36,0.07)";
  };

  const regimeHighlight = (target: string): CSSProperties =>
    regime === target
      ? { border: "2px solid rgba(56,189,248,0.45)", borderRadius: 6 }
      : {};

  const quadLabelStyle: CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    color: "#64748b",
    paddingLeft: 4,
    paddingTop: 2,
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div
        style={{
          position: "relative",
          width: 220,
          height: 220,
          borderRadius: 6,
          border: "1px solid rgba(148,163,184,0.15)",
          overflow: "hidden",
          display: "flex",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: "50%",
            height: "50%",
            background: quadrantBg(true, true),
            ...regimeHighlight("EXPANSION"),
          }}
        >
          <span style={quadLabelStyle}>Expansion</span>
        </div>
        <div
          style={{
            width: "50%",
            height: "50%",
            background: quadrantBg(false, true),
            ...regimeHighlight("DEFENSIVE"),
          }}
        >
          <span style={quadLabelStyle}>Defensive</span>
        </div>
        
        <div
          style={{
            width: "50%",
            height: "50%",
            background: quadrantBg(true, false),
            ...regimeHighlight("VOLATILE"),
          }}
        >
          <span style={quadLabelStyle}>Volatile</span>
        </div>
        
        <div
          style={{
            width: "50%",
            height: "50%",
            background: quadrantBg(false, false),
            ...regimeHighlight("SCARCITY"),
          }}
        >
          <span style={quadLabelStyle}>Scarcity</span>
        </div>
        
        <div
          style={{
            position: "absolute",
            left: tx - 5,
            top: ty - 5,
            width: 10,
            height: 10,
            borderRadius: 10,
            background: "#38bdf8",
            border: "2px solid #0a0a0a",
          }}
        />
      </div>
      
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontSize: 10,
          color: "#64748b",
        }}
      >
        <span>Tightness →</span>
        <span>Risk appetite ↑</span>
        <span style={{ fontWeight: 600, color: "#93c5fd", marginTop: 4 }}>
          T{tightness} R{riskAppetite}
        </span>
      </div>
    </div>
  );
};

export const renderBriefImage = (props: BriefImageProps): ReactElement => {
  const {
    decision,
    regime,
    postureLabel,
    tightness,
    riskAppetite,
    tightnessDelta,
    riskAppetiteDelta,
    confidenceLabel,
    recordDate,
  } = props;

  const confidenceColor =
    confidenceColors[confidenceLabel] ?? confidenceColors["MED"];

  const displayRegime =
    regime === "SCARCITY"
      ? "Scarcity"
      : regime === "DEFENSIVE"
        ? "Defensive"
        : regime === "VOLATILE"
          ? "Volatile"
          : "Expansion";

  const truncatedDecision =
    decision.length > 60 ? decision.slice(0, 57) + "..." : decision;

  return (
    <div style={frameStyle}>
      
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 400,
          height: 400,
          borderRadius: 400,
          background: `${confidenceColor}15`,
          transform: "translate(20%, -20%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: 360,
          height: 360,
          borderRadius: 360,
          background: "#38bdf812",
          transform: "translate(-20%, 20%)",
        }}
      />
      <div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#93c5fd",
            marginBottom: 10,
          }}
        >
          WHETHER · Weekly Brief{recordDate ? ` · ${escapeText(recordDate)}` : ""}
        </div>

        <div
          style={{
            width: 80,
            height: 3,
            borderRadius: 2,
            background: `linear-gradient(90deg, ${confidenceColor}, #38bdf8)`,
            marginBottom: 24,
          }}
        />
      </div>
      <div
        style={{
          fontSize: 44,
          fontWeight: 800,
          lineHeight: 1.15,
          maxWidth: 960,
          color: "#f8fafc",
          letterSpacing: "-0.02em",
        }}
      >
        {escapeText(truncatedDecision)}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#93c5fd",
          marginTop: -8,
        }}
      >
        {escapeText(displayRegime)}{" · "}{escapeText(postureLabel)}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 40,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 14 }}>
          {scoreBox("Credit Conditions", tightness, tightnessDelta, false)}
          {scoreBox("Investor Sentiment", riskAppetite, riskAppetiteDelta, true)}
        </div>
        {compassBox(tightness, riskAppetite, regime)}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          alignSelf: "flex-start",
        }}
      >
        <span
          style={{
            padding: "6px 16px",
            borderRadius: 999,
            backgroundColor: `${confidenceColor}20`,
            border: `1px solid ${confidenceColor}50`,
            color: confidenceColor,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.06em",
          }}
        >
          {escapeText(confidenceLabel)} CONFIDENCE
        </span>
        <span style={{ fontSize: 14, color: "#64748b" }}>
          Based on public data
        </span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 16,
          borderTop: "1px solid rgba(51,65,85,0.3)",
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>
          whether.work
        </span>
        <span style={{ fontSize: 13, color: "#64748b" }}>
          Data: FRED · Treasury · Yahoo Finance
        </span>
      </div>
    </div>
  );
};
