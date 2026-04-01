import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildArtifactModeHref,
  buildArtifactShareText,
  buildArtifactShareTitle,
  parseArtifactModeFromSearch,
} from "../lib/shareArtifacts";

describe("shareArtifacts helpers", () => {
  it("keeps operator mode canonical and preserves other URL parts", () => {
    assert.equal(
      buildArtifactModeHref("https://whether.work/?q=brief#section", "operator"),
      "https://whether.work/?q=brief#section",
    );
    assert.equal(
      buildArtifactModeHref("https://whether.work/?q=brief#section", "explainer"),
      "https://whether.work/?q=brief&artifactMode=explainer#section",
    );
  });

  it("parses artifact mode from search and builds share text", () => {
    assert.equal(parseArtifactModeFromSearch("?artifactMode=explainer"), "explainer");
    assert.equal(parseArtifactModeFromSearch("?artifactMode=operator"), "operator");
    assert.equal(parseArtifactModeFromSearch("?artifactMode=other"), null);

    const title = buildArtifactShareTitle("explainer");
    const text = buildArtifactShareText({
      mode: "explainer",
      summary: "Share-ready weekly brief",
      brief: "Weekly operator brief content",
      url: "https://whether.work/?artifactMode=explainer",
    });

    assert.equal(title, "Whether Explainer brief");
    assert.match(text, /Share-ready weekly brief/);
    assert.match(text, /Weekly operator brief content/);
    assert.match(text, /https:\/\/whether\.work\/\?artifactMode=explainer/);
  });
});
