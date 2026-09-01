import { readdir } from "node:fs/promises";
import path from "node:path";

const dynamicRouteSamples = {
  "/answer/[slug]": ["/answer/ceo"],
  "/answer/[slug]/[cluster]": ["/answer/ceo/capital-raising"],
  "/answers/[slug]": ["/answers/should-startups-hire-engineers-right-now"],
  "/brief/[week]": ["/brief/2026-w31"],
  "/history/[period]": ["/history/2025"],
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
  "/toolkits/[slug]/[cluster]": ["/toolkits/pmf/risk-appetite-watch"],
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
 * Most routes here are client-streamed, so their landmark never reaches the
 * response as literal markup — it arrives as an RSC flight row instead:
 *
 *   ["$","main",null,{"id":"main-content","tabIndex":-1,...}]
 *
 * embedded in a script, with the quotes backslash-escaped. Scanning only for
 * `<main>` tags reported 21 of 40 routes as missing a landmark they in fact
 * had. These patterns tolerate the escaping and the surrounding props.
 */
const FLIGHT_MAIN_WITH_TARGET =
  /\\?"main\\?"\s*,\s*null\s*,\s*\{[^{}]*\\?"id\\?"\s*:\s*\\?"main-content\\?"/g;
const FLIGHT_SKIP_LINK = /\\?"className\\?"\s*:\s*\\?"skip-link\\?"/g;

/**
 * What the flight payload claims about the landmark.
 *
 * Presence only, deliberately not counts. React re-emits a segment's rows when
 * a stream resumes, so the same single landmark can legitimately appear twice —
 * counting occurrences would invent duplicates. A streamed route is therefore
 * checked for "declares its landmark and a link to it"; duplicate and nesting
 * detection stay with the routes that ship literal markup.
 */
const inspectFlightPayload = (html) => ({
  hasMainWithTarget: countMatches(html, FLIGHT_MAIN_WITH_TARGET) > 0,
  hasSkipLink: countMatches(html, FLIGHT_SKIP_LINK) > 0,
});

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
   * A streamed route's real landmark arrives in the flight payload. Some also
   * flush a placeholder <main> first — /state ships a centered loading shell
   * with no id — so the trigger is "the literal markup never produced a
   * correctly-targeted landmark", not "there was no <main>". A route that does
   * ship a targeted one in HTML is judged on that markup, so genuine duplicates
   * and nesting still fail rather than being excused by the payload.
   */
  if (mainWithTargetCount === 0 && !devErrorBoundary) {
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
  const results = new Array(routes.length);
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
