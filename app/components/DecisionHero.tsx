import { getRegimePublicLabel } from "../../lib/regimePresentation";
import { NO_LIVE_READING_CALL } from "../../lib/report/reportCopy";
import { RegimeGlyph } from "./illustrations/RegimeGlyph";
import type { RegimeKey } from "../../lib/types";
import { REGIME_WEATHER_LABELS, REGIME_WEATHER_RATIONALES } from "../../lib/regimePresentation";
import { TrustStrip, type TrustStripProps } from "./trustStrip";
import { ScreenshotCaption } from "./screenshotCaption";
import { Sun, Cloud, Zap, Snowflake } from "lucide-react";

type Props = {
  /** The call, as the page's heading. Absent on a read that produced no live call. */
  weeklyCall?: string;
  /** The longer sentence behind the call; printed only when it says more than the call does. */
  callDetail?: string;
  regime: string;
  /** Freshness and confidence, drawn once under the call. Absent on an archived week, which the banner above marks. */
  trust?: Omit<TrustStripProps, "href" | "className"> | null;
  /**
   * The heading level for the call. `h1` by default — it is the page's subject.
   * `h2` on the one state where a cadence card above it carries the call the
   * reader asked for; an `h2` above an `h1`, or two `h1`s, both invert the
   * document outline.
   */
  titleLevel?: "h1" | "h2";
  /**
   * Which reading this is, for the caption at the foot of the card. Only an
   * archived week passes one: a live card dates itself in the trust strip, and
   * an archived card has no strip, so a crop of it would otherwise carry no date.
   */
  captionDetail?: string;
};

const REGIME_GLYPH_KEYS = ["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"] as const satisfies readonly RegimeKey[];
const isRegimeKey = (value: string): value is RegimeKey =>
  REGIME_GLYPH_KEYS.some((key) => key === value);

const weatherIconMap: Record<RegimeKey, typeof Sun> = {
  EXPANSION: Sun,
  DEFENSIVE: Cloud,
  VOLATILE: Zap,
  SCARCITY: Snowflake,
};

/**
 * The state tier, and nothing else: the weather word, what it means for money
 * in one line, the call as the page's heading with its longer sentence as
 * body, and the trust strip. Everything the card used to carry after that —
 * the four signals, the rules by area, the lines and the flip watch, the share
 * actions — is a section of its own under it, in the order a reader asks the
 * questions. What is left fits above the fold on a phone.
 *
 * The card names its own regime so the surface and the stamp take their
 * colour from `data-regime` (tokens.css) — the same source as the copy, so
 * they cannot disagree with it.
 */
export function DecisionHero({
  weeklyCall,
  callDetail,
  regime,
  trust,
  titleLevel = "h1",
  captionDetail,
}: Props) {
  const regimeDisplay = getRegimePublicLabel(regime);
  const regimeKey = isRegimeKey(regime) ? regime : undefined;
  const WeatherIcon = regimeKey ? weatherIconMap[regimeKey] : Sun;
  const TitleTag = titleLevel;
  const regimeWeatherLabel = (regimeKey ? REGIME_WEATHER_LABELS[regimeKey] : regimeDisplay).toUpperCase();
  const call = weeklyCall ?? NO_LIVE_READING_CALL.currentCall;
  const detail = callDetail && callDetail.trim() !== call.trim() ? callDetail : undefined;

  return (
    /*
     * `id="share-ready-artifact"` lives here, on the card that actually is the
     * share-ready artifact. It used to sit on a visually hidden `h1` in
     * `app/page.tsx`, which meant the screenshot capture waited on a zero-size
     * element and the "copy weekly brief" anchor jumped to nothing.
     */
    <section
      id="share-ready-artifact"
      className="weather-card weather-hero-card weather-inset relative overflow-hidden"
      aria-labelledby="weekly-call-title"
      data-regime={regimeKey ?? undefined}
    >
      <div className="relative z-10 min-w-0 space-y-3">
        {/* The regime stamp and its meaning, grouped on the eyebrow line so the eye path flows directly into the call. */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
          <span
            className="inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-bold uppercase tracking-wider"
            style={{
              color: "var(--regime-ink)",
              borderColor: "color-mix(in srgb, var(--regime-accent) 40%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--regime-accent) 14%, transparent)",
            }}
          >
            {regimeKey ? (
              <span className="inline-block w-4 shrink-0" aria-hidden="true">
                <RegimeGlyph idPrefix="hero-stamp" regime={regimeKey} />
              </span>
            ) : (
              <WeatherIcon size={14} aria-hidden="true" />
            )}
            <span>{regimeWeatherLabel}</span>
          </span>

          {regimeKey ? (
            <span className="text-xs leading-relaxed text-slate-400">
              {REGIME_WEATHER_RATIONALES[regimeKey]}
            </span>
          ) : null}
        </div>

        {/* The homepage's `h1`. It was an `h2` under a visually hidden `h1`
            reading "Weekly Brief", so the one heading a crawler and a
            screen-reader user meet first said nothing this week that it did
            not say every week. The call is the page. */}
        <TitleTag
          id="weekly-call-title"
          style={{ viewTransitionName: "page-title" }}
          className="max-w-2xl text-pretty font-sans text-display font-semibold leading-[1.2] tracking-[-0.012em] text-white"
        >
          {call}
        </TitleTag>

        {detail ? (
          <div className="max-w-xl border-l-2 border-slate-700/80 pl-3 py-0.5">
            <p className="text-sm leading-relaxed text-slate-300">{detail}</p>
          </div>
        ) : null}

        {/* Freshness and confidence, once, where every reading route puts them:
            directly under the call. The chip-and-popover in the meta row and the
            trust line at the foot of the card both said this; neither said it
            where a reader deciding whether to act would look first. */}
        {trust ? <TrustStrip {...trust} href="/trust" className="pt-1" /> : null}

        {/* The card is the block people screenshot and crop, so it names its
            own source inside its border. */}
        <ScreenshotCaption
          detail={captionDetail}
          className="mt-1 border-t border-[color:var(--border-faint)] pt-2.5"
        />
      </div>
    </section>
  );
}
