import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HomePageStreamingFallback } from "../app/components/home/homePageStreamingFallback";
import { WeeklyDiagnosticsFallback } from "../app/components/home/weeklyDiagnosticsFallback";
import { ArtifactActionsFallback } from "../app/components/home/artifactActionsFallback";

describe("homepage loading fallbacks", () => {
  it("keeps the primary loading state decision-first and share-card aligned", () => {
    const html = renderToStaticMarkup(<HomePageStreamingFallback />);

    assert.match(html, /Weekly operating call/);
    assert.match(html, /Opening this week’s brief/);
    assert.match(html, /Shared-card continuity/);
    assert.match(html, /What changed/);
    assert.match(html, /Do now/);
    assert.match(html, /Flip when/);
    assert.match(html, /Decision support follows automatically/);
  });

  it("surfaces historical replay context when month and year are present", () => {
    const html = renderToStaticMarkup(<HomePageStreamingFallback searchParams={{ month: "3", year: "2026" }} />);

    assert.match(html, /Historical replay requested · 2026-03/);
    assert.match(html, /Opening the selected weekly brief/);
  });

  it("frames diagnostics as deferred follow-on work", () => {
    const html = renderToStaticMarkup(<WeeklyDiagnosticsFallback />);

    assert.match(html, /Decision support is streaming in/);
    assert.match(html, /The weekly call is already ready/);
    assert.match(html, /Evidence after matrix/);
  });

  it("frames artifact actions as packaging after the call is ready", () => {
    const html = renderToStaticMarkup(<ArtifactActionsFallback />);

    assert.match(html, /Preparing share artifacts/);
    assert.match(html, /The call is ready/);
    assert.match(html, /Exporting/);
  });
});
