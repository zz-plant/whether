/**
 * Open Graph image generator for shareable Capital Posture Governance pages.
 * Supports specialized templates for report, operations, signals, solutions, and guides.
 */
import { ImageResponse } from "next/og";
import { loadHomeSharePreview } from "../../../lib/report/homeSharePreview";
import { renderReportOgImage } from "./reportImageTemplate";
import { renderBriefChartOgImage, type BriefChartPoint } from "./briefChartTemplate";
import { renderStaticOgImage } from "./staticTemplate";
import { getPostureArchivePeriods } from "../../../lib/summary/postureArchive";
import type { RegimeKey } from "../../../lib/regimeEngine";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

type OgTemplate = "report" | "operations" | "signals" | "method" | "solutions" | "guides" | "brief-chart";

/** Lens templates, i.e. every one that is not data-driven. */
type StaticOgTemplate = Exclude<OgTemplate, "report" | "brief-chart">;

const regimeKeys = ["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"] as const;

const readRegime = (searchParams: URLSearchParams): RegimeKey => {
  const value = searchParams.get("regime")?.trim().toUpperCase();
  return regimeKeys.find((key) => key === value) ?? "VOLATILE";
};

/**
 * Posture timeline for the chart-forward social image, newest last.
 * Built from the quarterly archive so the bars show real history, not filler.
 */
const buildPostureTimelinePoints = (): BriefChartPoint[] =>
  getPostureArchivePeriods()
    .filter((period) => period.kind === "quarter")
    .sort((a, b) => a.asOf.localeCompare(b.asOf))
    .map((period) => {
      const dominant = period.regimeMix[0];
      return {
        label: period.title,
        regime: period.regime,
        // Bar height reads as posture conviction: how much of the quarter held one call.
        intensity: dominant ? Math.max(0.35, dominant.share / 100) : 0.5,
      };
    });

const readParam = (
  searchParams: URLSearchParams,
  key: string,
  fallback: string,
  maxLength = 80,
) => {
  const value = searchParams.get(key)?.trim();
  if (!value) {
    return fallback;
  }
  return value.slice(0, maxLength);
};

const readTemplate = (searchParams: URLSearchParams): OgTemplate => {
  const template = searchParams.get("template")?.trim();

  switch (template) {
    case "operations":
    case "signals":
    case "method":
    case "solutions":
    case "guides":
    case "brief-chart":
      return template;
    default:
      return "report";
  }
};

export const runtime = "edge";
export const revalidate = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const template = readTemplate(searchParams);

  if (template === "brief-chart") {
    const image = new ImageResponse(
      renderBriefChartOgImage({
        posture: readParam(searchParams, "posture", "Weekly operating posture", 34),
        weekLabel: readParam(searchParams, "week", "", 16),
        regime: readRegime(searchParams),
        points: buildPostureTimelinePoints(),
      }),
      { width: OG_WIDTH, height: OG_HEIGHT },
    );

    image.headers.set("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=86400");

    return image;
  }

  if (template !== "report") {
    const title = readParam(searchParams, "title", "Whether — Capital Posture Governance", 72);
    const subtitle = readParam(
      searchParams,
      "subtitle",
      "Translate macro signals into operational guidance for product and engineering leaders.",
      170,
    );
    const eyebrow = readParam(searchParams, "eyebrow", "Capital Posture Governance", 42);
    const kicker = readParam(
      searchParams,
      "kicker",
      "Treasury macro signals, translated for execution.",
      72,
    );

    const image = new ImageResponse(
      renderStaticOgImage({ template, eyebrow, title, subtitle, kicker }),
      { width: OG_WIDTH, height: OG_HEIGHT },
    );

    image.headers.set("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=86400");

    return image;
  }

  const preview = await loadHomeSharePreview({
    month: searchParams.get("month") ?? undefined,
    year: searchParams.get("year") ?? undefined,
    sector: searchParams.get("sector") ?? undefined,
    view: searchParams.get("view") ?? undefined,
  });
  const image = new ImageResponse(renderReportOgImage(preview), {
    width: OG_WIDTH,
    height: OG_HEIGHT,
  });

  image.headers.set(
    "Cache-Control",
    "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
  );

  return image;
}
