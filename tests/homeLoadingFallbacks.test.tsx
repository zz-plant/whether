import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HomePageStreamingFallback } from "../app/components/home/homePageStreamingFallback";
import { WeeklyDiagnosticsFallback } from "../app/components/home/weeklyDiagnosticsFallback";
import { ArtifactActionsFallback } from "../app/components/home/artifactActionsFallback";

describe("homepage loading fallbacks", () => {
  it("keeps the primary loading state decision-first", () => {
    const html = renderToStaticMarkup(<HomePageStreamingFallback />);

    assert.match(html, /Weekly operating call/);
    assert.match(html, /The top-fold planning call lands first/);
    assert.match(html, /Top fold first/);
    assert.match(html, /Decision support follows automatically/);
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
