import type { ReactElement } from "react";
import { isRegimeKey } from "../../../lib/regimePresentation";
import { REGIME_HEX_COLORS } from "../../../lib/regimePhaseSpace";
import { toImageSafeProps, toImageSafeText } from "../../../lib/image/ogFonts";
import { loadHomeSharePreview } from "../../../lib/report/homeSharePreview";
import { loadComparePreview } from "../../../lib/image/compareImagePayload";
import { canonicalPositioningLine } from "../../../lib/seo";
import { renderReportOgImage } from "./reportImageTemplate";
import { renderBriefChartOgImage, type BriefChartPoint } from "./briefChartTemplate";
import { renderCompareOgImage } from "./compareTemplate";
import { renderStaticOgImage, type OgRegimeMix, type StaticOgTemplate } from "./staticTemplate";
import { renderAnswerOgImage } from "./answerImageTemplate";
import postureTimeline from "../../../data/posture_og_timeline.json";
import type { RegimeKey } from "../../../lib/regimeEngine";

/**
 * Search params in, card out — every template `/api/og` serves.
 *
 * This was the body of the route, which Next allows to export only handlers, so
 * nothing outside it could ask "what does the card for this URL say?". That is
 * how "boldness" reached a share card after the site retired the word, and how
 * the weekly card printed a glyph its font does not carry: the vocabulary and
 * layout checks read pages, and no card was a page. Here, a test can take any
 * page's `og:image` URL and read the card it gets.
 */

type OgTemplate = "report" | StaticOgTemplate | "brief-chart" | "compare" | "answers";

const STATIC_TEMPLATES: ReadonlySet<string> = new Set<StaticOgTemplate>([
  "operations",
  "signals",
  "method",
  "solutions",
  "guides",
  "reading",
  "record",
  "plain",
]);

const isStaticTemplate = (value: string): value is StaticOgTemplate => STATIC_TEMPLATES.has(value);

/** The line every card closes on unless the page names its own. */
const DEFAULT_KICKER = "Whether — weekly operating guidance";

const readTemplate = (searchParams: URLSearchParams): OgTemplate => {
  const template = searchParams.get("template")?.trim() ?? "";
  if (isStaticTemplate(template)) return template;
  if (template === "brief-chart" || template === "compare" || template === "answers") return template;
  return "report";
};

/* Ends on a word. A raw slice put "commit to growth inve" on a share card. */
const clampToWord = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  const cut = value.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace >= Math.floor(maxLength * 0.6) ? cut.slice(0, lastSpace) : cut).trimEnd()}\u2026`;
};

const readParam = (searchParams: URLSearchParams, key: string, fallback: string, maxLength = 80) => {
  const value = searchParams.get(key)?.trim().replace(/\s+/g, " ");
  return value ? clampToWord(value, maxLength) : fallback;
};

/* "VOLATILE:22,SCARCITY:22,EXPANSION:8" — unknown keys and non-counts are dropped. */
const readMix = (searchParams: URLSearchParams): OgRegimeMix | undefined => {
  const raw = searchParams.get("mix")?.trim();
  if (!raw) return undefined;
  const mix = raw.split(",").flatMap((part) => {
    const [key, value] = part.split(":");
    const regime = key?.trim().toUpperCase() ?? "";
    const count = Number(value);
    return isRegimeKey(regime) && Number.isFinite(count) && count > 0 ? [{ regime, count }] : [];
  });
  return mix.length > 0 ? mix.slice(0, 4) : undefined;
};

/* A page's own panel, all three parts or none: half a panel over the fixed copy reads as a bug. */
const readPanel = (searchParams: URLSearchParams) => {
  const label = searchParams.get("panelLabel")?.trim();
  const title = searchParams.get("panelTitle")?.trim();
  const body = searchParams.get("panelBody")?.trim();
  if (!label || !title || !body) return undefined;
  // Nested, so `toImageSafeProps` (top-level strings only) would not reach it.
  return {
    label: toImageSafeText(readParam(searchParams, "panelLabel", "", 24).toUpperCase()),
    title: toImageSafeText(readParam(searchParams, "panelTitle", "", 110)),
    body: toImageSafeText(readParam(searchParams, "panelBody", "", 120)),
  };
};

const readRegime = (searchParams: URLSearchParams): RegimeKey | null => {
  const value = searchParams.get("regime")?.trim().toUpperCase() ?? "";
  return isRegimeKey(value) ? value : null;
};

/** The quarterly archive, newest last, so the bars show real history rather than filler. */
const buildPostureTimelinePoints = (): BriefChartPoint[] =>
  postureTimeline.map((period) => ({
    ...period,
    regime: isRegimeKey(period.regime) ? period.regime : "VOLATILE",
  }));

export const renderOgElement = async (searchParams: URLSearchParams): Promise<ReactElement> => {
  const template = readTemplate(searchParams);

  if (template === "brief-chart") {
    return renderBriefChartOgImage(
      toImageSafeProps({
        posture: readParam(searchParams, "posture", "This week's guidance", 34),
        weekLabel: readParam(searchParams, "week", "", 24),
        regime: readRegime(searchParams) ?? "VOLATILE",
        points: buildPostureTimelinePoints(),
      }),
    );
  }

  if (template === "compare") {
    return renderCompareOgImage(
      await loadComparePreview({
        yearA: searchParams.get("yearA") ?? undefined,
        monthA: searchParams.get("monthA") ?? undefined,
        yearB: searchParams.get("yearB") ?? undefined,
        monthB: searchParams.get("monthB") ?? undefined,
      }),
    );
  }

  if (template === "answers") {
    return renderAnswerOgImage(
      toImageSafeProps({
        question: readParam(searchParams, "title", "An operator answer", 72),
        shortAnswer: readParam(searchParams, "subtitle", "", 170),
        // 90 cut a normal call mid-thought ("…over the ones that close…"); the
        // panel sizes its type to the length instead.
        call: readParam(searchParams, "call", "This week's guidance", 130),
        action: readParam(searchParams, "action", "", 120),
        kicker: readParam(searchParams, "kicker", DEFAULT_KICKER, 72),
      }),
    );
  }

  if (template !== "report") {
    const regime = readRegime(searchParams);
    return renderStaticOgImage(
      toImageSafeProps({
        template,
        title: readParam(searchParams, "title", "Whether", 72),
        subtitle: readParam(searchParams, "subtitle", canonicalPositioningLine, 170),
        eyebrow: readParam(searchParams, "eyebrow", "Whether", 42),
        kicker: readParam(searchParams, "kicker", DEFAULT_KICKER, 72),
        accent: regime ? REGIME_HEX_COLORS[regime] : undefined,
        panel: readPanel(searchParams),
        mix: readMix(searchParams),
      }),
    );
  }

  const preview = await loadHomeSharePreview({
    month: searchParams.get("month") ?? undefined,
    year: searchParams.get("year") ?? undefined,
    sector: searchParams.get("sector") ?? undefined,
    view: searchParams.get("view") ?? undefined,
  });
  return renderReportOgImage(toImageSafeProps(preview));
};
