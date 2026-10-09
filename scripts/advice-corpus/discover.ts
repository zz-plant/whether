#!/usr/bin/env bun
/**
 * Stage 1: enumerate every registered archive into `.cache/advice-corpus/index/<source>.json`.
 * Hosts run in parallel; each host is still one request at a time, at most one a second.
 *
 *   bun run advice-corpus:discover               # every source
 *   bun run advice-corpus:discover -- tunguz avc # named sources
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { CACHE } from "./paths";
import { networkRequestCount } from "./politeFetch";
import { reportDiscoveryFailure, SOURCES } from "./sources";

const wanted = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
const selected = wanted.length > 0 ? SOURCES.filter((source) => wanted.includes(source.id)) : SOURCES;
mkdirSync(CACHE.index, { recursive: true });

const started = Date.now();
await Promise.all(
  selected.map(async (source) => {
    try {
      const entries = await source.discover();
      writeFileSync(join(CACHE.index, `${source.id}.json`), JSON.stringify(entries));
      const years = new Map<string, number>();
      for (const entry of entries) {
        const year = entry.published?.slice(0, 4) ?? "page";
        years.set(year, (years.get(year) ?? 0) + 1);
      }
      const byYear = [...years.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([year, count]) => `${year}:${count}`).join(" ");
      console.log(`[discover] ${source.id}: ${entries.length} entries  ${byYear}`);
    } catch (error) {
      reportDiscoveryFailure(source, error);
      console.error(`[discover] ${source.id} FAILED: ${error instanceof Error ? error.message : String(error)}`);
    }
  }),
);
console.log(`[discover] done in ${Math.round((Date.now() - started) / 1000)}s, ${networkRequestCount()} network requests`);
