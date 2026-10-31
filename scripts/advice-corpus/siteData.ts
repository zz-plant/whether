#!/usr/bin/env bun
/**
 * The two committed data files, and the check that holds them together.
 *
 * - `data/advice-corpus/posts.json`: derived metadata for every classified post (no text),
 *   written from the local cache with `--from-labels`.
 * - `data/advice-corpus/monthly.json`: the monthly and quarterly stance shares `/concepts`
 *   draws, generated from posts.json alone.
 *
 *   bun run advice-corpus:data                 # regenerate monthly.json from posts.json
 *   bun run advice-corpus:data -- --from-labels # rebuild posts.json from the cache first
 *   bun run advice-corpus:data -- --check       # exit 1 if monthly.json is not what posts.json gives
 *
 * `tests/adviceCorpusData.test.ts` runs the check, so the series cannot drift from the labels.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";

import { eraShares, monthGrid, periodShares, PRIMARY, quarterOf, selectPosts, type CorpusPost } from "./analysis";
import { DATA_DIR, MONTHLY_PATH, POSTS_PATH, STUDY_END, STUDY_START } from "./paths";

const pad = (value: number) => String(value).padStart(2, "0");
export const FIRST_MONTH = `${STUDY_START.year}-${pad(STUDY_START.month)}`;
export const LAST_MONTH = `${STUDY_END.year}-${pad(STUDY_END.month)}`;

export const PostEntrySchema = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
  source: z.string(),
  firm: z.string(),
  author: z.string().nullable(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  prefilter: z.enum(["candidate", "sample"]),
  capitalRelevant: z.boolean(),
  audience: z.enum(["founders", "lps", "general"]),
  stance: z.enum(["expand", "conserve", "craft", "none"]),
  metrics: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
  evidence: z.string(),
  evidenceVerbatim: z.boolean(),
});
export type PostEntry = z.infer<typeof PostEntrySchema>;

const CountsSchema = z.record(z.string(), z.number());

export const PostsFileSchema = z.object({
  study: z.literal("advice-corpus"),
  promptVersion: z.string(),
  labelModel: z.string(),
  window: z.object({ first: z.string(), last: z.string() }),
  counts: CountsSchema,
  bySource: z.record(z.string(), CountsSchema),
  posts: z.array(PostEntrySchema),
});
export type PostsFile = z.infer<typeof PostsFileSchema>;

export const toCorpusPost = (post: PostEntry): CorpusPost => ({
  id: post.id,
  firm: post.firm,
  month: post.month,
  prefilter: post.prefilter,
  capitalRelevant: post.capitalRelevant,
  audience: post.audience,
  stance: post.stance,
  metrics: post.metrics,
  confidence: post.confidence,
});

const round = (value: number) => (Number.isFinite(value) ? Math.round(value * 10_000) / 10_000 : null);

/** monthly.json, from posts.json alone: the primary set's firm-weighted shares by month and by quarter. */
export function buildMonthlyFile(postsFile: PostsFile) {
  const eligible = selectPosts(postsFile.posts.map(toCorpusPost), PRIMARY);
  const months = monthGrid(postsFile.window.first, postsFile.window.last);
  const quarters = [...new Set(months.map(quarterOf))];
  const rows = (periods: readonly string[], periodOf: (month: string) => string) =>
    periodShares(eligible, periods, periodOf).map((row) => ({
      period: row.period,
      posts: row.n,
      firms: row.firms,
      expand: round(row.shares.expand),
      conserve: round(row.shares.conserve),
      craft: round(row.shares.craft),
      none: round(row.shares.none),
    }));
  return {
    study: "advice-corpus",
    promptVersion: postsFile.promptVersion,
    labelModel: postsFile.labelModel,
    eligible: "capital-relevant posts addressed to founders, prefilter candidates; each firm present in a period weighs equally",
    eligiblePosts: eligible.length,
    firms: [...new Set(eligible.map((post) => post.firm))].sort(),
    /** Eligible posts per firm, so a reader can see who the sample is made of. */
    firmPosts: [...new Set(eligible.map((post) => post.firm))]
      .sort()
      .map((firm) => ({ firm, posts: eligible.filter((post) => post.firm === firm).length }))
      .sort((left, right) => right.posts - left.posts || left.firm.localeCompare(right.firm)),
    eras: eraShares(eligible).map((era) => ({
      from: era.from,
      to: era.to,
      fundingPressure: era.fundingPressure,
      posts: era.posts,
      firms: era.firms,
      expand: round(era.expand),
      conserve: round(era.conserve),
      craft: round(era.craft),
      none: round(era.none),
    })),
    months: rows(months, (month) => month),
    quarters: rows(quarters, quarterOf),
  };
}

/**
 * JSON with one top-level key per line and one array element per line, so a diff of the
 * committed files shows which posts or periods moved.
 */
export function serialise(value: Record<string, unknown>): string {
  const lines = Object.entries(value).map(([key, entry]) => {
    const body = Array.isArray(entry) && entry.some((item) => typeof item === "object" && item !== null)
      ? `[\n${entry.map((item) => `  ${JSON.stringify(item)}`).join(",\n")}\n ]`
      : JSON.stringify(entry);
    return ` ${JSON.stringify(key)}: ${body}`;
  });
  return `{\n${lines.join(",\n")}\n}\n`;
}

export function readPostsFile(path = POSTS_PATH): PostsFile {
  return PostsFileSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

/** Null when monthly.json is exactly what posts.json generates; otherwise what differs. */
export function monthlyDrift(postsPath = POSTS_PATH, monthlyPath = MONTHLY_PATH): string | null {
  if (!existsSync(postsPath)) return `${postsPath} is missing`;
  if (!existsSync(monthlyPath)) return `${monthlyPath} is missing`;
  const expected = serialise(buildMonthlyFile(readPostsFile(postsPath)));
  const actual = readFileSync(monthlyPath, "utf8");
  if (expected === actual) return null;
  const expectedLines = expected.split("\n");
  const actualLines = actual.split("\n");
  const first = expectedLines.findIndex((line, index) => line !== actualLines[index]);
  return `monthly.json differs from what posts.json generates, first at line ${first + 1}: expected ${JSON.stringify(expectedLines[first])}, found ${JSON.stringify(actualLines[first])}. Run \`bun run advice-corpus:data\`.`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--check")) {
    const drift = monthlyDrift();
    if (drift) {
      console.error(`[advice-corpus:data] ${drift}`);
      process.exit(1);
    }
    console.log("[advice-corpus:data] monthly.json matches posts.json");
    return;
  }
  mkdirSync(DATA_DIR, { recursive: true });
  if (args.includes("--from-labels")) {
    const { buildPostsFile } = await import("./postsFromCache");
    writeFileSync(POSTS_PATH, serialise(buildPostsFile()));
    console.log(`[advice-corpus:data] wrote ${POSTS_PATH}`);
  }
  writeFileSync(MONTHLY_PATH, serialise(buildMonthlyFile(readPostsFile())));
  console.log(`[advice-corpus:data] wrote ${MONTHLY_PATH}`);
}

if (import.meta.main) await main();
