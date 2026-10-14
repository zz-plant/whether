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
      // The role × decision-area cluster pages were retired on 2026-09-15; the
      // parent role page is where they land, one hop from the legacy alias too.
      ["/resolve/ceo/capital-raising", "/resolve/ceo"],
      ["/answer/ceo/capital-raising", "/resolve/ceo"],
      ["/toolkits/pmf/risk-appetite-watch", "/toolkits/pmf"],
      ["/resolve/ship-checklist", "/resources#answers"],
      ["/evidence/capital-tightness-watch", "/signals/capital-tightness-watch"],
      ["/evidence/capital-tightness-watch/hiring", "/signals/capital-tightness-watch/hiring"],
      ["/planning/memory", "/history"],
      ["/operate/memory", "/history"],
      ["/history/decisions", "/history"],
      ["/threshold", "/about#method"],
      ["/planning/financial", "/operate/financial"],
      // The first version's detail, focus and conflicts pages fold into the one list.
      ["/concepts/escaping-the-build-trap", "/concepts"],
      ["/concepts/focus/strategy", "/concepts"],
      ["/concepts/conflicts", "/concepts"],
    ] as const) {
      assert.equal(resolve(from).landing, to, `${from} should land on ${to}`);
    }
  });

  it("forwards Learn's deep links under its earlier names to where those topics live now", () => {
    // Nothing matched these from 2026-03-16, when d0ddedd6 deleted the table that forwarded them.
    for (const [from, to] of [
      ["/learn/concepts", "/concepts"],
      ["/learn/concepts/escaping-the-build-trap", "/concepts"],
      ["/library", "/trust"],
      ["/library/canon/escaping-the-build-trap", "/concepts"],
      ["/library/failure-modes", "/trust#revisit-call"],
      ["/library/failure-modes/regime-mismatch", "/trust#revisit-call"],
      ["/reference", "/trust"],
      ["/reference/concepts/escaping-the-build-trap", "/concepts"],
      ["/reference/failure-modes/regime-mismatch", "/trust#revisit-call"],
    ] as const) {
      assert.deepEqual(resolve(from), { landing: to, hops: 1 }, `${from} should land on ${to} in one hop`);
    }
  });

  it("keeps the bare alias and the specific stubs ahead of the wildcard", () => {
    // Resolve folded into Decide's Test step and Guides' answers on 2026-10-08.
    assert.equal(resolve("/resolve").landing, "/operate#ops-decision-shield");
    assert.equal(resolve("/answer").landing, "/operate#ops-decision-shield");
    assert.equal(resolve("/answers").landing, "/resources#answers");
    assert.equal(resolve("/guides").landing, "/resources");
    // The helper compiles the path, not the query, so the stakeholder rule is checked by its source.
    assert.equal(resolve("/guides/founders-ceos").landing.split("?")[0], "/resources");
    assert.equal(resolve("/evidence").landing, "/signals");
    assert.equal(resolve("/planning").landing, "/operate");
    // /operate has no data, cli, or integrations child — the wildcard must not claim these.
    assert.equal(resolve("/planning/data").landing, "/operate");
    assert.equal(resolve("/planning/cli").landing, "/operate");
    assert.equal(resolve("/planning/integrations").landing, "/operate");
    assert.equal(resolve("/resolve/team-context").landing, "/operate#ops-monthly-action-summary");
    // A page again: the sub-path rule must not claim the bare path.
    assert.equal(resolve("/concepts").hops, 0);
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

  type StaticParams = Array<Record<string, string | string[]>>;
  type RouteModule = { generateStaticParams?: () => StaticParams | Promise<StaticParams> };
  const loadRouteModule = (file: string): Promise<RouteModule> => import(file);

  /*
   * What `app/` serves. A static route serves its own path; a dynamic one serves the
   * values its own `generateStaticParams` returns. Matching the shape alone, every
   * `[param]` as `[^/]+`, passed a redirect to `/resolve/not-a-real-slug`, which
   * production answers with a 404: `/resolve/[slug]`, `/signals/[cluster]`,
   * `/history/[period]` and `/brief/[week]` set `dynamicParams = false`, and the
   * routes that render on demand call `notFound()` for a value their catalog lacks.
   * `/answers/[slug]` also renders answers it does not generate, so holding it to its
   * list is stricter than production; the list is what can be read without rendering.
   */
  const routeTable = (async () => {
    const routes: Array<{ pattern: string; file: string }> = [];
    const walk = (dir: string, segments: string[]) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          // Route groups contribute no URL segment; `_` and `.` directories are not routes.
          if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
          const isGroup = entry.name.startsWith("(") && entry.name.endsWith(")");
          walk(join(dir, entry.name), isGroup ? segments : [...segments, entry.name]);
        } else if (/^(page|route)\.tsx?$/.test(entry.name)) {
          routes.push({ pattern: `/${segments.join("/")}`, file: join(dir, entry.name) });
        }
      }
    };
    walk(join(repoRoot, "app"), []);

    const shapeOf = (pattern: string) =>
      new RegExp(`^${pattern.replace(/\[\.\.\.[^\]]+\]/g, ".+").replace(/\[[^\]]+\]/g, "[^/]+")}$`);
    const served = new Set<string>();
    const unlisted: RegExp[] = [];
    for (const { pattern, file } of routes) {
      if (!pattern.includes("[")) {
        served.add(pattern);
        continue;
      }
      const { generateStaticParams } = await loadRouteModule(file);
      // Only an API route lists nothing (`/api/telemetry/[stream]`); its handler judges the value.
      if (!generateStaticParams) {
        unlisted.push(shapeOf(pattern));
        continue;
      }
      for (const params of await generateStaticParams()) {
        served.add(
          pattern.replace(/\[(?:\.\.\.)?([^\]]+)\]/g, (_segment, name: string) => [params[name]].flat().join("/")),
        );
      }
    }
    const shapes = routes.map(({ pattern }) => shapeOf(pattern));

    return {
      /** A concrete path: a static route, or a value a dynamic route generates. */
      serves: (path: string) => served.has(path) || unlisted.some((shape) => shape.test(path)),
      /** A path with a stand-in value: some route has that shape. */
      fits: (path: string) => shapes.some((shape) => shape.test(path)),
    };
  })();

  it("points every redirect at a route that exists", async () => {
    const { serves, fits } = await routeTable;
    const dead: string[] = [];

    for (const [source, destination] of PAIRS) {
      const path = destination.split(/[#?]/)[0];
      if (path === "") continue;
      // A `:param` carries the visitor's own value through, so only the shape can be tested:
      // a value the route does not generate 404s there, which is the right answer for it.
      const exists = path.includes(":")
        ? fits(path.replace(/:[A-Za-z][A-Za-z0-9_]*\*?/g, "sample"))
        : serves(path);
      if (!exists) dead.push(`${source} -> ${destination} (no route serves ${path})`);
    }

    assert.deepEqual(dead, [], `\n${dead.join("\n")}\n`);
  });

  it("holds a destination on a dynamic route to the values that route generates", async () => {
    const { serves } = await routeTable;
    assert.ok(serves("/resolve/ceo"));
    assert.ok(!serves("/resolve/not-a-real-slug"), "/resolve/[slug] sets dynamicParams = false");
    assert.ok(serves("/toolkits/focus"));
    assert.ok(!serves("/toolkits/not-a-real-slug"), "/toolkits/[slug] calls notFound() for it");
  });

  /*
   * The 2026-10-08 regrouping changed which page hosts what, not which addresses
   * answer. Every address the header, its More menu, the footer, the breadcrumbs
   * and the bottom bar linked before it — and the legacy spellings they replaced —
   * still serves a page or redirects, in one hop, to one that does.
   */
  it("still answers every address the old navigation linked, with a page or one redirect", async () => {
    const { serves } = await routeTable;
    const previouslyLinked = [
      // Header tabs: Brief, Plan, Evidence, Resolve, Trust, History.
      "/", "/operate", "/signals", "/resolve", "/trust", "/history",
      // The More menu.
      "/comps", "/history/compare", "/share", "/api-docs", "/pricing", "/calibration", "/concepts", "/search", "/about",
      // The footer, the planning switcher and the breadcrumbs.
      "/resources", "/decisions", "/privacy", "/acceptable-use-policy", "/terms-of-service", "/feed.xml",
      "/operate/financial", "/operate/scenarios", "/resolve/ceo", "/toolkits/focus",
      "/answers/should-startups-raise-capital-now", "/signals/capital-tightness-watch", "/brief/2026-w31", "/history/2024",
      // Legacy spellings and hubs the links above replaced.
      "/answers", "/answer", "/evidence", "/planning", "/guides", "/guides/founders-ceos", "/guides/stage/seed",
      "/decision-tools", "/resolve/ship-checklist", "/sources", "/methodology", "/glossary", "/embed",
    ];
    const broken = previouslyLinked.flatMap((url) => {
      const next = redirectOnce(url);
      if (next === null) return serves(url) ? [] : [`${url}: no page and no redirect`];
      const landing = next.split(/[#?]/)[0];
      if (redirectOnce(landing) !== null) return [`${url} → ${next} redirects again`];
      return serves(landing) ? [] : [`${url} → ${next}: no page there`];
    });
    assert.deepEqual(broken, [], `\n${broken.join("\n")}\n`);
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
