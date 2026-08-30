/**
 * Backfill historical weekly published briefs from validated archive records.
 *
 * Usage:
 *   bun scripts/backfillPublishedBriefs.ts               # dry-run overview
 *   bun scripts/backfillPublishedBriefs.ts --write       # append missing weeks
 *   bun scripts/backfillPublishedBriefs.ts --year 2026   # filter by year
 */
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { formatIsoWeekSlug } from "../lib/isoWeek";
import {
  parsePublishedBriefs,
  PublishedBriefSchema,
  type PublishedBrief,
} from "../lib/report/publishedBriefs";

const OUTPUT_PATH = new URL("../data/published_briefs.json", import.meta.url);
const ARCHIVE_PATH = new URL("../data/weekly_summaries_2018_2026.json", import.meta.url);

type ArchiveSummaryEntry = {
  year: number;
  week: number;
  asOf: string;
  record_date: string;
  summary: {
    title?: string;
    summary: string;
    regime: "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION";
    regimeLabel?: string;
    guidance?: string;
    confidence: string;
    transitionWatch?: boolean;
    intensity?: string;
    constraints?: string[];
    recordDateLabel: string;
    provenance?: {
      sourceLabel: string;
      sourceUrl?: string;
      timestampLabel?: string;
      statusLabel?: string;
    };
    inputs?: Array<{
      id: string;
      label: string;
      value: number;
      unit: string;
      sourceUrl?: string;
    }>;
  };
};

const run = async () => {
  const { values } = parseArgs({
    options: {
      write: { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      year: { type: "string" },
      limit: { type: "string" },
    },
  });

  const existingRaw = JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
  const existingBriefs = parsePublishedBriefs(existingRaw);
  const existingSlugs = new Set(existingBriefs.map((b) => b.slug));

  let archive: ArchiveSummaryEntry[] = [];
  try {
    archive = JSON.parse(await readFile(ARCHIVE_PATH, "utf8"));
  } catch (err) {
    console.error("Failed to read weekly summaries archive:", err);
    process.exit(1);
  }

  const targetYear = values.year ? parseInt(values.year, 10) : undefined;
  const limit = values.limit ? parseInt(values.limit, 10) : undefined;

  let candidates = archive.filter((entry) => {
    if (targetYear && entry.year !== targetYear) return false;
    return true;
  });

  if (limit) {
    candidates = candidates.slice(-limit);
  }

  const backfilled: PublishedBrief[] = [];

  for (const entry of candidates) {
    const slug = formatIsoWeekSlug({ year: entry.year, week: entry.week });

    if (existingSlugs.has(slug) && !values.force) {
      continue;
    }

    const { summary, record_date, asOf } = entry;
    const recordDate = record_date || asOf;
    const constraints = summary.constraints ?? [];

    const defaultDecisionAreas = [
      { area: "hiring", call: constraints[0] ?? "Hold staged hiring discipline." },
      { area: "product-tempo", call: "Maintain focused release cycles." },
      { area: "capital-raising", call: constraints[1] ?? "Monitor window conditions." },
      { area: "burn-discipline", call: constraints[2] ?? "Keep non-core spend gated." },
      { area: "expansion-bets", call: "Stage expansion with explicit rollback rules." },
    ];

    const candidateRecord: PublishedBrief = {
      slug,
      year: entry.year,
      week: entry.week,
      publishedAt: `${recordDate}T00:00:00.000Z`,
      recordDate,
      recordDateLabel: summary.recordDateLabel || recordDate,
      headline: `${summary.regimeLabel ?? summary.regime} — week of ${summary.recordDateLabel || recordDate}`,
      summary: summary.summary,
      postureLabel: summary.regimeLabel ?? summary.regime,
      regime: summary.regime,
      confidenceLabel: summary.confidence || "MED",
      whatChanged: summary.guidance ? `Operating focus: ${summary.guidance}` : "Historical baseline read.",
      actionNow: constraints[0] ?? "Maintain disciplined execution across operating lanes.",
      guardrailThreshold: constraints[1] ?? "Pause commitments if funding pressure rises.",
      flipThreshold: constraints[2] ?? "Re-evaluate if conditions cross boundary thresholds.",
      decisions: defaultDecisionAreas.map((d) => ({
        area: d.area,
        call: d.call,
        doNow: d.call,
        pauseTrigger: "Pause net-new commitments if funding conditions tighten.",
        resumeTrigger: "Resume normal pacing when trend confirms stability.",
      })),
      evidence: (summary.inputs ?? []).slice(0, 4).map((input) => ({
        title: input.label,
        detail: `${input.value}${input.unit}`,
        sourceUrl: input.sourceUrl,
      })),
      sourceLabel: summary.provenance?.sourceLabel ?? "US Treasury via FRED",
      sourceUrl: summary.provenance?.sourceUrl ?? "https://fred.stlouisfed.org",
      freshnessLabel: summary.provenance?.timestampLabel ?? "Historical record",
      correction: null,
    };

    const parsed = PublishedBriefSchema.safeParse(candidateRecord);
    if (!parsed.success) {
      console.warn(`Skipping invalid candidate for ${slug}:`, parsed.error.issues);
      continue;
    }

    backfilled.push(parsed.data);
  }

  console.log(`Found ${backfilled.length} candidate brief(s) to backfill.`);

  if (backfilled.length === 0) {
    console.log("No new briefs to add.");
    return;
  }

  if (!values.write) {
    console.log("Dry run only. Run with --write to append to data/published_briefs.json.");
    return;
  }

  const merged = [
    ...existingBriefs.filter((b) => !backfilled.some((bf) => bf.slug === b.slug)),
    ...backfilled,
  ].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));

  await writeFile(OUTPUT_PATH, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  console.log(`Successfully wrote ${merged.length} published brief(s) to ${OUTPUT_PATH.pathname}.`);
};

void run();
