import type { TreasuryMetadata } from "../types";

/**
 * How confident the provenance strip is allowed to sound.
 *
 * This was two ternary chains in `reportDataLoader`, one for treasury and one
 * for macro, nested three deep and sharing a shape without sharing code. They
 * are the same policy read over different evidence — is this a replay, did it
 * come from the canonical ingestion, is the underlying feed live — and the only
 * real difference is what a replay is called. Written as nested conditionals,
 * nothing said that, and nothing showed whether a branch was reachable.
 */

/*
 * `canonical` read "Canonical snapshot (high confidence)" and `live` "Live (high
 * confidence)" until 2026-10-07. Nothing here computes a confidence: these say
 * where the reading came from, and the published confidence (`confidence.ts`) is
 * a separate figure that on Oct 5, 2026 was Medium. "Canonical snapshot" was the
 * pipeline's name for a reading the scheduled update recorded; the reader's is
 * that it is the latest one recorded.
 */
export const PROVENANCE_STATUS = {
  canonical: "Latest recorded reading",
  live: "Live reading",
  cached: "Cached (medium)",
  simulated: "Simulated (low)",
  treasuryOnly: "Treasury-only (low)",
  historicalAligned: "Historical aligned (medium)",
  historicalPartial: "Historical aligned (partial)",
} as const;

export type ProvenanceStatusLabel = (typeof PROVENANCE_STATUS)[keyof typeof PROVENANCE_STATUS];

/**
 * What the loader's own fallback (`buildFallbackReportData`) stamps on a strip
 * when report assembly failed outright. Kept beside the policy labels so the
 * strip can be keyed on every value it will ever be handed.
 */
export const PROVENANCE_FALLBACK_STATUS = {
  cached: "Cached (fallback)",
  unavailable: "Unavailable (fallback)",
} as const;

/**
 * The playbook catalog is written, not read from a feed, so no tier applies.
 * It used to borrow "Simulated (low)", which on a strip reads as a replayed
 * market reading of low quality.
 */
export const PROVENANCE_CATALOG_STATUS = "Curated catalog (static)";

type ProvenanceStripStatus =
  | ProvenanceStatusLabel
  | (typeof PROVENANCE_FALLBACK_STATUS)[keyof typeof PROVENANCE_FALLBACK_STATUS]
  | typeof PROVENANCE_CATALOG_STATUS;

/**
 * A replay reports what its coverage supports and stops there — it never claims
 * the canonical or live tiers, whatever else is loaded.
 */
export const historicalMacroStatus = (
  coverageMode: string | undefined,
): ProvenanceStatusLabel => {
  if (coverageMode === "historical-aligned") return PROVENANCE_STATUS.historicalAligned;
  if (coverageMode === "historical-partial") return PROVENANCE_STATUS.historicalPartial;
  return PROVENANCE_STATUS.treasuryOnly;
};

export const resolveProvenanceStatus = ({
  historicalLabel,
  isCanonical,
  isLive,
}: {
  /** Set only for a replay, and then it wins outright. */
  historicalLabel?: ProvenanceStatusLabel;
  isCanonical: boolean;
  isLive: boolean;
}): ProvenanceStatusLabel => {
  if (historicalLabel) return historicalLabel;
  if (isCanonical) return PROVENANCE_STATUS.canonical;
  return isLive ? PROVENANCE_STATUS.live : PROVENANCE_STATUS.cached;
};

/**
 * The treasury source as a reader names it. Every summary's source line read
 * "Canonical ingestion (FRED)" until 2026-10-07, and the saved operating
 * snapshot's "Canonical snapshot (FRED)": the pipeline's names for where a
 * reading came from, where a reader wants the publisher.
 */
export const FRED_SOURCE_LABEL = "Federal Reserve Economic Data (FRED)";

/**
 * A stored source label as a reader should meet it. Operating snapshots written
 * before 2026-10-07 still carry "Canonical snapshot (FRED)", and a brief
 * document can be built from one, so the publisher's name replaces the
 * pipeline's at read; the saved-copy marker already says when the numbers are
 * not a live read.
 */
export const publisherSourceLabel = (sourceLabel: string) =>
  /^canonical\b/i.test(sourceLabel) ? FRED_SOURCE_LABEL : sourceLabel;

/** One provenance strip's worth of facts, as the loader hands it to a page. */
export type ReportProvenance = {
  sourceLabel: string;
  sourceUrl?: string;
  recordDateLabel: string;
  timestampLabel: string;
  ageLabel: string;
  statusLabel: ProvenanceStripStatus;
};

/**
 * Whether a reading is a saved copy rather than a live one. The treasury client stamps
 * `fallback_at` and `fallback_reason` when it serves the bundled or stored copy, and either
 * alone marks it. Seventeen call sites spelled this test out by hand.
 */
export const isSavedCopy = (
  record: Pick<TreasuryMetadata, "fallback_at" | "fallback_reason"> | null | undefined,
): boolean => Boolean(record?.fallback_at || record?.fallback_reason);
