/**
 * Freeze the current week's brief to a permanent dated URL.
 *
 * Run once per publishing cycle (`bun run brief:freeze`). Appends the current ISO
 * week to `data/published_briefs.json`; existing weeks are left untouched unless
 * `--force` is passed, because a published brief that silently changes is not a
 * citable record.
 *
 * The record itself is built by `lib/report/publishedBriefRecord.ts`, which the
 * brief-freeze Workflow (worker/workflows/weeklyBriefFreeze.ts) shares, so the two
 * writers cannot drift. Readiness is judged there too — on the fallback and freshness
 * flags, not only on `degraded`, which stays false through a total live-data outage
 * (lib/report/briefPublishGuard.ts has the 2026-08-29 history of why).
 */
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { parsePublishedBriefs } from "../lib/report/publishedBriefs";
import { assembleCurrentWeekBrief } from "../lib/report/publishedBriefRecord";

const OUTPUT_PATH = new URL("../data/published_briefs.json", import.meta.url);

const force = process.argv.includes("--force");

const existing = parsePublishedBriefs(JSON.parse(await readFile(OUTPUT_PATH, "utf8")));

const assembled = await assembleCurrentWeekBrief({
  route: "brief:freeze",
  findExisting: (slug) => existing.find((brief) => brief.slug === slug),
});

if (!assembled.ok) {
  console.error(`Refusing to freeze: ${assembled.reason}`);
  console.error("The published archive is append-only, so a wrong record cannot be withdrawn. Retry when live data returns.");
  process.exit(1);
}

const { slug, record } = assembled;

/*
 * The workflow names its pull-request branch after the week, so an unmerged
 * week is never reset by the next one. Emitted before the already-published
 * exit below so the branch name is always defined.
 */
if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, `slug=${slug}\n`);
}

const existingRecord = existing.find((brief) => brief.slug === slug);

if (existingRecord && !force) {
  console.log(`Week ${slug} is already published; leaving it unchanged. Pass --force to overwrite.`);
  process.exit(0);
}

const next = [...existing.filter((brief) => brief.slug !== slug), record].sort((a, b) =>
  a.publishedAt.localeCompare(b.publishedAt),
);

await writeFile(OUTPUT_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
console.log(`Froze week ${slug} (${next.length} published briefs total).`);
