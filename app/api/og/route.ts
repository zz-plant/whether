/**
 * Open Graph SVG generator for shareable Market Climate Station time machine configurations.
 * Keeps time travel snapshots discoverable with contextual market climate metadata.
 */
import { evaluateRegime } from "../../../lib/regimeEngine";
import { snapshotData } from "../../../lib/snapshot";
import { fetchTreasuryData } from "../../../lib/treasuryClient";
import {
  parseTimeMachineRequest,
  resolveTimeMachineSelection,
} from "../../../lib/timeMachineSelection";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const formatDateValue = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : dateFormatter.format(date);
};

const formatTimestampValue = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : timestampFormatter.format(date);
};

const formatRateValue = (value: number | null) => {
  if (typeof value !== "number") {
    return "n/a";
  }
  return `${value.toFixed(2)}%`;
};

const escapeText = (value: string) => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const wrapText = (value: string, maxLength: number) => {
  const words = value.split(" ");
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

export const runtime = "edge";
export const revalidate = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
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
  const recordDateLabel = formatDateValue(treasury.record_date);
  const fetchedAtLabel = formatTimestampValue(treasury.fetched_at);
  const baseRateLabel = formatRateValue(assessment.scores.baseRate);
  const slopeLabel = formatRateValue(assessment.scores.curveSlope);

  const statusLabel = selection
    ? selection.banner
    : requestedSelection
      ? "Time Machine selection unavailable"
      : treasury.isLive
        ? "Live (high confidence)"
        : "Cached (medium)";

  const descriptionLines = wrapText(assessment.description, 60);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#020617" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="highlight" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="rgba(56,189,248,0.12)" />
      <stop offset="50%" stop-color="rgba(56,189,248,0)" />
      <stop offset="100%" stop-color="rgba(56,189,248,0.12)" />
    </linearGradient>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#020617" flood-opacity="0.6" />
    </filter>
    <mask id="highlightMask">
      <rect x="60" y="60" width="1080" height="510" rx="32" fill="white" />
    </mask>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
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
  <rect
    x="60"
    y="120"
    width="1080"
    height="120"
    fill="url(#highlight)"
    mask="url(#highlightMask)"
  />
  <text x="120" y="150" fill="#e2e8f0" font-family="Inter, system-ui, sans-serif" font-size="42" font-weight="600">
    ${escapeText("Whether Report")}
  </text>
  <text x="120" y="190" fill="#94a3b8" font-family="Inter, system-ui, sans-serif" font-size="18" letter-spacing="2">
    ${escapeText("MARKET CLIMATE STATION")}
  </text>
  <text x="120" y="235" fill="#38bdf8" font-family="Inter, system-ui, sans-serif" font-size="20" font-weight="600">
    ${escapeText(statusLabel)}
  </text>
  <text x="120" y="300" fill="#f8fafc" font-family="Inter, system-ui, sans-serif" font-size="32" font-weight="600">
    ${escapeText(`Market climate: ${assessment.regime}`)}
  </text>
  ${descriptionLines
    .map(
      (line, index) => `<text x="120" y="${340 + index * 28}" fill="#cbd5f5" font-family="Inter, system-ui, sans-serif" font-size="20">
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
    ${escapeText("Source: US Treasury Fiscal Data API")}
  </text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
