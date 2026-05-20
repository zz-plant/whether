import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  navigationGroupLabels,
  navigationLayers,
  navigationLabelByPath,
  primaryNavigationLayers,
  primaryNavigationSurfaceCount,
  resolveNavigationRouteCue,
  resolvePrimaryNavigationSurfaceCue,
  supportingNavigationLayers,
} from "../lib/navigation/informationArchitecture";
import { primaryNavigation } from "../lib/navigation/primaryNavigation";

describe("navigation information architecture", () => {
  it("keeps primary navigation aligned to primary IA layers only", () => {
    assert.equal(primaryNavigation.length, primaryNavigationLayers.length);

    for (const layer of primaryNavigationLayers) {
      const link = primaryNavigation.find((item) => item.href === layer.href);
      assert.ok(link);
      assert.equal(link?.label, layer.navLabel ?? layer.label);
      assert.equal(link?.description, layer.description);
    }
  });

  it("defines passive group labels from IA as single source of truth", () => {
    assert.equal(navigationGroupLabels.core, "This week");
    assert.equal(navigationGroupLabels.workflow, "Decide");
    assert.equal(navigationGroupLabels.reference, "Check");

    for (const layer of navigationLayers) {
      assert.ok(navigationGroupLabels[layer.group]);
    }
  });

  it("keeps one layer for each IA boundary and route", () => {
    const hrefs = new Set(navigationLayers.map((layer) => layer.href));
    const labels = new Set(navigationLayers.map((layer) => layer.label));

    assert.equal(hrefs.size, navigationLayers.length);
    assert.equal(labels.size, navigationLayers.length);

    assert.equal(navigationLabelByPath["/"], "Weekly Brief");
    assert.equal(navigationLabelByPath["/evidence"], "Evidence");
    assert.equal(navigationLabelByPath["/planning"], "Planning");
    assert.equal(navigationLabelByPath["/resolve"], "Decision Tools");
    assert.equal(navigationLabelByPath["/trust"], "Readiness");
  });

  it("exposes primary surface progress cues and route cues for navigation copy", () => {
    assert.equal(primaryNavigationSurfaceCount, 5);
    assert.equal(resolvePrimaryNavigationSurfaceCue("/"), "Start here");
    assert.equal(resolvePrimaryNavigationSurfaceCue("/evidence"), "Open evidence");
    assert.equal(resolvePrimaryNavigationSurfaceCue("/planning"), "Open planning");
    assert.equal(resolvePrimaryNavigationSurfaceCue("/resolve"), "Open decision tools");
    assert.equal(resolvePrimaryNavigationSurfaceCue("/trust"), "Check trust");
    assert.equal(resolveNavigationRouteCue("/"), "Weekly Brief");
    assert.equal(resolveNavigationRouteCue("/evidence"), "/evidence");
  });

  it("keeps canonical route transitions for Decide and Method", () => {
    const resolveLayer = navigationLayers.find((layer) => layer.key === "resolve");
    const trustLayer = navigationLayers.find((layer) => layer.key === "trust");
    assert.equal(resolveLayer?.href, "/resolve");
    assert.equal(trustLayer?.href, "/trust");
    assert.equal(resolveLayer?.href.startsWith("#"), false);
    assert.equal(trustLayer?.href.startsWith("#"), false);
  });
});
