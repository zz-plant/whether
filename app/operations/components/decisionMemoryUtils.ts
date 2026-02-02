import type { RegimeAssessment } from "../../../lib/regimeEngine";
import { formatTimestampUTC } from "../../../lib/formatters";

export type DecisionMemoryEntry = {
  id: string;
  title: string;
  note: string;
  regime: RegimeAssessment["regime"];
  constraints: string[];
  confidence: string;
  recordDate: string;
  loggedAt: string;
  sourceLabel: string;
  sourceUrl: string | null;
  thresholds?: RegimeAssessment["thresholds"];
  inputs?: RegimeAssessment["inputs"];
  scores?: RegimeAssessment["scores"];
};

export type StructuredDecisionNote = {
  summary: string;
  bullets: string[];
  tags: string[];
};

export const structureDecisionNote = (note: string): StructuredDecisionNote => {
  const trimmed = note.trim();
  if (!trimmed) {
    return { summary: "", bullets: [], tags: [] };
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const tags = Array.from(trimmed.matchAll(/(^|\s)#([a-z0-9-_]+)/gi))
    .map((match) => match[2].toLowerCase())
    .filter((tag, index, self) => self.indexOf(tag) === index);

  const bulletLines = lines
    .filter((line) => /^[-*•]\s+/.test(line))
    .map((line) => line.replace(/^[-*•]\s+/, ""));

  const summaryLine =
    lines.find((line) => !/^[-*•]\s+/.test(line)) ?? bulletLines[0] ?? "";
  const summary = summaryLine.replace(/#([a-z0-9-_]+)/gi, "").replace(/\s{2,}/g, " ").trim();

  return {
    summary,
    bullets: bulletLines,
    tags,
  };
};

export const formatMetricValue = (value: number | null | undefined, unit: string) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Unavailable";
  }
  return `${value.toFixed(2)}${unit}`;
};

export const formatBaseRate = (scores?: RegimeAssessment["scores"]) => {
  if (!scores || scores.baseRateUsed === "MISSING") {
    return "Unavailable";
  }
  return `${scores.baseRate.toFixed(2)}% (${scores.baseRateUsed})`;
};

export const formatCurveSlope = (scores?: RegimeAssessment["scores"]) =>
  formatMetricValue(scores?.curveSlope ?? null, "%");

export const buildThresholdSummary = (thresholds?: RegimeAssessment["thresholds"]) => {
  if (!thresholds) {
    return [];
  }
  return [
    `Base rate tightness trigger: ${thresholds.baseRateTightness}%`,
    `Tightness regime trigger: ${thresholds.tightnessRegime}`,
    `Risk appetite regime trigger: ${thresholds.riskAppetiteRegime}`,
  ];
};

export const buildSourceSummary = (inputs?: RegimeAssessment["inputs"]) => {
  if (!inputs || inputs.length === 0) {
    return [];
  }
  return inputs.map((input) => {
    const valueLabel = formatMetricValue(input.value, input.unit);
    return `${input.label}: ${valueLabel} · ${input.sourceLabel} · ${input.recordDate}`;
  });
};

export const buildSnapshotText = (entry: DecisionMemoryEntry) => {
  const thresholdLines = buildThresholdSummary(entry.thresholds);
  const sourceLines = buildSourceSummary(entry.inputs);
  const baseRateText = formatBaseRate(entry.scores);
  const curveSlopeText = formatCurveSlope(entry.scores);

  return [
    "Decision Memory — Whether Report",
    `Decision: ${entry.title}`,
    entry.note ? `Notes: ${entry.note}` : null,
    `Regime: ${entry.regime}`,
    `Confidence: ${entry.confidence}`,
    `Record date: ${entry.recordDate}`,
    `Logged at: ${formatTimestampUTC(entry.loggedAt)}`,
    "",
    "Sensor snapshot:",
    `Base rate: ${baseRateText}`,
    `Curve slope (10Y-2Y): ${curveSlopeText}`,
    "",
    "Thresholds in force:",
    ...thresholdLines.map((threshold) => `• ${threshold}`),
    "",
    "Constraints in force:",
    ...entry.constraints.map((constraint) => `• ${constraint}`),
    "",
    sourceLines.length > 0 ? "Sources:" : null,
    ...sourceLines.map((source) => `• ${source}`),
    "",
    `Source: ${entry.sourceLabel}`,
    entry.sourceUrl ? `Source URL: ${entry.sourceUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");
};

const buildSnapshotLink = (entry: DecisionMemoryEntry) => {
  if (typeof window === "undefined") {
    return "";
  }
  const params = new URLSearchParams(window.location.search);
  params.set("decisionSnapshot", JSON.stringify(entry));
  params.set("decisionId", entry.id);
  const query = params.toString();
  return `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ""}`;
};

type DecisionTemplateTarget = "jira" | "linear" | "confluence";

export const buildDecisionTemplate = (entry: DecisionMemoryEntry, target: DecisionTemplateTarget) => {
  const snapshotLink = buildSnapshotLink(entry);
  const isConfluence = target === "confluence";
  const headingPrefix = isConfluence ? "h3. " : "### ";
  const listPrefix = isConfluence ? "* " : "- ";
  const formatLink = (label: string, href: string) =>
    isConfluence ? `[${label}|${href}]` : `[${label}](${href})`;
  const formatSection = (title: string, lines: string[]) => {
    const body = lines.map((line) => `${listPrefix}${line}`).join("\n");
    return `${headingPrefix}${title}\n${body}`;
  };

  const contextLines = [
    `Regime: ${entry.regime}`,
    `Record date: ${entry.recordDate}`,
    `Base rate: ${formatBaseRate(entry.scores)}`,
    `Curve slope (10Y-2Y): ${formatCurveSlope(entry.scores)}`,
    snapshotLink ? `Snapshot: ${formatLink("Decision snapshot", snapshotLink)}` : null,
  ].filter(Boolean) as string[];

  const decisionLines = [
    `Decision: ${entry.title}`,
    entry.note ? `Notes: ${entry.note}` : null,
  ].filter(Boolean) as string[];

  const constraintsLines = entry.constraints.length > 0 ? entry.constraints : ["None noted"];
  const confidenceLines = [`Confidence: ${entry.confidence}`];
  const thresholdLines = buildThresholdSummary(entry.thresholds);
  const sourceLines = buildSourceSummary(entry.inputs);

  return [
    formatSection("Context", contextLines),
    formatSection("Decision", decisionLines),
    ...(thresholdLines.length ? [formatSection("Thresholds", thresholdLines)] : []),
    ...(sourceLines.length ? [formatSection("Sources", sourceLines)] : []),
    formatSection("Constraints", constraintsLines),
    formatSection("Confidence", confidenceLines),
  ].join("\n\n");
};

export const buildStructuredDecisionEntry = (entry: DecisionMemoryEntry) => ({
  ...entry,
  noteData: structureDecisionNote(entry.note),
});
