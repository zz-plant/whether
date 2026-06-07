import type { ReactElement } from "react";

export type BriefImageProps = {
  decision: string;
  regime: string;
  postureLabel: string;
  tightness: number;
  tightnessDelta: number;
  confidenceLabel: string;
  recordDate: string;
  briefLabel?: string;
  contextLabel?: string;
  guardrail?: string;
  flipConditions?: string[];
};

const confidenceColor = (label: string) =>
  label === "HIGH" ? "#34d399" : label === "MED" ? "#fbbf24" : "#f87171";

export const renderBriefImage = (props: BriefImageProps): ReactElement => {
  const {
    decision, regime, postureLabel, tightness,
    confidenceLabel, recordDate, briefLabel = "Weekly Brief", contextLabel, guardrail, flipConditions,
  } = props;

  const cc = confidenceColor(confidenceLabel);
  const pauseThreshold = 80;
  const arrow = decision.toLowerCase().includes("tighten") ? "↑"
    : decision.toLowerCase().includes("ease") ? "↓" : "→";
  const arrowColor = arrow === "↑" ? "#f87171" : arrow === "↓" ? "#34d399" : "#fbbf24";
  const gaugePct = Math.min(100, Math.round((tightness / pauseThreshold) * 100));
  const gaugeColor = tightness >= pauseThreshold ? "#f87171"
    : tightness >= pauseThreshold - 5 ? "#fbbf24" : "#34d399";

  const displayRegime =
    regime === "SCARCITY" ? "Scarcity" : regime === "DEFENSIVE" ? "Defensive"
    : regime === "VOLATILE" ? "Volatile" : "Expansion";

  const truncated = decision.length > 80 ? decision.slice(0, 77) + "\u2026" : decision;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: 1200, height: 800, padding: 56, background: "linear-gradient(160deg, #020617 0%, #0f172a 100%)", color: "#f8fafc", fontFamily: "ui-sans-serif, system-ui, sans-serif", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#93c5fd", marginBottom: 32 }}>
          WHETHER · {briefLabel}{recordDate ? ` · ${recordDate}` : ""}
        </div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 52, color: arrowColor, marginRight: 16 }}>{arrow}</span>
          <span style={{ fontSize: 40, fontWeight: 800, color: "#f8fafc", maxWidth: 800 }}>{truncated}</span>
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#93c5fd", marginBottom: 48 }}>
          {displayRegime}{" \u00b7 "}{postureLabel}{contextLabel ? ` · ${contextLabel}` : ""}
        </div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <div style={{ marginRight: 32 }}>
            <div style={{ fontSize: 60, fontWeight: 800, color: "#f8fafc" }}>{tightness}</div>
            <div style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", color: "#94a3b8", letterSpacing: "0.08em", marginTop: 4 }}>Tightness</div>
          </div>
          <div style={{ width: 400 }}>
            <div style={{ height: 6, borderRadius: 3, background: "rgba(51,65,85,0.5)", overflow: "hidden" }}>
              <div style={{ height: 6, borderRadius: 3, width: `${gaugePct}%`, background: gaugeColor }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginTop: 4 }}>
              <span>{tightness}</span><span>{pauseThreshold}</span>
            </div>
          </div>
        </div>
        {guardrail ? <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>Until tightness reaches {pauseThreshold}</div> : null}
        {flipConditions && flipConditions.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", fontSize: 13, color: "#93c5fd", marginTop: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: 6, background: "#38bdf8", marginRight: 6 }} />
            <span>Watching: {flipConditions.join(" · ")}</span>
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 20, borderTop: "1px solid rgba(51,65,85,0.3)" }}>
        <span style={{ padding: "6px 16px", borderRadius: 999, backgroundColor: `${cc}20`, border: `1px solid ${cc}50`, color: cc, fontSize: 13, fontWeight: 700, letterSpacing: "0.06em" }}>{confidenceLabel} CONFIDENCE</span>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#64748b", marginRight: 16 }}>Data: FRED · Treasury · Yahoo Finance</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>whether.work</span>
        </div>
      </div>
    </div>
  );
};
