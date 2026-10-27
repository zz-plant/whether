import { readdir } from "node:fs/promises";
import path from "node:path";

const dynamicRouteSamples = {
  "/resolve/[slug]": ["/resolve/ceo"],
  "/answers/[slug]": ["/answers/should-startups-hire-engineers-right-now"],
  "/brief/[week]": ["/brief/2026-w31"],
  "/history/[period]": ["/history/2025"],
  "/operate/[workstream]": ["/operate/financial", "/operate/scenarios"],
  // One of each renderer this page branches between.
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

// The skip link specifically, not every link to #main-content ("Back to top" repeats).
const SKIP_LINK =
  /<a\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bskip-link\b)(?=[^>]*\bhref\s*=\s*["']#main-content["'])[^>]*>/gi;

/*
 * A streamed route's landmark reaches the response as an escaped RSC flight row inside a
 * script, not as markup: ["$","main",null,{"id":"main-content",...}]. These tolerate the
 * escaping and the surrounding props.
 */
const FLIGHT_MAIN_WITH_TARGET =
  /\\?"main\\?"\s*,\s*null\s*,\s*\{[^{}]*\\?"id\\?"\s*:\s*\\?"main-content\\?"/g;
const FLIGHT_SKIP_LINK = /\\?"className\\?"\s*:\s*\\?"skip-link\\?"/g;

// A row starts after an escaped newline or at the start of a pushed chunk.
const FLIGHT_ROW_START = /(?:(?<!\\)\\n|\n|\(")([0-9a-f]+):(?=[[{"A-Z])/g;
const FLIGHT_ROW_REF = /\\?"\$L?([0-9a-f]+)\\?"/g;
const FLIGHT_FALLBACK_REF = /\\?"fallback\\?"\s*:\s*\\?"\$L?([0-9a-f]+)\\?"/g;

/** The flight payload's rows, keyed by id; a chunk boundary inside a row carries no element. */
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
 * Rows a boundary names as its `fallback`, and every row they reach. Every payload carries
 * the layout's 404 boundary, whose <main> is targeted, so these rows must not vouch for the
 * route (docs/agents/lessons/toolchain-and-gates.md, 2026-10-06).
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
 * Presence only, not counts: React re-emits a segment's rows when a stream resumes, so one
 * landmark can legitimately appear twice. Duplicate and nesting detection stay with markup.
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
 * The ids a rendered page carries (from markup and the flight payload) and the `#anchor`s
 * it links to. Returned separately: a page can honestly link to an id it is not currently
 * showing, so the caller asks whether the id exists anywhere in the app.
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

/** Anchors no audited route renders an id for, per route that links to one. */
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

  // Only a route that paints no <main> at all is judged on its flight payload; a painted
  // <main> is the landmark the reader gets, id or not.
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

// Unbounded fetches once hung the build until the platform's ceiling killed it.
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

    // A route that never rendered has no landmark to judge; callers report it separately.
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
    // A timeout is not an outage to tolerate: it means the gate did not run, and fails it.
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
