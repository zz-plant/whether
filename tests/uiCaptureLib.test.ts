import assert from "node:assert/strict";
import { describe, it } from "bun:test";
// @ts-ignore Runtime-only .mjs helper is validated by these tests.
import {
  buildCaptureGalleryHtml,
  probeBaseUrl,
  probeHtmlAssetIntegrity,
  resolveCaptureTargets,
} from "../scripts/ui-capture.lib.mjs";

describe("ui capture helpers", () => {
  it("keeps the full configured capture set when no filters are provided", () => {
    const targets = resolveCaptureTargets();

    assert.ok(targets.length >= 4);
    assert.ok(targets.some((target: { id: string }) => target.id === "operator-brief-mobile"));
    assert.ok(targets.some((target: { id: string }) => target.id === "operator-brief-desktop"));
  });

  it("filters capture targets by requested id", () => {
    const targets = resolveCaptureTargets(["operator-brief-mobile"]);

    assert.deepEqual(targets.map((target: { id: string }) => target.id), ["operator-brief-mobile"]);
  });

  it("renders a gallery page with route and image references for each capture", () => {
    const html = buildCaptureGalleryHtml({
      baseUrl: "http://127.0.0.1:3000",
      generatedAt: "2026-03-31T12:00:00.000Z",
      captures: [
        {
          id: "operator-brief-mobile",
          label: "Operator brief / mobile compact",
          path: "/mockups/operator-brief?viewport=mobile&density=compact",
          viewport: { width: 430, height: 932 },
          fullPage: true,
          outputPath: "/tmp/operator-brief-mobile.png",
          outputFileName: "operator-brief-mobile.png",
          url: "http://127.0.0.1:3000/mockups/operator-brief?viewport=mobile&density=compact",
        },
      ],
    });

    assert.match(html, /Whether UI Capture Gallery/);
    assert.match(html, /operator-brief-mobile/);
    assert.match(html, /operator-brief-mobile\.png/);
    assert.match(html, /mockups\/operator-brief\?viewport=mobile&amp;density=compact/);
  });

  it("accepts dev HTML that references source files instead of hashed assets", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url === "http://127.0.0.1:3000/") {
        return new Response(
          '<!doctype html><html><head><link rel="stylesheet" href="/app/globals.css" /><link rel="modulepreload" href="/@id/__x00__virtual:vite-rsc/entry-browser" /></head></html>',
          { status: 200 },
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    try {
      const probe = await probeHtmlAssetIntegrity("http://127.0.0.1:3000");

      assert.equal(probe.ok, true);
      assert.deepEqual(probe.assetUrls, []);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("flags homepage HTML that references missing hashed assets", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method ?? "GET";

      if (url === "http://127.0.0.1:3000/") {
        return new Response(
          '<!doctype html><html><head><link rel="stylesheet" href="/assets/index-stale.css" /><link rel="modulepreload" href="/assets/index-stale.js" /></head></html>',
          { status: 200 },
        );
      }

      if (url === "http://127.0.0.1:3000/assets/index-stale.css" && method === "HEAD") {
        return new Response("", { status: 404 });
      }

      if (url === "http://127.0.0.1:3000/assets/index-stale.js" && method === "HEAD") {
        return new Response("", { status: 404 });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    }) as typeof fetch;

    try {
      const probe = await probeHtmlAssetIntegrity("http://127.0.0.1:3000");

      assert.equal(probe.ok, false);
      assert.match(probe.error ?? "", /missing assets/i);
      assert.deepEqual(probe.failingAssets, [
        "/assets/index-stale.css (404)",
        "/assets/index-stale.js (404)",
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("treats a healthcheck-only server with broken assets as unreachable for UI capture", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method ?? "GET";

      if (url === "http://127.0.0.1:3000/api/health") {
        return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
      }

      if (url === "http://127.0.0.1:3000/") {
        return new Response(
          '<!doctype html><html><head><link rel="stylesheet" href="/assets/index-stale.css" /></head></html>',
          { status: 200 },
        );
      }

      if (url === "http://127.0.0.1:3000/assets/index-stale.css" && method === "HEAD") {
        return new Response("", { status: 404 });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    }) as typeof fetch;

    try {
      const probe = await probeBaseUrl("http://127.0.0.1:3000");

      assert.equal(probe.ok, false);
      assert.match(probe.error ?? "", /missing assets/i);
      assert.equal(probe.status, 200);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("allows UI capture when the homepage is coherent even if the health endpoint times out", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url === "http://127.0.0.1:3000/api/health") {
        throw new Error("timed out");
      }

      if (url === "http://127.0.0.1:3000/") {
        return new Response(
          '<!doctype html><html><head><link rel="stylesheet" href="/app/globals.css" /></head></html>',
          { status: 200 },
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    try {
      const probe = await probeBaseUrl("http://127.0.0.1:3000");

      assert.equal(probe.ok, true);
      assert.equal(probe.healthError, "timed out");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
