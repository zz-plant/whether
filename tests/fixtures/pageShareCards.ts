import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Metadata } from "next";
import sitemap from "../../app/sitemap";

/**
 * Every sitemap page's share card, resolved the way Next resolves it: the page
 * module for the path, its `metadata` or `generateMetadata`, and the first
 * `og:image` in the result.
 *
 * The route tree is walked rather than listed so a new page is covered the day it
 * joins the sitemap, which is the whole point: 113 pages shipped the live weekly
 * card and one shipped no image, and no test had ever asked a page what it
 * previews as.
 */

/**
 * `unreadable` is set when the page's metadata needs a live request (the homepage
 * reads cookies to scope its brief); the card cannot be checked offline, and the
 * test that consumes this decides which pages may be in that state.
 */
export type PageShareCard = { path: string; imageUrl: URL | null; unreadable?: string };

type PageModule = {
  metadata?: Metadata;
  generateMetadata?: (props: { params: Promise<Record<string, string>>; searchParams: Promise<Record<string, string>> }) => Promise<Metadata> | Metadata;
};

const APP_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "app");

/** The page file for a URL path, with the dynamic segments it bound. */
const resolvePageFile = (path: string): { file: string; params: Record<string, string> } | null => {
  const segments = path.split("/").filter(Boolean);
  const walk = (dir: string, index: number, params: Record<string, string>): { file: string; params: Record<string, string> } | null => {
    if (index === segments.length) {
      const file = join(dir, "page.tsx");
      return existsSync(file) ? { file, params } : null;
    }
    const segment = segments[index];
    const exact = join(dir, segment);
    if (existsSync(exact)) {
      const found = walk(exact, index + 1, params);
      if (found) return found;
    }
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const match = entry.isDirectory() ? /^\[([^\].]+)\]$/.exec(entry.name) : null;
      if (!match) continue;
      const found = walk(join(dir, entry.name), index + 1, { ...params, [match[1]]: segment });
      if (found) return found;
    }
    return null;
  };
  return walk(APP_ROOT, 0, {});
};

const firstImage = (metadata: Metadata): URL | null => {
  const images = metadata.openGraph?.images;
  const first = Array.isArray(images) ? images[0] : images;
  if (!first) return null;
  if (typeof first === "string") return new URL(first);
  if (first instanceof URL) return first;
  return "url" in first ? new URL(String(first.url)) : null;
};

let collected: Promise<PageShareCard[]> | null = null;

/** Memoised: two suites read the same 140 pages, and each read takes seconds. */
export const collectPageShareCards = (): Promise<PageShareCard[]> => (collected ??= collect());

const collect = async (): Promise<PageShareCard[]> => {
  const entries = await sitemap({ programmaticEligible: true });
  const cards: PageShareCard[] = [];
  for (const entry of entries) {
    const path = new URL(entry.url).pathname;
    const resolved = resolvePageFile(path);
    if (!resolved) continue; // route handlers (feed.xml) have no page and no card
    const pageModule: PageModule = await import(resolved.file);
    try {
      const metadata = pageModule.generateMetadata
        ? await pageModule.generateMetadata({ params: Promise.resolve(resolved.params), searchParams: Promise.resolve({}) })
        : (pageModule.metadata ?? {});
      cards.push({ path, imageUrl: firstImage(metadata) });
    } catch (error) {
      cards.push({ path, imageUrl: null, unreadable: error instanceof Error ? error.message : String(error) });
    }
  }
  return cards;
};
