#!/usr/bin/env node
/**
 * Fails the build when a route does not own exactly one `<main id="main-content">`,
 * or links to an `#anchor` that no audited route renders.
 *
 * The skip link is the only way a keyboard or screen-reader user gets past the
 * nav, and it is a single anchor pointed at a single id — so a duplicated,
 * missing, or nested landmark breaks it silently, on one route, in a way no
 * type or unit test sees. Layouts, shells, and loading fallbacks all render
 * `<main>` under different conditions, so the only honest check is to fetch the
 * assembled page.
 *
 * Every route is audited, not a sample: `collectMainContentRouteSamples` walks
 * `app/` and throws when a new dynamic page has no representative URL pinned in
 * `main-content-landmarks.mjs`, so adding a route forces a decision about it.
 *
 * Usage:
 *   node scripts/check-main-content-landmarks.mjs
 *   node scripts/check-main-content-landmarks.mjs --base-url http://127.0.0.1:3000
 *   node scripts/check-main-content-landmarks.mjs --no-dev    # require a running server
 */
import process from "node:process";
import { availableParallelism } from "node:os";

import {
  auditMainContentRoutes,
  collectMainContentRouteSamples,
  collectUnresolvedAnchors,
} from "./main-content-landmarks.mjs";
import { isDeployGate } from "./deploy-gate.mjs";
import { withDevServer } from "./dev-server.lib.mjs";

const args = process.argv.slice(2);

const hasFlag = (flag) => args.includes(flag);

const readArgValue = (flag, fallback) => {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) return fallback;
  return args[index + 1];
};

const DEFAULT_BASE_URL = process.env.LANDMARKS_BASE_URL ?? "http://127.0.0.1:3000";
const baseUrl = readArgValue("--base-url", DEFAULT_BASE_URL);
/*
 * Inside the deploy gate this runs in the Cloudflare build container: a smaller box
 * than a dev machine, always a cold start (no Vite cache, no server to reuse), and
 * lint, tsc, and the test suite competing for the same cores while the dev server
 * boots and compiles its first routes. The bounds stay — a route that never answers
 * must still fail the gate — but they get room a workstation never needs, so a slow
 * container reads as slow rather than as broken. Both remain overridable by flag.
 */
const inDeployGate = isDeployGate();
const timeoutMs = Number.parseInt(readArgValue("--timeout-ms", inDeployGate ? "180000" : "90000"), 10);
/*
 * Route fetches are mostly waiting: the dev server compiles each route on demand and
 * this process does nothing while it does. A flat 4 left most of a bigger box idle —
 * measured on 2026-09-03, the 40-route audit took 51.8s at 4 and 33.0s at 8 on four
 * cores, and 12 bought nothing more (32.7s), because what is left is the server's
 * cold start and Vite's own compile rather than anything more requests can overlap.
 *
 * So: twice the cores, capped at 8, floored at the old 4. A two-core build container
 * lands on 4 and behaves exactly as it did — which matters, because this check runs
 * where a route that compiles slowly must not read as a route that never answered.
 * Only a box with cores to spare goes faster. Still overridable by flag.
 */
const defaultConcurrency = Math.min(8, Math.max(4, availableParallelism() * 2));
const concurrency = Number.parseInt(readArgValue("--concurrency", String(defaultConcurrency)), 10);
/*
 * Separate from --timeout-ms, which bounds dev-server readiness rather than a
 * single route. Tunable so a slow container can be given room without editing code.
 *
 * The deploy-gate bound went 60s -> 120s on 2026-09-17, measured rather than
 * guessed. The gate starts its own dev server, so every route compiles from
 * cold, and the two heaviest — /share and /trust — do not answer inside 60s on
 * a loaded box: a cold run against `origin/main`, with none of that day's
 * changes in it, reported exactly those two as "never answered" and went green
 * at 150s. So this was not a property of any one branch, it was a bound set
 * below what a cold compile of the slowest routes costs, and it read as an
 * unexplained red build because the audit's own log is not reachable from a
 * sandbox.
 *
 * A hung route still fails the gate. This widens the bound, not the meaning:
 * "never answered" has to mean the route is broken, not that it was compiling.
 */
const routeTimeoutMs = Number.parseInt(readArgValue("--route-timeout-ms", inDeployGate ? "120000" : "30000"), 10);

if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
  console.error("`--timeout-ms` must be a positive integer.");
  process.exit(2);
}

if (!Number.isFinite(routeTimeoutMs) || routeTimeoutMs <= 0) {
  console.error("`--route-timeout-ms` must be a positive integer.");
  process.exit(1);
}

if (!Number.isFinite(concurrency) || concurrency <= 0) {
  console.error("`--concurrency` must be a positive integer.");
  process.exit(2);
}

/**
 * Readiness, deliberately not health. `/api/health` reports 503 whenever report
 * data is degraded — an offline FRED is enough — but a degraded server still
 * renders every route's markup, which is all this audit reads. Treating 503 as
 * "not ready" made the check unrunnable offline and sent it off to start a
 * second dev server that vinext refuses to run in the same directory.
 *
 * So: any HTTP response means listening. Only a transport error means not.
 */
const probe = async (url) => {
  const readyUrl = new URL("/api/health", url).toString();

  try {
    const response = await fetch(readyUrl, {
      method: "GET",
      signal: AbortSignal.timeout(2500),
    });
    return { ok: true, status: response.status, healthUrl: readyUrl };
  } catch (error) {
    return {
      ok: false,
      status: null,
      healthUrl: readyUrl,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const reportResults = (results) => {
  // A route that never rendered is reported, never counted as a violation:
  // failing the skip-link gate on an unrelated outage is how a check earns a
  // reputation for crying wolf and stops being read.
  const unauditable = results.filter((result) => result.unauditable);
  const timedOut = results.filter((result) => result.timedOut);
  const violations = results.filter((result) => !result.ok && !result.unauditable && !result.timedOut);
  const audited = results.length - unauditable.length - timedOut.length;
  /*
   * Judged across every route that rendered, never per page. Whether a given
   * section is on screen depends on the data a route got — figures entered, a
   * degraded banner, a live upstream — so "this page links to an id it is not
   * currently showing" is a claim about the data, and would go red in a
   * container whose log cannot be read from here. "No page in the app renders
   * this id" is a claim about the code, and is what the four found by hand had
   * in common.
   */
  const auditedResults = results.filter((result) => !result.unauditable && !result.timedOut);
  const unresolvedAnchors = collectUnresolvedAnchors(auditedResults);

  for (const violation of violations) {
    console.error(`\n✗ ${violation.route}  (${violation.finalUrl})`);
    for (const issue of violation.issues) {
      console.error(`    ${issue}`);
    }
  }

  for (const entry of unresolvedAnchors) {
    console.error(`\n✗ ${entry.route}`);
    for (const anchor of entry.missing) {
      console.error(`    Links to #${anchor}, which no audited route renders.`);
    }
  }

  if (unauditable.length > 0) {
    console.warn(`\n⚠ ${unauditable.length} route(s) could not be audited — they did not render:`);
    for (const route of unauditable) {
      const reason = route.status && route.status >= 400
        ? `HTTP ${route.status}`
        : route.issues.find((issue) => /error boundary|Fetch failed/.test(issue)) ?? "no route output";
      console.warn(`    ${route.route}  (${reason})`);
    }
    console.warn("  Landmark coverage for these routes is unknown, not clean.");
  }

  /*
   * Reported before violations, and fatal on its own. A route that never answered
   * is not a clean route — if these were only warned about, a container that
   * cannot reach the routes at all would produce "0 violations" and a green gate,
   * which is a worse outcome than the timeout this bound replaced.
   */
  if (timedOut.length > 0) {
    console.error(`\n✗ ${timedOut.length} route(s) never answered:`);
    for (const route of timedOut) {
      console.error(`    ${route.route}  (${route.issues[0]})`);
    }
    console.error(
      "\nThe audit could not run for these routes, so their landmark coverage is unproven.",
    );
    return 1;
  }

  if (violations.length > 0 || unresolvedAnchors.length > 0) {
    console.error(
      `\n${violations.length} landmark problem(s) and ${unresolvedAnchors.length} route(s) linking to an id no page renders, across ${audited} rendered routes.`,
    );
    console.error(
      'Each route needs exactly one <main id="main-content"> with exactly one link to it, and every #anchor it links to must exist on some page.',
    );
    return 1;
  }

  console.log(`\n✅ ${audited} rendered routes own one <main id="main-content">, and every #anchor they link to exists`);
  return 0;
};

const run = async () => {
  const routes = await collectMainContentRouteSamples();
  console.log(`Auditing ${routes.length} routes for main-landmark ownership.`);

  const audit = async (readyBaseUrl) =>
    auditMainContentRoutes({ baseUrl: readyBaseUrl, routes, concurrency, timeoutMs: routeTimeoutMs });

  if (hasFlag("--no-dev")) {
    const initialProbe = await probe(baseUrl);
    if (!initialProbe.ok) {
      const detail = initialProbe.error ?? `status ${initialProbe.status}`;
      throw new Error(
        `--no-dev was passed but ${baseUrl} is not reachable (${initialProbe.healthUrl}: ${detail}).`,
      );
    }
    return reportResults(await audit(baseUrl));
  }

  return withDevServer({
    baseUrl,
    outDir: "artifacts/landmarks",
    logName: "check-main-content-landmarks.dev.log",
    timeoutMs,
    probe,
    onStatus: (message) => console.log(message),
    body: audit,
  }).then(reportResults);
};

run().then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  },
);
