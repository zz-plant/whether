import type { CSSProperties, ReactElement } from "react";
import { GlyphMotif, OG_BG, OG_FONT_BODY, OG_FONT_DISPLAY, OG_PANEL, OG_TEXT, OG_TEXT_MUTED, OG_BORDER } from "./ogTheme";

/**
 * The social card for an answer page.
 *
 * Answers used to unfurl through the shared `solutions` lens, whose right-hand
 * panel is three fixed lines — "SOLUTIONS LENS / Decision support / Turn
 * climate calls into role-based operating guardrails for teams" — on every
 * card. An answer page is a question with a dated call, and neither half of
 * that appeared: the panel said the same thing for "Should startups raise
 * capital now?" as for "When should startups cut burn?".
 *
 * Here both columns carry the page. The question leads, its own short answer
 * sits under it, and the panel carries this week's call and the action it
 * implies — the two lines someone scrolling a channel needs to decide whether
 * to open the link.
 */
const ACCENT = "#34d399";

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

export const renderAnswerOgImage = ({
  question,
  shortAnswer,
  call,
  action,
  kicker,
}: {
  question: string;
  shortAnswer: string;
  call: string;
  action: string;
  kicker: string;
}): ReactElement => (
  <div style={frameStyle}>
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <GlyphMotif tone={ACCENT} size={34} />
      <div style={{ display: "flex", fontSize: 24, fontWeight: 600, letterSpacing: "0.16em", color: OG_TEXT_MUTED }}>
        OPERATOR ANSWER
      </div>
    </div>

    <div style={{ display: "flex", height: 3, background: ACCENT, opacity: 0.5, marginTop: 20 }} />

    <div style={{ display: "flex", flex: 1, gap: 40, marginTop: 36 }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", fontSize: 54, fontWeight: 600, lineHeight: 1.08, fontFamily: `${OG_FONT_DISPLAY}, Georgia, serif`, color: OG_TEXT }}>
          {question}
        </div>
        <div style={{ display: "flex", fontSize: 27, lineHeight: 1.35, color: "#cbd5e1", marginTop: 22 }}>
          {shortAnswer}
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
        <div style={{ display: "flex", fontSize: 20, fontWeight: 600, letterSpacing: "0.12em", color: ACCENT }}>
          THIS WEEK
        </div>
        <div style={{ display: "flex", fontSize: 28, fontWeight: 700, lineHeight: 1.2, color: "#f8fafc", marginTop: 14 }}>
          {call}
        </div>
        <div style={{ display: "flex", fontSize: 21, lineHeight: 1.4, color: "#94a3b8", marginTop: 14 }}>
          {action}
        </div>
      </div>
    </div>

    <div style={{ display: "flex", fontSize: 22, color: "#64748b", marginTop: 28 }}>{kicker}</div>
  </div>
);
