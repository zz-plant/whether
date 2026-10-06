import { readdir } from "node:fs/promises";
import path from "node:path";

const dynamicRouteSamples = {
  "/resolve/[slug]": ["/resolve/ceo"],
  "/answers/[slug]": ["/answers/should-startups-hire-engineers-right-now"],
  "/brief/[week]": ["/brief/2026-w31"],
  "/history/[period]": ["/history/2025"],
  "/operate/[workstream]": ["/operate/financial", "/operate/scenarios"],
  // This page branches between pillar and article renderers. Keep one of each
  // so a shared route file cannot hide a landmark regression in either branch.
  "/resources/[slug]": [
    "/resources/capital-discipline-venture-backed-companies",
    "/resources/should-we-freeze-hiring-high-interest-rate-environment",
  ],
  "/signals/[cluster]": ["/signals/capital-tightness-watch"],
  "/signals/[cluster]/[decision-scenario]": [
    "/signals/capital-tightness-watch/hiring",
  ],
  "/toolkits/[slug]": ["/toolkits/pmf"],
};

const countMatches = (value, pattern) => [...value.matchAll(pattern)].length;

/*
 * The skip link specifically — an anchor carrying the `skip-link` class — not
 * every link pointing at #main-content. Content routes legitimately repeat a
 * "Back to top" link per section (app/resources/[slug]/page.tsx), and counting
 * those made one healthy page report 12 skip links. Attribute order varies, so
 * both are matched by lookahead rather than by sequence.
 */
const SKIP_LINK =
  /<a\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bskip-link\b)(?=[^>]*\bhref\s*=\s*["']#main-content["'])[^>]*>/gi;

/*
 * A client-streamed route's landmark never reaches the response as literal
 * markup — it arrives as an RSC flight row instead:
 *
 *   ["$","main",null,{"id":"main-content","tabIndex":-1,...}]
 *
 * embedded in a script, with the quotes backslash-escaped. On 2026-08-31,
 * scanning only for `<main>` tags reported 21 of 40 routes as missing a
 * landmark they in fact had. By 2026-10-06 every one of the 35 audited routes
 * painted its landmark as markup and none took this path. These patterns
 * tolerate the escaping and the surrounding props.
 */
const FLIGHT_MAIN_WITH_TARGET =
  /\\?"main\\?"\s*,\s*null\s*,\s*\{[^{}]*\\?"id\\?"\s*:\s*\\?"main-content\\?"/g;
const FLIGHT_SKIP_LINK = /\\?"className\\?"\s*:\s*\\?"skip-link\\?"/g;

/*
 * A row starts after a newline in the stream, which reaches the HTML as an
 * escaped `\n` (one whose backslash is not itself escaped, as a newline inside
 * a string would be), or at the start of a pushed chunk.
 */
const FLIGHT_ROW_START = /(?:(?<!\\)\\n|\n|\(")([0-9a-f]+):(?=[[{"A-Z])/g;
const FLIGHT_ROW_REF = /\\?"\$L?([0-9a-f]+)\\?"/g;
const FLIGHT_FALLBACK_REF = /\\?"fallback\\?"\s*:\s*\\?"\$L?([0-9a-f]+)\\?"/g;

/**
 * The flight payload's rows, keyed by id. A chunk boundary can fall inside a
 * row, so the script glue between two chunks is read as part of the row it
 * interrupts; it carries no element, so that costs nothing.
 */
const readFlightRows = (html) => {
  const starts = [...html.matchAll(FLIGHT_ROW_START)];
  const rows = new Map();

  starts.forEach((start, index) => {
    const end = starts[index + 1]?.index ?? html.length;
    rows.set(start[1], (rows.get(start[1]) ?? "") + html.slice(start.index, end));
  });

  return rows;
};

/**
 * Rows a boundary renders instead of the route, and every row they reach.
 *
 * The layout wraps each route in boundaries that carry their alternative as a
 * `fallback`, and the 404's is in every payload:
 *
 *   ["$","$L64",null,{"resetKey":"about","fallback":"$65","children":[...]}]
 *   65:["$","main",null,{"id":"main-content",...}]
 *
 * app/not-found.tsx renders a targeted <main>, so until 2026-10-06 that row
 * satisfied this check on every route whatever the route itself rendered.
 * Following references from the fallback rows also catches a 404 whose
 * <main> is outlined below its root row. If that reaches too far, it can only
 * hide a real landmark, which fails the route, never pass a missing one.
 */
const collectFallbackRows = (html, rows) => {
  const pending = [...html.matchAll(FLIGHT_FALLBACK_REF)].map((match) => match[1]);
  const reached = new Set();

  while (pending.length > 0) {
    const id = pending.pop();
    if (reached.has(id)) continue;
    reached.add(id);
    for (const ref of (rows.get(id) ?? "").matchAll(FLIGHT_ROW_REF)) pending.push(ref[1]);
  }

  return reached;
};

/**
 * What the flight payload claims about the route's own landmark.
 *
 * Presence only, deliberately not counts. React re-emits a segment's rows when
 * a stream resumes, so the same single landmark can legitimately appear twice —
 * counting occurrences would invent duplicates. A streamed route is therefore
 * checked for "declares its landmark and a link to it"; duplicate and nesting
 * detection stay with the routes that ship literal markup.
 */
const inspectFlightPayload = (html) => {
  const rows = readFlightRows(html);
  const fallbackRows = collectFallbackRows(html, rows);
  const routeRows = [...rows].filter(([id]) => !fallbackRows.has(id)).map(([, row]) => row);

  return {
    hasMainWithTarget: routeRows.some((row) => countMatches(row, FLIGHT_MAIN_WITH_TARGET) > 0),
    hasSkipLink: routeRows.some((row) => countMatches(row, FLIGHT_SKIP_LINK) > 0),
  };
};

/**
 * The in-page anchors a rendered page links to, and the ids it carries.
 *
 * A dead `#anchor` fails silently: the browser stays put, and nothing in a type
 * check, a unit test or the landmark audit notices. Four of them were found by
 * hand on 2026-09-16, all invisible for the same reason — they sat in code that
 * never rendered, so no reader could click one and report it.
 *
 * Ids come from the literal markup *and* from the flight payload, for the same
 * reason the landmark check consults it: a streamed route's real markup is
 * escaped JSON in the served response, not elements. Reading only the HTML
 * called the skip link dead on five routes.
 *
 * Both halves are returned rather than diffed here, because the useful question
 * is not per-page. Plenty of targets render only under a condition — a section
 * that needs figures entered, a banner that needs degraded data — so a page can
 * honestly link to an id it is not currently showing, and which state a route
 * renders in depends on what its upstreams returned. Pinning that per page
 * makes the check a function of the data, and it would go red in a container
 * whose log cannot be read from here. The caller asks the stable question
 * instead: does this id exist anywhere in the app at all.
 */
export const inspectInPageAnchors = (html) => {
  const ids = new Set();
  for (const match of html.matchAll(/\sid="([^"]+)"/g)) ids.add(match[1]);
  for (const match of html.matchAll(/\\"id\\":\\"([^"\\]+)\\"/g)) ids.add(match[1]);

  const anchors = new Set();
  for (const match of html.matchAll(/\shref="#([^"]+)"/g)) {
    /* `#top` is the document itself, and needs no id to work. */
    if (match[1] !== "top") anchors.add(match[1]);
  }

  const byName = (left, right) => left.localeCompare(right);
  return { ids: [...ids].sort(byName), anchors: [...anchors].sort(byName) };
};

/**
 * Anchors no audited route renders an id for, per route that links to one.
 *
 * Aggregated across every route before judging, so a target that exists on some
 * page in some state is real and only a target that exists nowhere fails. That
 * is the claim worth gating: the four found by hand rendered on no route at
 * all, and so did the two `/operate/financial` chips.
 */
export const collectUnresolvedAnchors = (results) => {
  const rendered = new Set();
  for (const result of results) {
    for (const id of result.anchorIds ?? []) rendered.add(id);
  }

  return results
    .flatMap((result) => {
      const missing = (result.inPageAnchors ?? []).filter((anchor) => !rendered.has(anchor));
      return missing.length > 0 ? [{ route: result.route, missing }] : [];
    })
    .sort((left, right) => left.route.localeCompare(right.route));
};

export const inspectMainContentHtml = (html) => {
  const mainTags = [...html.matchAll(/<\/?main\b[^>]*>/gi)].map((match) => match[0]);
  const openingMainTags = mainTags.filter((tag) => !/^<\/main\b/i.test(tag));
  const mainContentIdCount = countMatches(html, /\bid\s*=\s*["']main-content["']/gi);
  const skipLinkCount = countMatches(html, SKIP_LINK);
  const mainWithTargetCount = openingMainTags.filter((tag) =>
    /\bid\s*=\s*["']main-content["']/i.test(tag),
  ).length;
  let mainDepth = 0;
  let nestedMain = false;

  for (const tag of mainTags) {
    if (/^<\/main\b/i.test(tag)) {
      mainDepth = Math.max(0, mainDepth - 1);
      continue;
    }

    if (mainDepth > 0) nestedMain = true;
    mainDepth += 1;
  }

  const devErrorBoundary = html.includes("__VINEXT_INITIAL_DEV_ERRORS__");

  /*
   * Only a route that paints no <main> at all is judged on its flight payload.
   * A <main> in the markup is the landmark the reader gets, so it is judged as
   * painted, id or not.
   *
   * This used to fall back whenever the markup lacked a *targeted* <main>, to
   * excuse a "placeholder" /state was said to flush. /state had no loading
   * shell: its page rendered `<main className="flex min-h-screen ...">`, the
   * same missing id as five reading routes that passed for the same reason
   * until 2026-10-06. Loading fallbacks render no <main> at all
   * (tests/mainContentLandmarks.test.tsx).
   */
  if (openingMainTags.length === 0 && !devErrorBoundary) {
    const flight = inspectFlightPayload(html);

    if (flight.hasMainWithTarget) {
      const flightIssues = [];
      if (!flight.hasSkipLink) {
        flightIssues.push("Streamed route declares no skip link to #main-content.");
      }

      return {
        mainCount: 1,
        mainContentIdCount: 1,
        skipLinkCount: flight.hasSkipLink ? 1 : 0,
        nestedMain: false,
        issues: flightIssues,
      };
    }
  }

  const issues = [];
  if (openingMainTags.length !== 1) {
    issues.push(`Expected exactly 1 <main>; found ${openingMainTags.length} <main> elements.`);
  }
  if (mainContentIdCount !== 1) {
    issues.push(
      `Expected exactly 1 id="main-content"; found ${mainContentIdCount} elements.`,
    );
  }
  if (mainWithTargetCount !== 1) {
    issues.push(
      `Expected id="main-content" on the route's <main>; found ${mainWithTargetCount}.`,
    );
  }
  if (skipLinkCount !== 1) {
    issues.push(`Expected exactly 1 skip link target; found ${skipLinkCount}.`);
  }
  if (nestedMain) {
    issues.push("Found nested <main> landmarks.");
  }
  if (devErrorBoundary) {
    issues.push("Vinext returned a development error boundary instead of the route.");
  }

  return {
    mainCount: openingMainTags.length,
    mainContentIdCount,
    skipLinkCount,
    nestedMain,
    issues,
  };
};

const normalizeRouteSegment = (segment) => {
  if (segment.startsWith("(") && segment.endsWith(")")) return null;
  if (segment.startsWith("@")) return null;
  return segment;
};

const collectPagePatterns = async (directory, segments = [], patterns = []) => {
  const entries = await readdir(directory, { withFileTypes: true });

  if (entries.some((entry) => entry.isFile() && entry.name === "page.tsx")) {
    const routeSegments = segments.map(normalizeRouteSegment).filter(Boolean);
    patterns.push(routeSegments.length === 0 ? "/" : `/${routeSegments.join("/")}`);
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "api") {
      continue;
    }

    await collectPagePatterns(
      path.join(directory, entry.name),
      [...segments, entry.name],
      patterns,
    );
  }

  return patterns;
};

export const collectMainContentRouteSamples = async ({
  appDir = path.resolve(process.cwd(), "app"),
} = {}) => {
  const patterns = await collectPagePatterns(appDir);
  const routes = [];

  for (const pattern of patterns) {
    if (!pattern.includes("[")) {
      routes.push(pattern);
      continue;
    }

    const samples = dynamicRouteSamples[pattern];
    if (!samples || samples.length === 0) {
      throw new Error(
        `Dynamic page ${pattern} has no representative URL in main-content-landmarks.mjs.`,
      );
    }
    routes.push(...samples);
  }

  return [...new Set(routes)].sort((left, right) => left.localeCompare(right));
};

/*
 * A route that never answers used to park a worker forever: these fetches carried
 * no timeout, and `Promise.all` over the workers cannot resolve while one is still
 * waiting. Locally that never showed, because the dev server is already up and
 * answers instantly. Inside the Cloudflare build container the routes render
 * against upstreams the container cannot reach, and an egress that drops packets
 * rather than refusing them leaves the socket open with nothing coming back — so
 * this check ran for thirty minutes and the build was killed by the ceiling, with
 * its own output still buffered and unprinted.
 */
const ROUTE_FETCH_TIMEOUT_MS = 30_000;

const auditRoute = async ({ baseUrl, route, fetchImpl, timeoutMs = ROUTE_FETCH_TIMEOUT_MS }) => {
  const url = new URL(route, `${baseUrl.replace(/\/$/, "")}/`).toString();

  try {
    const response = await fetchImpl(url, {
      headers: { accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const html = await response.text();
    const inspection = inspectMainContentHtml(html);
    const anchors = inspectInPageAnchors(html);
    const issues = [...inspection.issues];

    if (!response.ok) {
      issues.unshift(`Fetch returned HTTP ${response.status}.`);
    }

    /*
     * A route that never rendered has no landmark to judge. Saying it violates
     * the contract would be a guess, and would let an unrelated outage — a KV
     * binding missing in dev is enough — read as an accessibility regression.
     * Callers separate these from real violations rather than dropping them.
     */
    const unauditable = html.includes("__VINEXT_INITIAL_DEV_ERRORS__") || !response.ok;

    return {
      route,
      url,
      finalUrl: response.url || url,
      status: response.status,
      ok: issues.length === 0,
      unauditable,
      ...inspection,
      anchorIds: anchors.ids,
      inPageAnchors: anchors.anchors,
      issues,
    };
  } catch (error) {
    /*
     * A timeout is not the same as the outage `unauditable` exists to tolerate.
     * That bucket only warns, so folding a timeout into it would turn this hang
     * into something worse: a green check reporting "0 violations" precisely when
     * it audited nothing. A route that answered with an error is still evidence;
     * a route that never answered means the gate did not run, and says so.
     */
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");

    return {
      route,
      url,
      finalUrl: url,
      status: null,
      ok: false,
      unauditable: !timedOut,
      timedOut,
      mainCount: 0,
      mainContentIdCount: 0,
      skipLinkCount: 0,
      nestedMain: false,
      issues: [
        timedOut
          ? `No response within ${Math.round(timeoutMs / 1000)}s.`
          : `Fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
};

export const auditMainContentRoutes = async ({
  baseUrl,
  routes,
  fetchImpl = globalThis.fetch,
  concurrency = 4,
  timeoutMs = ROUTE_FETCH_TIMEOUT_MS,
}) => {
  const results = Array.from({ length: routes.length });
  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(concurrency, routes.length));

  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < routes.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await auditRoute({
        baseUrl,
        route: routes[index],
        fetchImpl,
        timeoutMs,
      });
    }
  });

  await Promise.all(workers);
  return results;
};
