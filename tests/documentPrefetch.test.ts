import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { walkFiles } from "../scripts/walk-files.mjs";

/*
 * No page asks the browser to prefetch another page.
 *
 * Until 2026-11-12 the layout carried two prefetch links, for /operate and
 * /signals, and the Worker a response header pointing at hover-prefetch rules.
 * A browser on production showed what they did:
 *
 * - Cloudflare answers every `Sec-Purpose: prefetch` request to a route a Worker
 *   serves with a 503 (`cf-speculation-refused: prefetch refused: disabled for
 *   worker requests`), so each page view logged two failed requests.
 * - The hover rules were never applied: their file was served as
 *   `application/json`, and a browser ignores a rule set of that type.
 * - Where prefetches do arrive (a local Worker) they are never reused. Every
 *   page is `no-store`, so a full navigation fetches it again, and a link
 *   clicked inside the site goes through the router, which prefetches its own
 *   payload.
 *
 * Source-level, and it has to be: the layout suspends in this suite and the
 * Worker entry does not load in it. The patterns are the browser's own names
 * for the two hints, so a refactor cannot rename its way past them.
 * `dns-prefetch` (a host lookup) and `Next-Router-Prefetch` (the router's
 * header) are different things and do not match.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HINTS = [/rel=["']prefetch["']/, /speculation-?rules/i];

describe("document prefetch", () => {
  it("is not asked for by any page, component or the Worker", () => {
    const sources = ["app", "worker", "lib/runtime"]
      .flatMap((directory) => walkFiles(join(ROOT, directory)))
      .filter((file) => /\.(ts|tsx)$/.test(file));
    assert.ok(sources.length > 100, "precondition: the walk found the source tree");

    const asking = sources
      .filter((file) => HINTS.some((hint) => hint.test(readFileSync(file, "utf8"))))
      .map((file) => relative(ROOT, file));

    assert.deepEqual(asking, [], "Cloudflare refuses a prefetch of a Worker route, and a no-store page is fetched again anyway");
  });
});
