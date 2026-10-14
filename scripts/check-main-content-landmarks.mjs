#!/usr/bin/env node
/**
 * Fails the build when a route does not own exactly one `<main id="main-content">` with one
 * skip link to it, or links to an `#anchor` no audited route renders. Layouts, shells and
 * loading fallbacks all render `<main>` under different conditions, so the assembled page
 * is fetched; every route is audited, and a new dynamic page with no sample URL throws.
 * Bounds and their history: docs/agents/lessons/automation-and-deploy-gate.md.
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
// The deploy gate is a small, cold container; the bounds stay bounds but get room.
const inDeployGate = isDeployGate();
const timeoutMs = Number.parseInt(readArgValue("--timeout-ms", inDeployGate ? "180000" : "90000"), 10);
// Fetches are mostly waiting on the dev server's compile: twice the cores, capped at 8,
// floored at the 4 a two-core container always had (measured 2026-09-03).
const defaultConcurrency = Math.min(8, Math.max(4, availableParallelism() * 2));
const concurrency = Number.parseInt(readArgValue("--concurrency", String(defaultConcurrency)), 10);
// Per route, separate from dev-server readiness. 120s in the gate is measured: a cold
// compile of /share or /trust does not answer inside 60s on a loaded box.
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

/** Readiness, not health: a degraded server (503) still renders every route's markup. */
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
  // A route that never rendered is reported, never counted as a violation.
  const unauditable = results.filter((result) => result.unauditable);
  const timedOut = results.filter((result) => result.timedOut);
  const violations = results.filter((result) => !result.ok && !result.unauditable && !result.timedOut);
  const audited = results.length - unauditable.length - timedOut.length;
  // Anchors are judged across every rendered route: which sections a page shows depends on
  // its data, but "no page renders this id" is a claim about the code.
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

  // Fatal on its own: a container that reaches no route must not report "0 violations".
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
    // A second, fresh start in the deploy gate only: a cold container's first start is the
    // one that has missed its deadline (dev-server.lib.mjs). Locally a failure is real.
    startAttempts: inDeployGate ? 2 : 1,
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
