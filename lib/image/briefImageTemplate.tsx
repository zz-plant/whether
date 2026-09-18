import type { ReactElement } from "react";
import { getRegimePublicLabel } from "../regimePresentation";
import { OG_FONT_BODY, toImageSafeText } from "./ogFonts";
import { OG_ACCENT, OG_BG, OG_BORDER, OG_PANEL, OG_TEXT, OG_TEXT_MUTED, OG_TEXT_SECONDARY } from "./ogTheme";
import { formatConfidenceChipLabel } from "../report/reportFormatting";

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
  pauseThreshold?: number;
  flipConditions?: string[];
};

/**
 * Copy arrives from the report model, which is free to use symbols the OG font
 * subset does not carry. Everything headed for the canvas goes through here so
 * one stray glyph cannot abort the render. See toImageSafeText.
 */
const toImageSafeProps = (props: BriefImageProps): BriefImageProps => ({
  ...props,
  decision: toImageSafeText(props.decision),
  regime: toImageSafeText(props.regime),
  postureLabel: toImageSafeText(props.postureLabel),
  confidenceLabel: toImageSafeText(props.confidenceLabel),
  recordDate: toImageSafeText(props.recordDate),
  briefLabel: props.briefLabel === undefined ? undefined : toImageSafeText(props.briefLabel),
  contextLabel: props.contextLabel === undefined ? undefined : toImageSafeText(props.contextLabel),
  guardrail: props.guardrail === undefined ? undefined : toImageSafeText(props.guardrail),
  flipConditions: props.flipConditions?.map((condition) => toImageSafeText(condition)),
});

const confidenceColor = (label: string) =>
  label === "HIGH" ? "#34d399" : label === "MED" ? "#fbbf24" : "#f87171";

export const renderBriefImage = (props: BriefImageProps): ReactElement => {
  const {
    decision, regime, postureLabel, tightness, pauseThreshold,
    confidenceLabel, recordDate, briefLabel = "Weekly Brief", contextLabel, guardrail, flipConditions,
  } = toImageSafeProps(props);

  const cc = confidenceColor(confidenceLabel);
  const gaugeThreshold = Math.max(1, pauseThreshold ?? tightness);
  // "\u00bb" rather than a right arrow: the OG faces are Latin subsets and carry
  // no U+2192, and an uncovered glyph aborts the render (see toImageSafeText).
  const arrow = decision.toLowerCase().includes("tighten") ? "↑"
    : decision.toLowerCase().includes("ease") ? "↓" : "\u00bb";
  const arrowColor = arrow === "↑" ? "#f87171" : arrow === "↓" ? "#34d399" : "#fbbf24";
  const gaugePct = Math.min(100, Math.round((tightness / gaugeThreshold) * 100));
  const gaugeColor = tightness >= gaugeThreshold ? "#f87171"
    : tightness >= gaugeThreshold - 5 ? "#fbbf24" : "#34d399";

  const displayRegime = getRegimePublicLabel(regime);

  const truncated = decision.length > 80 ? decision.slice(0, 77) + "\u2026" : decision;

  /*
   * Satori throws on any <div> whose children are not a single string unless the
   * div declares display -- and it throws mid-render, which surfaces as a 200 with
   * an empty body rather than an error. So text that reads as one line is built as
   * one string here instead of several adjacent JSX children, and every div that
   * holds an element or a number carries an explicit display.
   */
  const eyebrow = ["WHETHER", briefLabel, recordDate].filter(Boolean).join(" \u00b7 ");
  const postureLine = [displayRegime, postureLabel, contextLabel].filter(Boolean).join(" \u00b7 ");
  const watching = flipConditions?.length ? `Watching: ${flipConditions.join(" \u00b7 ")}` : "";
  /* The card that lands in someone else's Slack channel said "MED CONFIDENCE".
     The colour below still keys off the raw code, which is what the engine
     stores; only the words a reader sees change. */
  const confidenceBadge = formatConfidenceChipLabel(confidenceLabel).toUpperCase();

  return (
    <div style={{ display: "flex", flexDirection: "column", width: 1200, height: 800, padding: 56, background: `linear-gradient(160deg, ${OG_BG} 0%, ${OG_PANEL} 100%)`, color: OG_TEXT, fontFamily: `${OG_FONT_BODY}, ui-sans-serif, system-ui, sans-serif`, justifyContent: "space-between" }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: OG_ACCENT, marginBottom: 32 }}>
          {eyebrow}
        </div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 52, color: arrowColor, marginRight: 16 }}>{arrow}</span>
          <span style={{ fontSize: 40, fontWeight: 800, color: OG_TEXT, maxWidth: 800 }}>{truncated}</span>
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: OG_ACCENT, marginBottom: 48 }}>
          {postureLine}
        </div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", marginRight: 32 }}>
            <div style={{ fontSize: 60, fontWeight: 800, color: OG_TEXT }}>{String(tightness)}</div>
            <div style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", color: OG_TEXT_MUTED, letterSpacing: "0.08em", marginTop: 4 }}>Funding pressure</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", width: 400 }}>
            <div style={{ display: "flex", height: 6, borderRadius: 3, background: "rgba(51,65,85,0.5)", overflow: "hidden" }}>
              <div style={{ height: 6, borderRadius: 3, width: `${gaugePct}%`, background: gaugeColor }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: OG_TEXT_MUTED, marginTop: 4 }}>
              <span>{tightness}</span><span>{gaugeThreshold}</span>
            </div>
          </div>
        </div>
        {guardrail ? <div style={{ fontSize: 13, color: OG_TEXT_MUTED, marginBottom: 8 }}>{guardrail}</div> : null}
        {flipConditions && flipConditions.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", fontSize: 13, color: OG_ACCENT, marginTop: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: 6, background: OG_ACCENT, marginRight: 6 }} />
            <span>{watching}</span>
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 20, borderTop: `1px solid ${OG_BORDER}` }}>
        <span style={{ padding: "6px 16px", borderRadius: 999, backgroundColor: `${cc}20`, border: `1px solid ${cc}50`, color: cc, fontSize: 13, fontWeight: 700, letterSpacing: "0.06em" }}>{confidenceBadge}</span>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: OG_TEXT_MUTED, marginRight: 16 }}>Data: FRED · Treasury · Yahoo Finance</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: OG_TEXT_SECONDARY }}>whether.work</span>
        </div>
      </div>
    </div>
  );
};
