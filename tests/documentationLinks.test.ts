import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, resolve } from "node:path";
import { describe, it } from "bun:test";

const REPO_ROOT = new URL("../", import.meta.url).pathname.replace(/\/$/, "");

const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "artifacts", ".claude", ".codex"]);

function markdownFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    if (IGNORED_DIRS.has(entry)) return [];
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return markdownFiles(full);
    return entry.endsWith(".md") ? [full] : [];
  });
}

const LINK = /\[[^\]]*\]\(([^)\s]+)\)/g;

const isExternal = (url: string) =>
  url.startsWith("http://") || url.startsWith("https://") || url.startsWith("#") || url.startsWith("mailto:");

describe("documentation links", () => {
  const files = markdownFiles(REPO_ROOT);

  // A doc that links to a path from somebody's old checkout is worse than one that links
  // nowhere: it renders as a link, and on GitHub an absolute /Users/... href resolves to
  // github.com/Users/... and 404s. Three docs carried 24 of them.
  it("never links to an absolute filesystem path", () => {
    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const [, url] of source.matchAll(LINK)) {
        if (url.startsWith("/Users/") || url.startsWith("/home/") || /^[A-Za-z]:\\/.test(url)) {
          offenders.push(`${file.replace(`${REPO_ROOT}/`, "")} -> ${url}`);
        }
      }
    }

    assert.deepEqual(offenders, []);
  });

  it("resolves every relative link to something that exists", () => {
    const broken: string[] = [];
    let checked = 0;

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const [, url] of source.matchAll(LINK)) {
        if (isExternal(url)) continue;
        checked += 1;
        const target = normalize(resolve(dirname(file), url.split("#")[0]));
        if (!existsSync(target)) {
          broken.push(`${file.replace(`${REPO_ROOT}/`, "")} -> ${url}`);
        }
      }
    }

    assert.ok(checked > 20, `checked a meaningful number of links, got ${checked}`);
    assert.deepEqual(broken, []);
  });
});
