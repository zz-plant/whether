import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "bun:test";
import { compile, match } from "path-to-regexp";

/*
 * Resolves redirects the way Next.js does — path-to-regexp, first match wins —
 * so ordering and wildcard behavior are checked here rather than only in a
 * browser. next.config.js is not hot-reloadable, which is part of why the
 * /resolve rot survived: the alias worked when typed, and nothing re-checked
 * the table.
 */
type RedirectPair = [source: string, destination: string];
const require = createRequire(import.meta.url);

type RedirectPairsModule = {
  canonicalSurfaceRedirectPairs: RedirectPair[];
  solutionRedirectPairs: RedirectPair[];
  iaConsolidationRedirectPairs: RedirectPair[];
};

const loadNextConfig = (): RedirectPairsModule => require("../next.config.js");

const { canonicalSurfaceRedirectPairs, solutionRedirectPairs, iaConsolidationRedirectPairs } =
  loadNextConfig();

const PAIRS: RedirectPair[] = [
  ...solutionRedirectPairs,
  ...canonicalSurfaceRedirectPairs,
  ...iaConsolidationRedirectPairs,
];

/** Split a destination into the part path-to-regexp compiles and its suffix. */
const splitDestination = (destination: string) => {
  const index = destination.search(/[#?]/);
  return index === -1
    ? { path: destination, suffix: "" }
    : { path: destination.slice(0, index), suffix: destination.slice(index) };
};

const redirectOnce = (pathname: string): string | null => {
  for (const [source, destination] of PAIRS) {
    const matched = match(source, { decode: decodeURIComponent })(pathname);
    if (!matched) continue;
    const { path, suffix } = splitDestination(destination);
    return compile(path, { encode: encodeURIComponent })(matched.params) + suffix;
  }
  return null;
};

/** Follow the chain to where a visitor actually lands. */
const resolve = (pathname: string) => {
  const seen = new Set<string>();
  let current = pathname;
  let hops = 0;

  while (hops < 10) {
    const next = redirectOnce(current.split(/[#?]/)[0]);
    if (next === null) return { landing: current, hops };
    assert.ok(!seen.has(next), `redirect loop at ${next}`);
    seen.add(next);
    current = next;
    hops += 1;
  }

  throw new Error(`redirect chain from ${pathname} did not settle`);
};

describe("redirect resolution", () => {
  it("sends legacy alias sub-paths to their renamed route", () => {
    for (const [from, to] of [
      ["/resolve/ceo", "/resolve/ceo"],
      ["/resolve/ceo/capital-raising", "/resolve/ceo/capital-raising"],
      ["/resolve/ship-checklist", "/resolve#direct-answers"],
      ["/evidence/capital-tightness-watch", "/signals/capital-tightness-watch"],
      ["/evidence/capital-tightness-watch/hiring", "/signals/capital-tightness-watch/hiring"],
      ["/planning/memory", "/history"],
      ["/operate/memory", "/history"],
      ["/history/decisions", "/history"],
      ["/threshold", "/trust#framework"],
      ["/planning/financial", "/operate/financial"],
    ] as const) {
      assert.equal(resolve(from).landing, to, `${from} should land on ${to}`);
    }
  });

  it("keeps the bare alias and the specific stubs ahead of the wildcard", () => {
    assert.equal(resolve("/resolve").landing, "/resolve");
    assert.equal(resolve("/evidence").landing, "/signals");
    assert.equal(resolve("/planning").landing, "/operate");
    // /operate has no data, cli, or integrations child — the wildcard must not claim these.
    assert.equal(resolve("/planning/data").landing, "/operate");
    assert.equal(resolve("/planning/cli").landing, "/operate");
    assert.equal(resolve("/planning/integrations").landing, "/operate");
    assert.equal(resolve("/resolve/team-context").landing, "/operate#ops-monthly-action-summary");
  });

  it("lands every redirect in one hop", () => {
    for (const [source] of PAIRS) {
      if (source.includes(":")) continue;
      const { landing, hops } = resolve(source);
      assert.equal(hops, 1, `${source} takes ${hops} hops to reach ${landing}`);
    }
  });

  /*
   * The assertion both redirect tests were missing.
   *
   * Everything else here checks redirects against *other redirects* — that they settle in
   * one hop, that they do not chain, that a specific rule outranks a wildcard. Nothing
   * compared a destination to the route tree, so a redirect could point at a page that no
   * longer exists and stay green.
   *
   * That is exactly what happened to `/guides`. The three `/guides/*` rules were correct
   * when written; `14258b64` then deleted `app/guides/page.tsx` and left them pointing at
   * it. In production `/guides/stage/seed` answered 308 to `/guides?stage=seed`, which
   * answered 404 — worse than a plain 404, because a permanent redirect is cached and
   * followed. Both existing tests passed the whole time: the chain settles in one hop, and
   * `/guides` is not itself a redirect source.
   */
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

  /** Every servable path pattern under `app/`, as a matcher. */
  const routeMatchers = (() => {
    const patterns: string[] = [];
    const walk = (dir: string, segments: string[]) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          // Route groups contribute no URL segment; `_` and `.` directories are not routes.
          if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
          const isGroup = entry.name.startsWith("(") && entry.name.endsWith(")");
          walk(join(dir, entry.name), isGroup ? segments : [...segments, entry.name]);
        } else if (/^(page|route)\.tsx?$/.test(entry.name)) {
          patterns.push(`/${segments.join("/")}`);
        }
      }
    };
    walk(join(repoRoot, "app"), []);

    return patterns.map(
      (pattern) =>
        new RegExp(
          `^${pattern.replace(/\[\.\.\.[^\]]+\]/g, ".+").replace(/\[[^\]]+\]/g, "[^/]+")}$`,
        ),
    );
  })();

  it("points every redirect at a route that exists", () => {
    const dead: string[] = [];

    for (const [source, destination] of PAIRS) {
      // Strip the hash/query, and give any `:param` a stand-in so the shape can be tested.
      const path = destination
        .split(/[#?]/)[0]
        .replace(/:[A-Za-z][A-Za-z0-9_]*\*?/g, "sample");
      if (path === "" || routeMatchers.some((matcher) => matcher.test(path))) continue;
      dead.push(`${source} -> ${destination} (no route serves ${path})`);
    }

    assert.deepEqual(dead, [], `\n${dead.join("\n")}\n`);
  });

  it("never lands on a path that is itself a redirect source", () => {
    for (const [source] of PAIRS) {
      if (source.includes(":")) continue;
      const landing = resolve(source).landing.split(/[#?]/)[0];
      assert.equal(
        redirectOnce(landing),
        null,
        `${source} lands on ${landing}, which redirects again`,
      );
    }
  });
});
