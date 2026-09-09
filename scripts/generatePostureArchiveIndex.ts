/**
 * Posture archive index generator.
 *
 * Compresses `data/summary_archive.json` (~4.5MB, 686 entries) into the small
 * per-period records the static `/history/[period]` routes render. The full
 * archive stays out of route bundles — see
 * docs/research/2026-03-09-cloudflare-bundle-composition.md for why that matters.
 */
import { writeFile } from "node:fs/promises";
import { getSummaryArchive, type SummaryArchiveEntry } from "../lib/summary/summaryArchive";
import { getRegimePublicLabel } from "../lib/regimePresentation";
import type { RegimeKey } from "../lib/regimeEngine";
import type { PostureArchivePeriod, PostureArchiveRegimeShare } from "../lib/summary/postureArchiveTypes";

const OUTPUT_PATH = new URL("../data/posture_archive_index.json", import.meta.url);
/** Tiny companion file so client bundles can link the archive without the full index. */
const YEARS_OUTPUT_PATH = new URL("../data/posture_archive_years.json", import.meta.url);
/** Minimal chart data for the OG renderer, which must not bundle the full index. */
const OG_TIMELINE_OUTPUT_PATH = new URL("../data/posture_og_timeline.json", import.meta.url);

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

const formatDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? value : dateFormatter.format(parsed);
};

const quarterOf = (asOf: string) => Math.floor(new Date(asOf).getUTCMonth() / 3) + 1;

/**
 * Older archive entries were generated with the presentation regime label
 * ("Growth Mode") where the copy template already appended "mode", leaving
 * "Growth Mode mode" in 80 of 81 stored summaries. The stored data is not
 * regenerated (that would require refetching the full FRED history), so the
 * duplication is collapsed here at index time.
 */
const normalizeModeWording = (value: string) => value.replace(/\bMode mode\b/g, "Mode");

const quarterSlug = (year: number, quarter: number) => `${year}-q${quarter}`;

/** Ordered sample of the finest-grained series that covers a period. */
type Sample = { asOf: string; regime: RegimeKey };

const collectSamples = (
  entries: SummaryArchiveEntry[],
  cadence: "weekly" | "monthly",
  matches: (entry: SummaryArchiveEntry) => boolean,
): Sample[] =>
  entries
    .filter((entry) => entry.cadence === cadence && matches(entry))
    .map((entry) => ({ asOf: entry.asOf, regime: entry.summary.regime }))
    .sort((a, b) => a.asOf.localeCompare(b.asOf));

const buildRegimeMix = (samples: Sample[]): PostureArchiveRegimeShare[] => {
  const counts = new Map<RegimeKey, number>();
  for (const sample of samples) {
    counts.set(sample.regime, (counts.get(sample.regime) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([regime, periods]) => ({
      regime,
      label: getRegimePublicLabel(regime),
      periods,
      share: Math.round((periods / samples.length) * 100),
    }))
    .sort((a, b) => b.periods - a.periods);
};

const buildTransitions = (samples: Sample[]) => {
  const transitions: PostureArchivePeriod["transitions"] = [];

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (previous.regime === current.regime) continue;

    transitions.push({
      asOf: current.asOf,
      dateLabel: formatDate(current.asOf),
      from: previous.regime,
      fromLabel: getRegimePublicLabel(previous.regime),
      to: current.regime,
      toLabel: getRegimePublicLabel(current.regime),
    });
  }

  return transitions;
};

const buildRates = (entry: SummaryArchiveEntry) =>
  entry.summary.inputs.map((input) => ({
    label: input.label,
    value: input.value,
    unit: input.unit,
    sourceUrl: input.sourceUrl,
  }));

const buildPeriod = ({
  entry,
  slug,
  kind,
  title,
  quarter,
  samples,
  sampleCadence,
}: {
  entry: SummaryArchiveEntry;
  slug: string;
  kind: PostureArchivePeriod["kind"];
  title: string;
  quarter?: number;
  samples: Sample[];
  sampleCadence: "weekly" | "monthly" | null;
}): PostureArchivePeriod => ({
  slug,
  kind,
  year: entry.year,
  quarter,
  title,
  asOf: entry.asOf,
  recordDateLabel: entry.summary.recordDateLabel ?? formatDate(entry.asOf),
  regime: entry.summary.regime,
  regimeLabel: entry.summary.regimeLabel,
  operatorLabel: getRegimePublicLabel(entry.summary.regime),
  headline: normalizeModeWording(entry.summary.summary),
  guidance: entry.summary.guidance,
  constraints: entry.summary.constraints,
  rates: buildRates(entry),
  sourceLabel: entry.summary.provenance.sourceLabel,
  sourceUrl: entry.summary.provenance.sourceUrl,
  statusLabel: entry.summary.provenance.statusLabel,
  sampleCadence,
  sampleCount: samples.length,
  regimeMix: samples.length ? buildRegimeMix(samples) : [],
  transitions: samples.length ? buildTransitions(samples) : [],
  children: [],
  parentSlug: null,
  previousSlug: null,
  nextSlug: null,
});

const generate = () => {
  const archive = getSummaryArchive();

  if (!archive.length) {
    throw new Error("Summary archive is empty or failed validation; refusing to write an empty index.");
  }

  const yearEntries = archive.filter(
    (entry): entry is Extract<SummaryArchiveEntry, { cadence: "yearly" }> => entry.cadence === "yearly",
  );
  const quarterEntries = archive.filter(
    (entry): entry is Extract<SummaryArchiveEntry, { cadence: "quarterly" }> => entry.cadence === "quarterly",
  );

  /** Weekly coverage starts in 2018; monthly in 2012. Use the finest series available per period. */
  const resolveSamples = (matches: (entry: SummaryArchiveEntry) => boolean) => {
    const weekly = collectSamples(archive, "weekly", matches);
    if (weekly.length >= 2) return { samples: weekly, cadence: "weekly" as const };

    const monthly = collectSamples(archive, "monthly", matches);
    if (monthly.length >= 2) return { samples: monthly, cadence: "monthly" as const };

    return { samples: [] as Sample[], cadence: null };
  };

  const years = yearEntries.map((entry) => {
    const { samples, cadence } = resolveSamples((candidate) => candidate.year === entry.year);
    return buildPeriod({
      entry,
      slug: String(entry.year),
      kind: "year",
      title: String(entry.year),
      samples,
      sampleCadence: cadence,
    });
  });

  const yearSlugs = new Set(years.map((year) => year.slug));

  const quarters = quarterEntries.map((entry) => {
    const quarter = entry.quarter || quarterOf(entry.asOf);
    const { samples, cadence } = resolveSamples(
      (candidate) => candidate.year === entry.year && quarterOf(candidate.asOf) === quarter,
    );

    const period = buildPeriod({
      entry,
      slug: quarterSlug(entry.year, quarter),
      kind: "quarter",
      title: `Q${quarter} ${entry.year}`,
      quarter,
      samples,
      sampleCadence: cadence,
    });

    // Years without an annual summary (currently 2026) get no page, so those
    // quarters point back at the archive hub rather than a 404.
    period.parentSlug = yearSlugs.has(String(entry.year)) ? String(entry.year) : null;
    return period;
  });

  for (const year of years) {
    year.children = quarters
      .filter((quarter) => quarter.year === year.year)
      .map((quarter) => ({
        slug: quarter.slug,
        title: quarter.title,
        regime: quarter.regime,
        operatorLabel: quarter.operatorLabel,
        guidance: quarter.guidance,
      }));
  }

  const linkSiblings = (periods: PostureArchivePeriod[]) => {
    const ordered = [...periods].sort((a, b) => a.asOf.localeCompare(b.asOf));
    ordered.forEach((period, index) => {
      period.previousSlug = ordered[index - 1]?.slug ?? null;
      period.nextSlug = ordered[index + 1]?.slug ?? null;
    });
    return ordered;
  };

  return [...linkSiblings(years), ...linkSiblings(quarters)];
};

const periods = generate();
await writeFile(OUTPUT_PATH, `${JSON.stringify(periods, null, 2)}\n`, "utf8");

const years = periods
  .filter((period) => period.kind === "year")
  .sort((a, b) => b.year - a.year)
  .map((period) => ({ slug: period.slug, title: period.title, operatorLabel: period.operatorLabel }));
await writeFile(YEARS_OUTPUT_PATH, `${JSON.stringify(years, null, 2)}\n`, "utf8");

const ogTimeline = periods
  .filter((period) => period.kind === "quarter")
  .sort((a, b) => a.asOf.localeCompare(b.asOf))
  .map((period) => ({
    label: period.title,
    regime: period.regime,
    intensity: Math.max(0.35, (period.regimeMix[0]?.share ?? 50) / 100),
  }));
await writeFile(OG_TIMELINE_OUTPUT_PATH, `${JSON.stringify(ogTimeline, null, 2)}\n`, "utf8");

const quarterCount = periods.filter((period) => period.kind === "quarter").length;
console.log(
  `Wrote ${periods.length} posture archive periods (${years.length} yearly, ${quarterCount} quarterly) and compact OG timeline data`,
);
