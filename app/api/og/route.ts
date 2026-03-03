/**
 * Open Graph SVG generator for shareable Market Climate Station pages.
 * Supports specialized templates for report, operations, signals, solutions, and guides.
 */
import { evaluateRegime } from "../../../lib/regimeEngine";
import { snapshotData } from "../../../lib/snapshot";
import { fetchTreasuryData } from "../../../lib/treasury/treasuryClient";
import {
  parseTimeMachineRequest,
  resolveTimeMachineSelection,
} from "../../../lib/timeMachine/timeMachineSelection";
import { formatDateUTC, formatTimestampUTC } from "../../../lib/formatters";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

type OgTemplate = "report" | "operations" | "signals" | "method" | "solutions" | "guides";

const formatRateValue = (value: number | null) => {
  if (typeof value !== "number") {
    return "n/a";
  }
  return `${value.toFixed(2)}%`;
};

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
      return template;
    default:
      return "report";
  }
};

const templateAccent: Record<Exclude<OgTemplate, "report">, string> = {
  operations: "#22d3ee",
  signals: "#38bdf8",
  method: "#a78bfa",
  solutions: "#34d399",
  guides: "#f59e0b",
};

const templatePanelCopy: Record<Exclude<OgTemplate, "report">, {
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
  template: Exclude<OgTemplate, "report">;
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

  if (template !== "report") {
    const title = readParam(searchParams, "title", "Whether — Market Climate Station", 72);
    const subtitle = readParam(
      searchParams,
      "subtitle",
      "Translate macro signals into operational guidance for product and engineering leaders.",
      170,
    );
    const eyebrow = readParam(searchParams, "eyebrow", "Market Climate Station", 42);
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

  const query = {
    month: searchParams.get("month") ?? undefined,
    year: searchParams.get("year") ?? undefined,
  };

  const selection = resolveTimeMachineSelection(query);
  const requestedSelection = parseTimeMachineRequest(query);

  const treasury = selection
    ? await fetchTreasuryData({
        snapshotFallback: snapshotData,
        asOf: selection.asOf,
      })
    : await fetchTreasuryData({ snapshotFallback: snapshotData });

  const assessment = evaluateRegime(treasury);
  const recordDateLabel = formatDateUTC(treasury.record_date);
  const fetchedAtLabel = formatTimestampUTC(treasury.fetched_at);
  const baseRateLabel = formatRateValue(assessment.scores.baseRate);
  const slopeLabel = formatRateValue(assessment.scores.curveSlope);

  const statusLabel = selection
    ? selection.banner
    : requestedSelection
      ? "Time Machine selection unavailable"
      : treasury.isLive
        ? "Live (high confidence)"
        : "Cached (medium)";

  const statusLines = wrapText(statusLabel, 34).slice(0, 2);
  const descriptionLines = wrapText(assessment.description, 52).slice(0, 3);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#020617" />
      <stop offset="65%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>
    <radialGradient id="glowTop" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1060 90) rotate(137.442) scale(520 420)">
      <stop stop-color="#38bdf8" stop-opacity="0.34" />
      <stop offset="1" stop-color="#38bdf8" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="highlight" x1="60" y1="64" x2="1140" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.38" />
      <stop offset="50%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.32" />
    </linearGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#111d34" />
      <stop offset="1" stop-color="#0b1324" />
    </linearGradient>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#020617" flood-opacity="0.6" />
    </filter>
    <filter id="blurGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="24" />
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <circle cx="1050" cy="92" r="390" fill="url(#glowTop)" filter="url(#blurGlow)" />
  <rect
    x="60"
    y="60"
    width="1080"
    height="510"
    rx="32"
    fill="#0b1120"
    stroke="#1f2937"
    stroke-width="2"
    filter="url(#cardShadow)"
  />
  <rect x="60" y="60" width="1080" height="8" rx="4" fill="url(#highlight)" />
  <rect x="750" y="116" width="334" height="330" rx="24" fill="url(#panel)" stroke="#334155" stroke-width="1.5" />
  <text x="784" y="164" fill="#93c5fd" font-family="Inter, system-ui, sans-serif" font-size="15" letter-spacing="1.5">LIVE METRICS</text>
  <text x="784" y="220" fill="#f8fafc" font-family="Inter, system-ui, sans-serif" font-size="18">Record date</text>
  <text x="784" y="248" fill="#cbd5e1" font-family="Inter, system-ui, sans-serif" font-size="23" font-weight="600">${escapeText(recordDateLabel)}</text>
  <line x1="784" y1="268" x2="1052" y2="268" stroke="#334155" />
  <text x="784" y="304" fill="#f8fafc" font-family="Inter, system-ui, sans-serif" font-size="18">Base rate</text>
  <text x="784" y="333" fill="#7dd3fc" font-family="Inter, system-ui, sans-serif" font-size="30" font-weight="700">${escapeText(baseRateLabel)}</text>
  <text x="784" y="374" fill="#f8fafc" font-family="Inter, system-ui, sans-serif" font-size="18">10Y-2Y slope</text>
  <text x="784" y="403" fill="#67e8f9" font-family="Inter, system-ui, sans-serif" font-size="30" font-weight="700">${escapeText(slopeLabel)}</text>
  <text x="120" y="150" fill="#e2e8f0" font-family="Inter, system-ui, sans-serif" font-size="42" font-weight="600">
    ${escapeText("Whether Report")}
  </text>
  <text x="120" y="190" fill="#94a3b8" font-family="Inter, system-ui, sans-serif" font-size="18" letter-spacing="2">
    ${escapeText("MARKET CLIMATE STATION")}
  </text>
  ${statusLines
    .map(
      (line, index) => `<text x="120" y="${235 + index * 24}" fill="#38bdf8" font-family="Inter, system-ui, sans-serif" font-size="20" font-weight="600">
    ${escapeText(line)}
  </text>`
    )
    .join("\n")}
  <text x="120" y="${300 + (statusLines.length - 1) * 20}" fill="#f8fafc" font-family="Inter, system-ui, sans-serif" font-size="32" font-weight="600">
    ${escapeText(`Market climate: ${assessment.regime}`)}
  </text>
  ${descriptionLines
    .map(
      (line, index) => `<text x="120" y="${340 + (statusLines.length - 1) * 20 + index * 28}" fill="#cbd5f5" font-family="Inter, system-ui, sans-serif" font-size="20">
    ${escapeText(line)}
  </text>`
    )
    .join("\n")}
  <text x="120" y="430" fill="#e2e8f0" font-family="Inter, system-ui, sans-serif" font-size="18">
    ${escapeText(`Record date: ${recordDateLabel}`)}
  </text>
  <text x="120" y="460" fill="#e2e8f0" font-family="Inter, system-ui, sans-serif" font-size="18">
    ${escapeText(`Fetched at: ${fetchedAtLabel}`)}
  </text>
  <text x="120" y="490" fill="#e2e8f0" font-family="Inter, system-ui, sans-serif" font-size="18">
    ${escapeText(`Base rate: ${baseRateLabel} · 10Y-2Y slope: ${slopeLabel}`)}
  </text>
  <text x="120" y="530" fill="#94a3b8" font-family="Inter, system-ui, sans-serif" font-size="16">
    ${escapeText("Source: FRED CSV Treasury series (DGS1MO/DGS3MO/DGS2/DGS10)")}
  </text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
