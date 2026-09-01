import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "bun:test";

/*
 * `path:` on buildPageMetadata becomes <link rel="canonical"> and og:url.
 *
 * A route rename left several pages naming their old path there, so production
 * served pages whose canonical URL was a 404 — /answer/ceo declared
 * https://whether.work/resolve/ceo, and /operate/memory declared
 * /planning/memory. That is worse than a broken link: it tells search engines
 * the real address of the page is a dead one.
 *
 * The aliases still exist as redirects for people who retype a nav label, which
 * is exactly why this needs a test — the alias resolving in a browser is what
 * made the canonicals look fine.
 */
const ALIAS_PREFIXES = ["/resolve", "/evidence", "/planning"];

const sourceFiles = (dir: string, found: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, found);
    else if (/\.tsx?$/.test(entry)) found.push(full);
  }
  return found;
};

describe("canonical paths avoid alias prefixes", () => {
  it("never declares a canonical under a redirect-only prefix", () => {
    const offenders: string[] = [];

    for (const file of [...sourceFiles("app"), ...sourceFiles("lib")]) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/path:\s*[`"']([^`"']+)[`"']/g)) {
        const value = match[1];
        if (ALIAS_PREFIXES.some((prefix) => value === prefix || value.startsWith(`${prefix}/`))) {
          offenders.push(`${file}: ${value}`);
        }
      }
    }

    assert.deepEqual(
      offenders,
      [],
      `canonical paths point at redirect-only aliases:\n  ${offenders.join("\n  ")}`,
    );
  });
});
