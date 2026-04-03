import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HomePageStreamingFallback } from "../app/components/home/homePageStreamingFallback";
import { WeeklyDiagnosticsFallback } from "../app/components/home/weeklyDiagnosticsFallback";
import { ArtifactActionsFallback } from "../app/components/home/artifactActionsFallback";
import { RouteLoadingShell } from "../app/components/routeLoadingShell";
import Loading from "../app/loading";

describe("homepage loading fallbacks", () => {
  it("keeps the primary loading state brief-specific but neutral", () => {
    const html = renderToStaticMarkup(<HomePageStreamingFallback />);

    assert.match(html, /Weekly brief/);
    assert.match(html, /Weekly brief loading/);
    assert.match(html, /Action now/);
    assert.match(html, /Pause if/);
    assert.match(html, /Change course if/);
    assert.match(html, /Preparing compact evidence and trust handoff\./);
    assert.doesNotMatch(html, /Shared-card continuity/);
  });

  it("surfaces historical replay context when month and year are present", () => {
    const html = renderToStaticMarkup(<HomePageStreamingFallback searchParams={{ month: "3", year: "2026" }} />);

    assert.match(html, /Historical replay requested · 2026-03/);
    assert.match(html, /Selected historical weekly brief is loading\./);
  });

  it("keeps diagnostics fallback neutral", () => {
    const html = renderToStaticMarkup(<WeeklyDiagnosticsFallback />);

    assert.match(html, /Preparing compact evidence and trust handoff\./);
    assert.match(html, /Updating/);
    assert.match(html, /Planning/);
    assert.doesNotMatch(html, /role-specific guidance/);
  });

  it("keeps artifact actions fallback neutral", () => {
    const html = renderToStaticMarkup(<ArtifactActionsFallback />);

    assert.match(html, /Loading share actions/);
    assert.match(html, /Loading/);
    assert.doesNotMatch(html, /citation-safe export actions/);
  });

  it("keeps the root loading shell route-agnostic", () => {
    const html = renderToStaticMarkup(<RouteLoadingShell />);

    assert.match(html, /Preparing brief/);
    assert.match(html, /In progress/);
    assert.match(html, /Live brief is being prepared/);
    assert.match(html, /id="main-content"/);
    assert.doesNotMatch(html, /Unlock actions/);
    assert.doesNotMatch(html, /Weekly operating call/);
  });

  it("uses the route-agnostic shell from app loading", () => {
    const html = renderToStaticMarkup(<Loading />);

    assert.match(html, /Preparing brief/);
    assert.doesNotMatch(html, /Weekly brief loading/);
  });
});
