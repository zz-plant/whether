import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

import { ContentPageShell } from "../app/components/ui/contentPageShell";
import {
  auditMainContentRoutes,
  collectMainContentRouteSamples,
  inspectMainContentHtml,
} from "../scripts/main-content-landmarks.mjs";

describe("main-content landmark ownership", () => {
  it("gives ContentPageShell routes the skip-link target", () => {
    const html = renderToStaticMarkup(
      <ContentPageShell>
        <h1>Route content</h1>
      </ContentPageShell>,
    );

    assert.match(html, /^<main\b[^>]*\bid="main-content"/);
    assert.equal((html.match(/<main\b/g) ?? []).length, 1);
  });

  it("keeps route loading fallbacks out of main landmark ownership", () => {
    const source = readFileSync(
      new URL("../app/components/routeLoadingShell.tsx", import.meta.url),
      "utf8",
    );

    assert.doesNotMatch(source, /ReportShell/);
    assert.doesNotMatch(source, /<main\b/);
    assert.doesNotMatch(source, /\bid=["']main-content["']/);
  });
});

describe("fetch-based main-content guard", () => {
  const validHtml = `<!doctype html><html><body>
    <a class="skip-link" href="#main-content">Skip to content</a>
    <main id="main-content"><h1>Brief</h1></main>
  </body></html>`;

  it("accepts one skip link targeting the only main landmark", () => {
    assert.deepEqual(inspectMainContentHtml(validHtml), {
      mainCount: 1,
      mainContentIdCount: 1,
      skipLinkCount: 1,
      nestedMain: false,
      issues: [],
    });
  });

  it("rejects missing, duplicate, and nested main landmarks", () => {
    const missing = inspectMainContentHtml(
      '<a href="#main-content">Skip</a><main>Content</main>',
    );
    assert.ok(missing.issues.some((issue: string) => /main-content/.test(issue)));

    const duplicate = inspectMainContentHtml(
      '<a href="#main-content">Skip</a><main id="main-content"></main><main id="main-content"></main>',
    );
    assert.ok(duplicate.issues.some((issue: string) => /2 <main>/.test(issue)));
    assert.ok(duplicate.issues.some((issue: string) => /2 elements/.test(issue)));

    const nested = inspectMainContentHtml(
      '<a href="#main-content">Skip</a><main id="main-content"><main></main></main>',
    );
    assert.equal(nested.nestedMain, true);
    assert.ok(nested.issues.some((issue: string) => /nested/.test(issue)));
  });

  it("fetches route output and reports the route that violates the contract", async () => {
    const responses = new Map([
      ["http://whether.test/valid", validHtml],
      ["http://whether.test/missing", '<a href="#main-content">Skip</a><main>Missing target</main>'],
    ]);
    const fetchCalls: string[] = [];
    const fetchImpl = async (input: string | URL | Request) => {
      const url = input.toString();
      fetchCalls.push(url);
      return new Response(responses.get(url) ?? "Not found", { status: responses.has(url) ? 200 : 404 });
    };

    const results = await auditMainContentRoutes({
      baseUrl: "http://whether.test",
      routes: ["/valid", "/missing"],
      fetchImpl,
    });

    assert.deepEqual(fetchCalls, ["http://whether.test/valid", "http://whether.test/missing"]);
    assert.equal(results[0].ok, true);
    assert.equal(results[1].ok, false);
    assert.equal(results[1].route, "/missing");
  });

  it("covers every page file and resolves every dynamic route family", async () => {
    const routes = await collectMainContentRouteSamples();

    for (const expected of [
      "/",
      "/about",
      "/answer/ship-checklist",
      "/brief/2026-w31",
      "/embed",
      "/history/2025",
      "/resources/decision-shield-overview",
      "/search",
      "/state",
      "/template",
    ]) {
      assert.ok(routes.includes(expected), `${expected} is absent from the landmark audit`);
    }

    assert.equal(routes.some((route: string) => route.includes("[")), false);
  });

  it("runs from every local and preview check gate", () => {
    const packageJson = readFileSync(new URL("../package.json", import.meta.url), "utf8");
    const runChecks = readFileSync(new URL("../scripts/run-checks.mjs", import.meta.url), "utf8");
    const prePush = readFileSync(new URL("../.husky/pre-push", import.meta.url), "utf8");
    const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
    const previewBuild = readFileSync(new URL("../scripts/vinext-run.mjs", import.meta.url), "utf8");

    assert.match(packageJson, /"check:landmarks":\s*"node scripts\/check-main-content-landmarks\.mjs"/);
    assert.match(runChecks, /name: "landmarks", script: "check:landmarks"/);
    assert.match(prePush, /run-checks\.mjs[^\n]*\blandmarks\b/);
    assert.match(workflow, /run-checks\.mjs[^\n]*\blandmarks\b/);
    assert.match(previewBuild, /run-checks\.mjs[^\n]*\blandmarks\b/);
  });
});
