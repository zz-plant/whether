import { createHash } from "crypto";
import type { MonthlySummary } from "./monthlySummary";
import type { WeeklySummary } from "./weeklySummary";

type SummaryHashInput = MonthlySummary | WeeklySummary;

type StableSummaryPayload = {
  title: string;
  summary: string;
  regime: string;
  regimeLabel: string;
  guidance: string;
  constraints: string[];
  recordDateLabel: string | null;
  provenance: {
    sourceLabel: string;
    sourceUrl?: string;
  };
};

const buildStableSummaryPayload = (summary: SummaryHashInput): StableSummaryPayload => ({
  title: summary.title,
  summary: summary.summary,
  regime: summary.regime,
  regimeLabel: summary.regimeLabel,
  guidance: summary.guidance,
  constraints: summary.constraints,
  recordDateLabel: summary.recordDateLabel,
  provenance: {
    sourceLabel: summary.provenance.sourceLabel,
    sourceUrl: summary.provenance.sourceUrl,
  },
});

export const buildSummaryHash = (summary: SummaryHashInput) =>
  createHash("sha256").update(JSON.stringify(buildStableSummaryPayload(summary))).digest("hex");
