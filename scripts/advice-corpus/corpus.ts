/**
 * The corpus: every extracted post inside the window, after the registered exclusions
 * (pre-registration §3.4), counted so the base rates can report each one.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ExtractedPostSchema, inStudyWindow, readIndex, type ExtractedPost } from "./extract";
import { CACHE } from "./paths";
import { SOURCES } from "./sources";

const FIRM_NAMES = [
  "us",
  "the team",
  "greylock",
  "a16z",
  "andreessen horowitz",
  "nfx",
  "bessemer",
  "bvp",
  "usv",
  "union square ventures",
  "sequoia",
  "y combinator",
  "yc",
  "first round",
  "benchmark",
  "redpoint",
  "theory ventures",
];
const ANNOUNCEMENT_OPENINGS =
  /^(?:partnering with|why we invested|why we['’]re investing|why we are investing|our investment in|investing in|welcome|welcoming|introducing|announcing|congratulations)\b/i;
const JOINS_FIRM = new RegExp(`\\b(?:joins|joining|join)\\s+(?:${FIRM_NAMES.join("|")})\\b`, "i");
const HIRING = /\bwe(?:['’]re| are) hiring\b/i;

/** E3: an investment, portfolio or hiring announcement, judged by title alone. */
export const isAnnouncement = (title: string) => ANNOUNCEMENT_OPENINGS.test(title.trim()) || JOINS_FIRM.test(title) || HIRING.test(title);

/** E4's key: the title lower-cased, letters and digits only. */
export const titleKey = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "");

export const MIN_WORDS = 150;

export type CorpusCounts = {
  indexed: number;
  extracted: number;
  e1OutsideOrUndated: number;
  e2Short: number;
  e3Announcement: number;
  e4Duplicate: number;
  corpus: number;
};

/** Apply E2–E4 to extracted posts (E1 is applied at extraction). Pure, so a test can pin the order. */
export function applyExclusions(posts: readonly ExtractedPost[]) {
  const sorted = [...posts].sort((a, b) => a.month.localeCompare(b.month) || a.url.length - b.url.length || a.url.localeCompare(b.url));
  const seen = new Set<string>();
  const kept: ExtractedPost[] = [];
  let short = 0;
  let announcement = 0;
  let duplicate = 0;
  for (const post of sorted) {
    if (!inStudyWindow(post.month)) continue;
    if (post.words < MIN_WORDS) {
      short += 1;
      continue;
    }
    if (isAnnouncement(post.title)) {
      announcement += 1;
      continue;
    }
    const key = `${post.firm}::${titleKey(post.title)}`;
    if (titleKey(post.title) !== "" && seen.has(key)) {
      duplicate += 1;
      continue;
    }
    seen.add(key);
    kept.push(post);
  }
  return { kept, short, announcement, duplicate };
}

export function readExtractedPosts(): ExtractedPost[] {
  const posts: ExtractedPost[] = [];
  for (const source of SOURCES) {
    const directory = join(CACHE.text, source.id);
    if (!existsSync(directory)) continue;
    for (const file of readdirSync(directory)) {
      if (!file.endsWith(".json")) continue;
      posts.push(ExtractedPostSchema.parse(JSON.parse(readFileSync(join(directory, file), "utf8"))));
    }
  }
  return posts;
}

/** The corpus and the count at every stage. */
export function loadCorpus(): { posts: ExtractedPost[]; counts: CorpusCounts; bySource: Record<string, CorpusCounts> } {
  const extracted = readExtractedPosts();
  const bySource: Record<string, CorpusCounts> = {};
  const all: ExtractedPost[] = [];
  for (const source of SOURCES) {
    const fromSource = extracted.filter((post) => post.source === source.id);
    const indexed = readIndex(source.id).length;
    const result = applyExclusions(fromSource);
    bySource[source.id] = {
      indexed,
      extracted: fromSource.length,
      e1OutsideOrUndated: indexed - fromSource.length,
      e2Short: result.short,
      e3Announcement: result.announcement,
      e4Duplicate: 0,
      corpus: 0,
    };
    all.push(...fromSource);
  }
  // E4 runs per firm across its sources (AVC and usv.com are one firm).
  const result = applyExclusions(all);
  for (const source of SOURCES) {
    const counts = bySource[source.id];
    counts.corpus = result.kept.filter((post) => post.source === source.id).length;
    counts.e4Duplicate = counts.extracted - counts.e2Short - counts.e3Announcement - counts.corpus;
  }
  const sum = (key: keyof CorpusCounts) => Object.values(bySource).reduce((total, counts) => total + counts[key], 0);
  return {
    posts: result.kept,
    counts: {
      indexed: sum("indexed"),
      extracted: sum("extracted"),
      e1OutsideOrUndated: sum("e1OutsideOrUndated"),
      e2Short: result.short,
      e3Announcement: result.announcement,
      e4Duplicate: result.duplicate,
      corpus: result.kept.length,
    },
    bySource,
  };
}
