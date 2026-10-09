#!/usr/bin/env bun
/**
 * Stage 2: title, month, author and body text for every indexed post inside the study window,
 * one JSON file per post under `.cache/advice-corpus/text/<source>/` (gitignored). Resumable:
 * a post already extracted is skipped, and the HTTP cache means a re-run after an extractor
 * fix costs no requests.
 *
 *   bun run advice-corpus:extract                  # every source
 *   bun run advice-corpus:extract -- tunguz --force # re-extract one source from the cache
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

import { extractMeta, extractText, firstMonthYear, wordCount } from "./htmlText";
import { CACHE, STUDY_END, STUDY_START } from "./paths";
import { logFailure, networkRequestCount, politeFetch, RobotsDisallowedError } from "./politeFetch";
import { inlineText, SOURCES, type IndexEntry, type Source } from "./sources";

export const ExtractedPostSchema = z.object({
  id: z.string(),
  source: z.string(),
  firm: z.string(),
  url: z.string(),
  title: z.string(),
  author: z.string().nullable(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  words: z.number(),
  text: z.string(),
});
export type ExtractedPost = z.infer<typeof ExtractedPostSchema>;

const IndexEntrySchema = z.object({
  url: z.string(),
  title: z.string().nullable(),
  published: z.string().nullable(),
  author: z.string().nullable(),
  inlineHtml: z.string().nullable(),
});

export const postId = (url: string) => createHash("sha1").update(url).digest("hex").slice(0, 12);

export const monthOf = (published: string | null): string | null => {
  if (!published) return null;
  const match = /^(\d{4})-(\d{2})/.exec(published.trim());
  return match ? `${match[1]}-${match[2]}` : null;
};

const pad = (value: number) => String(value).padStart(2, "0");
const FIRST_MONTH = `${STUDY_START.year}-${pad(STUDY_START.month)}`;
const LAST_MONTH = `${STUDY_END.year}-${pad(STUDY_END.month)}`;
export const inStudyWindow = (month: string) => month >= FIRST_MONTH && month <= LAST_MONTH;

export const readIndex = (sourceId: string): IndexEntry[] => {
  const path = join(CACHE.index, `${sourceId}.json`);
  if (!existsSync(path)) return [];
  return z.array(IndexEntrySchema).parse(JSON.parse(readFileSync(path, "utf8")));
};

const cleanTitle = (source: Source, title: string) => (source.titleSuffix ? title.replace(source.titleSuffix, "") : title).trim();

/**
 * Bylines, share bars and dates sit above the first paragraph, and notices below the last:
 * drop lines before the first one of ten words or more, and everything from the source's
 * registered boilerplate marker on.
 */
export function trimBoilerplate(text: string, trimFrom?: RegExp): string {
  const lines = text.split("\n");
  const first = lines.findIndex((line) => wordCount(line) >= 10);
  const body = (first > 0 ? lines.slice(first) : lines).join("\n");
  // The marker is looked for only after the body starts, so a share bar above the title cannot cut the post.
  const cut = trimFrom ? body.search(trimFrom) : -1;
  return (cut > 0 ? body.slice(0, cut) : body).trim();
}

async function extractOne(source: Source, entry: IndexEntry): Promise<ExtractedPost | "skip" | null> {
  const indexMonth = monthOf(entry.published);
  if (indexMonth && !inStudyWindow(indexMonth)) return "skip";
  const inline = entry.inlineHtml === null ? null : trimBoilerplate(inlineText(entry.inlineHtml), source.trimFrom);
  if (inline !== null && !(source.inlineMayBeEmpty && wordCount(inline) < 150)) {
    const text = inline;
    if (!indexMonth) return null;
    return {
      id: postId(entry.url),
      source: source.id,
      firm: source.firm,
      url: entry.url,
      title: entry.title ?? "",
      author: entry.author ?? source.author,
      month: indexMonth,
      words: wordCount(text),
      text,
    };
  }
  const response = await politeFetch(entry.url);
  if (response.status !== 200) {
    logFailure({ stage: "extract", source: source.id, url: entry.url, status: response.status });
    return null;
  }
  const meta = extractMeta(response.body);
  const raw = source.pageBody?.(response.body) ?? extractText(response.body, source.containers);
  const month = source.dateFromText
    ? firstMonthYear(raw)
    : indexMonth ?? monthOf(meta.published) ?? monthOf(source.pagePublished?.(response.body) ?? null);
  const text = trimBoilerplate(raw, source.trimFrom);
  if (!month) {
    logFailure({ stage: "extract", source: source.id, url: entry.url, error: "no publication month" });
    return null;
  }
  if (!inStudyWindow(month)) return "skip";
  return {
    id: postId(entry.url),
    source: source.id,
    firm: source.firm,
    url: entry.url,
    title: cleanTitle(source, entry.title ?? meta.title ?? ""),
    author: entry.author ?? source.author ?? meta.author,
    month,
    words: wordCount(text),
    text,
  };
}

async function extractSource(source: Source, force: boolean) {
  const directory = join(CACHE.text, source.id);
  mkdirSync(directory, { recursive: true });
  const entries = readIndex(source.id);
  let written = 0;
  let skipped = 0;
  let failed = 0;
  for (const [position, entry] of entries.entries()) {
    const path = join(directory, `${postId(entry.url)}.json`);
    if (!force && existsSync(path)) {
      written += 1;
      continue;
    }
    try {
      const result = await extractOne(source, entry);
      if (result === "skip") skipped += 1;
      else if (result === null) failed += 1;
      else {
        writeFileSync(path, JSON.stringify(result));
        written += 1;
      }
    } catch (error) {
      failed += 1;
      if (!(error instanceof RobotsDisallowedError)) {
        logFailure({ stage: "extract", source: source.id, url: entry.url, error: error instanceof Error ? error.message : String(error) });
      } else {
        logFailure({ stage: "extract", source: source.id, url: entry.url, error: "robots.txt disallows" });
      }
    }
    if ((position + 1) % 200 === 0) console.log(`[extract] ${source.id}: ${position + 1}/${entries.length}`);
  }
  console.log(`[extract] ${source.id}: ${written} posts in window, ${skipped} outside it, ${failed} failed`);
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const wanted = args.filter((arg) => !arg.startsWith("-"));
  const selected = wanted.length > 0 ? SOURCES.filter((source) => wanted.includes(source.id)) : SOURCES;
  const started = Date.now();
  await Promise.all(selected.map((source) => extractSource(source, force)));
  console.log(`[extract] done in ${Math.round((Date.now() - started) / 1000)}s, ${networkRequestCount()} network requests`);
}
