import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
    assert.match(html, /Loading weekly brief/);
    assert.match(html, /What changed/);
    assert.match(html, /Do now/);
    assert.match(html, /Flip when/);
    assert.match(html, /Loading additional sections/);
    assert.doesNotMatch(html, /Shared-card continuity/);
  });

  it("surfaces historical replay context when month and year are present", () => {
    const html = renderToStaticMarkup(<HomePageStreamingFallback searchParams={{ month: "3", year: "2026" }} />);

    assert.match(html, /Historical replay requested · 2026-03/);
    assert.match(html, /Loading selected weekly brief/);
  });

  it("keeps diagnostics fallback neutral", () => {
    const html = renderToStaticMarkup(<WeeklyDiagnosticsFallback />);

    assert.match(html, /Loading additional detail/);
    assert.match(html, /Loading/);
    assert.match(html, /More detail/);
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

    assert.match(html, /Loading page/);
    assert.match(html, /In progress/);
    assert.match(html, /Content is loading/);
    assert.match(html, /id="main-content"/);
    assert.doesNotMatch(html, /Unlock actions/);
    assert.doesNotMatch(html, /Weekly operating call/);
  });

  it("uses the route-agnostic shell from app loading", () => {
    const html = renderToStaticMarkup(<Loading />);

    assert.match(html, /Loading page/);
    assert.doesNotMatch(html, /Loading weekly brief/);
  });
});
