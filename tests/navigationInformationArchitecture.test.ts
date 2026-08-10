import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  navigationLayers,
  navigationLayerByKey,
  navigationLabelByPath,
  primaryNavigationLayers,
  reportShellPaths,
} from "../lib/navigation/informationArchitecture";

describe("navigation information architecture", () => {
  it("orders primary layers by the operator loop", () => {
    assert.deepEqual(
      primaryNavigationLayers.map((layer) => layer.href),
      ["/", "/signals", "/operate", "/answer", "/trust"],
    );
  });

  it("keeps one layer for each IA boundary and route", () => {
    const hrefs = new Set(navigationLayers.map((layer) => layer.href));
    const labels = new Set(navigationLayers.map((layer) => layer.label));

    assert.equal(hrefs.size, navigationLayers.length);
    assert.equal(labels.size, navigationLayers.length);

    assert.equal(navigationLabelByPath["/"], "Weekly Brief");
    assert.equal(navigationLabelByPath["/signals"], "Evidence");
    assert.equal(navigationLabelByPath["/operate"], "Plan");
    assert.equal(navigationLabelByPath["/answer"], "Resolve");
    assert.equal(navigationLabelByPath["/trust"], "Trust");
  });

  it("derives report shell paths from the IA layers", () => {
    assert.deepEqual(
      reportShellPaths,
      navigationLayers.map((layer) => layer.href),
    );
  });

  it("nests supporting layers under an existing parent", () => {
    for (const layer of navigationLayers) {
      if (layer.tier === "supporting") {
        assert.ok(layer.parentKey, `${layer.key} must declare a parent`);
        assert.ok(navigationLayerByKey[layer.parentKey!], `${layer.key} parent must exist`);
      } else {
        assert.equal(layer.parentKey, undefined);
      }
    }
  });

  it("keeps canonical route transitions for Decide and Method", () => {
    const resolveLayer = navigationLayers.find((layer) => layer.key === "resolve");
    const trustLayer = navigationLayers.find((layer) => layer.key === "trust");
    assert.equal(resolveLayer?.href, "/answer");
    assert.equal(trustLayer?.href, "/trust");
    assert.equal(resolveLayer?.href.startsWith("#"), false);
    assert.equal(trustLayer?.href.startsWith("#"), false);
  });

  it("matches primary route aliases consistently for active nav state", () => {
    const { pathMatchesLink } = require("../lib/navigation/pathMatching");

    assert.ok(pathMatchesLink("/signals", "/signals"));
    assert.ok(pathMatchesLink("/signals", "/evidence"));
    assert.ok(pathMatchesLink("/signals", "/evidence/capital-tightness-watch"));

    assert.ok(pathMatchesLink("/operate", "/operate"));
    assert.ok(pathMatchesLink("/operate", "/planning"));
    assert.ok(pathMatchesLink("/operate", "/planning/financial"));

    assert.ok(pathMatchesLink("/answer", "/answer"));
    assert.ok(pathMatchesLink("/answer", "/resolve"));
    assert.ok(pathMatchesLink("/answer", "/answers"));
  });
});
