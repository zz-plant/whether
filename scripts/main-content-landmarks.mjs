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

export const inspectMainContentHtml = (html) => {
  const mainTags = [...html.matchAll(/<\/?main\b[^>]*>/gi)].map((match) => match[0]);
  const openingMainTags = mainTags.filter((tag) => !/^<\/main\b/i.test(tag));
  const mainContentIdCount = countMatches(html, /\bid\s*=\s*["']main-content["']/gi);
  const skipLinkCount = countMatches(html, /\bhref\s*=\s*["']#main-content["']/gi);
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
  if (html.includes("__VINEXT_INITIAL_DEV_ERRORS__")) {
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

const auditRoute = async ({ baseUrl, route, fetchImpl }) => {
  const url = new URL(route, `${baseUrl.replace(/\/$/, "")}/`).toString();

  try {
    const response = await fetchImpl(url, {
      headers: { accept: "text/html" },
      redirect: "follow",
    });
    const html = await response.text();
    const inspection = inspectMainContentHtml(html);
    const issues = [...inspection.issues];

    if (!response.ok) {
      issues.unshift(`Fetch returned HTTP ${response.status}.`);
    }

    return {
      route,
      url,
      finalUrl: response.url || url,
      status: response.status,
      ok: issues.length === 0,
      ...inspection,
      issues,
    };
  } catch (error) {
    return {
      route,
      url,
      finalUrl: url,
      status: null,
      ok: false,
      mainCount: 0,
      mainContentIdCount: 0,
      skipLinkCount: 0,
      nestedMain: false,
      issues: [`Fetch failed: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
};

export const auditMainContentRoutes = async ({
  baseUrl,
  routes,
  fetchImpl = globalThis.fetch,
  concurrency = 4,
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
      });
    }
  });

  await Promise.all(workers);
  return results;
};
