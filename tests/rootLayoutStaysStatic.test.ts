import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, it } from "bun:test";

/*
 * The root layout wraps every page, so one request-time read in its tree makes every page
 * dynamic. Until 2026-11-25 the global header read `headers()` for its pathname, and every
 * HTML response went out `private, no-store`: the `revalidate` each route declares did
 * nothing, and no page could be cached. Nothing failed; it showed only in response headers.
 */

const IMPORT_PATTERN = /(?:import|export)\s[^"']*?from\s+["'](\.{1,2}\/[^"']+)["']/g;
const EXTENSIONS = [".tsx", ".ts", "/index.tsx", "/index.ts"];

const resolveLocal = (fromFile: string, specifier: string) => {
  const base = join(dirname(fromFile), specifier);
  if (existsSync(base) && /\.(t|j)sx?$/.test(base)) return base;
  return EXTENSIONS.map((extension) => `${base}${extension}`).find((candidate) => existsSync(candidate));
};

const layoutTree = () => {
  const seen = new Set<string>();
  const queue = ["app/layout.tsx"];
  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || seen.has(file)) continue;
    seen.add(file);
    for (const match of readFileSync(file, "utf8").matchAll(IMPORT_PATTERN)) {
      const specifier = match[1];
      const resolved = specifier === undefined ? undefined : resolveLocal(file, specifier);
      if (resolved !== undefined) queue.push(relative(".", resolved));
    }
  }
  return [...seen];
};

describe("the root layout renders without reading the request", () => {
  it("imports next/headers nowhere in its tree", () => {
    const files = layoutTree();
    assert.ok(files.includes("app/components/globalHeader.tsx"), "the walk reaches the header");
    const readers = files.filter((file) => /from\s+["']next\/headers["']/.test(readFileSync(file, "utf8")));
    assert.deepEqual(readers, [], "a request-time read here sends every page out as no-store");
  });

  it("keeps the header's query-string listener inside its own Suspense boundary", () => {
    const gate = readFileSync("app/components/globalHeaderRouteGate.tsx", "utf8");
    assert.match(gate, /<Suspense fallback=\{null\}>\s*<RunwayServerSync \/>\s*<\/Suspense>/);
  });
});
