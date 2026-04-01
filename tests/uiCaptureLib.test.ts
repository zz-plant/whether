import assert from "node:assert/strict";
import { describe, it } from "bun:test";
// @ts-ignore Runtime-only .mjs helper is validated by these tests.
import { buildCaptureGalleryHtml, resolveCaptureTargets } from "../scripts/ui-capture.lib.mjs";

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
});
