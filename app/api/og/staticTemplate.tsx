import type { CSSProperties, ReactElement } from "react";
import type { RegimeKey } from "../../../lib/regimeEngine";
import { REGIME_HEX_COLORS } from "../../../lib/regimePhaseSpace";
import { GlyphMotif, OG_ACCENT, OG_BG, OG_FONT_BODY, OG_FONT_DISPLAY, OG_PANEL, OG_TEXT, OG_TEXT_MUTED, OG_TEXT_SECONDARY, OG_BORDER } from "./ogTheme";

/**
 * Lens social images for the non-report routes.
 *
 * Previously emitted as a raw SVG string. Most social unfurlers and Google
 * Discover reject `image/svg+xml` outright, so these render through
 * `ImageResponse` as PNG like every other template here.
 */
export type StaticOgTemplate = "operations" | "signals" | "method" | "solutions" | "guides" | "reading" | "record" | "plain";

/*
 * The side panel says what kind of page was shared. These were "OPERATIONS LENS",
 * "SIGNALS LENS" and so on over lines like "Capital Posture Governance": a
 * vocabulary the site retired, on the one surface that reaches people who have
 * never seen it. `plain` has no panel — a privacy policy needs a title, not a pitch.
 */
const templatePanelCopy: Record<StaticOgTemplate, { label: string; title: string; body: string } | null> = {
  operations: {
    label: "PLAN",
    title: "Rules and runway",
    body: "Turn this week's guidance into a hiring and spending plan.",
  },
  signals: {
    label: "EVIDENCE",
    title: "What moved",
    body: "Which readings moved, which lines they crossed, and which way they point.",
  },
  method: {
    label: "TRUST",
    title: "How it is worked out",
    body: "Every reading traced to its formula, its source, and when it last updated.",
  },
  solutions: {
    label: "DECISIONS",
    title: "Pause and restart lines",
    body: "This week's guidance, turned into lines each team can act on.",
  },
  guides: {
    label: "RESOURCES",
    title: "For the whole team",
    body: "Product, finance and strategy, planning against the same guidance.",
  },
  /* /concepts. The panel is fixed per template, and every other one describes a
     guidance surface, which is not what a shared reading list is. */
  reading: {
    label: "READING LIST",
    title: "Dated against the market",
    body: "Each text placed on the conditions of the month it came out.",
  },
  /* /history and its 82 periods. A closed period, so the panel says where the
     current reading lives instead of implying this is it. */
  record: {
    label: "THE RECORD",
    title: "A closed period",
    body: "Month-end readings, computed the same way as this week's guidance.",
  },
  plain: null,
};

type OgPanel = { label: string; title: string; body: string };

/** One segment per state the period spent time in, sized by its share. */
export type OgRegimeMix = Array<{ regime: RegimeKey; count: number }>;

const MixBar = ({ mix }: { mix: OgRegimeMix }) => (
  <div style={{ display: "flex", height: 18, marginTop: 18, borderRadius: 4, overflow: "hidden" }}>
    {mix.map((entry) => (
      <div key={entry.regime} style={{ display: "flex", flexGrow: entry.count, background: REGIME_HEX_COLORS[entry.regime] }} />
    ))}
  </div>
);

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
  accent: accentOverride,
  panel: panelOverride,
  mix,
}: {
  template: StaticOgTemplate;
  eyebrow: string;
  title: string;
  subtitle: string;
  kicker: string;
  /** A record card is keyed to its period's conditions, the way the page is. */
  accent?: string;
  /**
   * The page's own fact for the side panel. The fixed copy below was the same on
   * every page of a template — "THE RECORD / A closed period" on all 83 archive
   * cards, "EVIDENCE / What moved" on all 19 signals cards — a third of the card
   * spent saying nothing about the page being shared. It stays as the fallback.
   */
  panel?: OgPanel;
  /** Drawn under the panel title: the share of each state in the period. */
  mix?: OgRegimeMix;
}): ReactElement => {
  /* The ink, unless the card names a condition. Each template had a hue of its
     own (cyan, sky, violet, green, amber, orange) until 2026-10-09: six colours
     that named a kind of page, which is not something colour carries here. */
  const accent = accentOverride ?? OG_ACCENT;
  /* Titles run from "Privacy" to a 65-character trust heading; at one size the
     long ones wrapped to four lines and ran into the footer. */
  const titleSize = title.length > 48 ? 44 : title.length > 30 ? 52 : 58;
  const panel = panelOverride ?? templatePanelCopy[template];
  const panelTitleSize = !panel ? 34 : panel.title.length > 80 ? 23 : panel.title.length > 44 ? 26 : panel.title.length > 26 ? 30 : 34;

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
          <div style={{ display: "flex", fontSize: titleSize, fontWeight: 700, lineHeight: 1.08, fontFamily: `${OG_FONT_DISPLAY}, ui-sans-serif, system-ui, sans-serif`, color: OG_TEXT }}>
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 28, lineHeight: 1.35, color: OG_TEXT_SECONDARY, marginTop: 22 }}>
            {subtitle}
          </div>
        </div>

        {panel ? (
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
          <div style={{ display: "flex", fontSize: 20, fontWeight: 600, letterSpacing: "0.12em", color: OG_TEXT_MUTED }}>
            {panel.label}
          </div>
          <div style={{ display: "flex", fontSize: panelTitleSize, fontWeight: 700, lineHeight: 1.2, color: OG_TEXT, marginTop: 14 }}>
            {panel.title}
          </div>
          {mix && mix.length > 0 ? <MixBar mix={mix} /> : null}
          <div style={{ display: "flex", fontSize: 22, lineHeight: 1.4, color: OG_TEXT_MUTED, marginTop: 14 }}>
            {panel.body}
          </div>
        </div>
        ) : null}
      </div>

      <div style={{ display: "flex", fontSize: 22, color: OG_TEXT_MUTED, marginTop: 28 }}>{kicker}</div>
    </div>
  );
};
