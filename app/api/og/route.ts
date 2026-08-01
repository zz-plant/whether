/**
 * Open Graph image generator for shareable Capital Posture Governance pages.
 * Supports specialized templates for report, operations, signals, solutions, and guides.
 */
import { ImageResponse } from "next/og";
import { loadHomeSharePreview } from "../../../lib/report/homeSharePreview";
import { renderReportOgImage } from "./reportImageTemplate";
import { renderBriefChartOgImage, type BriefChartPoint } from "./briefChartTemplate";
import { getPostureArchivePeriods } from "../../../lib/summary/postureArchive";
import type { RegimeKey } from "../../../lib/regimeEngine";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

type OgTemplate = "report" | "operations" | "signals" | "method" | "solutions" | "guides" | "brief-chart";

/** Templates rendered as static SVG, i.e. every one that is not data-driven. */
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

const escapeText = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const wrapText = (value: string, maxLength: number) => {
  const words = value.split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines;
};

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

const templateAccent: Record<StaticOgTemplate, string> = {
  operations: "#22d3ee",
  signals: "#38bdf8",
  method: "#a78bfa",
  solutions: "#34d399",
  guides: "#f59e0b",
};

const templatePanelCopy: Record<StaticOgTemplate, {
  label: string;
  title: string;
  body: string;
}> = {
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

const renderStaticTemplate = ({
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
}) => {
  const titleLines = wrapText(title, 22).slice(0, 2);
  const subtitleLines = wrapText(subtitle, 38).slice(0, 3);
  const accent = templateAccent[template];
  const panelCopy = templatePanelCopy[template];
  const panelBodyLines = wrapText(panelCopy.body, 31).slice(0, 3);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#020617" />
      <stop offset="45%" stop-color="#0b1220" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>
    <radialGradient id="spot" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(980 70) rotate(132.677) scale(520 360)">
      <stop stop-color="${accent}" stop-opacity="0.32" />
      <stop offset="1" stop-color="${accent}" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="accentLine" x1="60" y1="68" x2="1140" y2="68" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.35" />
      <stop offset="0.5" stop-color="${accent}" />
      <stop offset="1" stop-color="${accent}" stop-opacity="0.35" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#020617" flood-opacity="0.55" />
    </filter>
    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="18" />
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <circle cx="980" cy="70" r="420" fill="url(#spot)" filter="url(#softGlow)" />
  <rect x="60" y="64" width="1080" height="502" rx="30" fill="#0b1220" stroke="#1f2937" stroke-width="2" filter="url(#shadow)" />
  <rect x="60" y="64" width="1080" height="8" rx="4" fill="url(#accentLine)" />
  <rect x="744" y="118" width="320" height="316" rx="24" fill="#0f172a" stroke="${accent}" stroke-opacity="0.35" />
  <text x="772" y="172" fill="#cbd5e1" font-family="Inter, system-ui, sans-serif" font-size="15" letter-spacing="1.6">${escapeText(panelCopy.label)}</text>
  <text x="772" y="216" fill="#f8fafc" font-family="Inter, system-ui, sans-serif" font-size="33" font-weight="700">${escapeText(panelCopy.title)}</text>
  <line x1="772" y1="244" x2="1034" y2="244" stroke="#334155" />
  <text x="772" y="278" fill="${accent}" font-family="Inter, system-ui, sans-serif" font-size="17" font-weight="600">${escapeText(eyebrow)}</text>
  ${panelBodyLines
    .map(
      (line, index) => `<text x="772" y="${312 + index * 26}" fill="#cbd5e1" font-family="Inter, system-ui, sans-serif" font-size="17">
    ${escapeText(line)}
  </text>`
    )
    .join("\n")}
  <text x="120" y="155" fill="${accent}" font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="700" letter-spacing="2">
    ${escapeText(eyebrow.toUpperCase())}
  </text>
  ${titleLines
    .map(
      (line, index) => `<text x="120" y="${230 + index * 62}" fill="#f8fafc" font-family="Inter, system-ui, sans-serif" font-size="50" font-weight="700">
    ${escapeText(line)}
  </text>`
    )
    .join("\n")}
  ${subtitleLines
    .map(
      (line, index) => `<text x="120" y="${350 + index * 34}" fill="#cbd5e1" font-family="Inter, system-ui, sans-serif" font-size="24">
    ${escapeText(line)}
  </text>`
    )
    .join("\n")}
  <text x="120" y="536" fill="#94a3b8" font-family="Inter, system-ui, sans-serif" font-size="20">
    ${escapeText(kicker)}
  </text>
  <text x="1048" y="536" text-anchor="end" fill="#e2e8f0" font-family="Inter, system-ui, sans-serif" font-size="20" font-weight="600">
    Whether
  </text>
</svg>`;
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

    const svg = renderStaticTemplate({
      template,
      eyebrow,
      title,
      subtitle,
      kicker,
    });

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
      },
    });
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
