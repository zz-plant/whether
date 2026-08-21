/**
 * Freeze the current week's brief to a permanent dated URL.
 *
 * Run once per publishing cycle (`bun run brief:freeze`). Appends the current ISO
 * week to `data/published_briefs.json`; existing weeks are left untouched unless
 * `--force` is passed, because a published brief that silently changes is not a
 * citable record.
 */
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { loadWeeklyBriefSnapshot } from "../lib/report/weeklyBriefSnapshot";
import { formatIsoWeekSlug, getIsoWeekInfo } from "../lib/isoWeek";
import { parsePublishedBriefs, type PublishedBrief } from "../lib/report/publishedBriefs";

const OUTPUT_PATH = new URL("../data/published_briefs.json", import.meta.url);

const force = process.argv.includes("--force");

const { reportData, degraded, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "brief:freeze" });

if (degraded) {
  console.error("Refusing to freeze a degraded snapshot — the record would be wrong forever. Retry when live data returns.");
  process.exit(1);
}

const { homeBriefModel } = snapshot;
const recordDate = reportData.treasury.record_date ?? reportData.treasury.fetched_at;
const isoWeek = getIsoWeekInfo(new Date(recordDate));
const slug = formatIsoWeekSlug(isoWeek);

/*
 * The workflow names its pull-request branch after the week, so an unmerged
 * week is never reset by the next one. Emitted before the already-published
 * exit below so the branch name is always defined.
 */
if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, `slug=${slug}\n`);
}

const existing = parsePublishedBriefs(JSON.parse(await readFile(OUTPUT_PATH, "utf8")));

if (existing.some((brief) => brief.slug === slug) && !force) {
  console.log(`Week ${slug} is already published; leaving it unchanged. Pass --force to overwrite.`);
  process.exit(0);
}

const record: PublishedBrief = {
  slug,
  year: isoWeek.year,
  week: isoWeek.week,
  publishedAt: new Date(recordDate).toISOString(),
  recordDate,
  recordDateLabel: reportData.recordDateLabel,
  headline: `${homeBriefModel.postureWithStageLabel} — week of ${reportData.recordDateLabel}`,
  summary: homeBriefModel.operatingStanceLine,
  postureLabel: homeBriefModel.postureWithStageLabel,
  regime: reportData.assessment.regime,
  confidenceLabel: homeBriefModel.confidenceLabel,
  whatChanged: homeBriefModel.weeklyMovement.summary ?? "No material change from the prior week.",
  actionNow: reportData.actionNowShort,
  guardrailThreshold: reportData.guardrailThreshold,
  flipThreshold: reportData.flipThreshold,
  decisions: homeBriefModel.decisionRules.map((rule) => ({
    area: rule.area,
    call: rule.recommendation,
    doNow: rule.doNow[0] ?? "",
    pauseTrigger: rule.pauseTrigger,
    resumeTrigger: rule.resumeTrigger,
  })),
  evidence: reportData.reportEvidenceItems.map((item) => ({
    title: item.title,
    detail: item.immediateImplication,
    sourceUrl: reportData.treasury.source,
  })),
  sourceLabel: reportData.treasuryProvenance?.statusLabel ?? "US Treasury via FRED",
  sourceUrl: reportData.treasury.source,
  freshnessLabel: reportData.fetchedAtLabel,
  correction: null,
};

const next = [...existing.filter((brief) => brief.slug !== slug), record].sort((a, b) =>
  a.publishedAt.localeCompare(b.publishedAt),
);

await writeFile(OUTPUT_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
console.log(`Froze week ${slug} (${next.length} published briefs total).`);
