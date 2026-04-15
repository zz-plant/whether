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
    assert.equal(navigationLabelByPath["/signals"], "Evidence");
    assert.equal(navigationLabelByPath["/operations"], "Planning");
    assert.equal(navigationLabelByPath["/decide"], "Decision Tools");
    assert.equal(navigationLabelByPath["/toolkits"], "Toolkits");
    assert.equal(navigationLabelByPath["/method"], "Trust");
  });

  it("exposes primary surface progress cues and route cues for navigation copy", () => {
    assert.equal(primaryNavigationSurfaceCount, 5);
    assert.equal(resolvePrimaryNavigationSurfaceCue("/"), "Start here");
    assert.equal(resolvePrimaryNavigationSurfaceCue("/signals"), "Open evidence");
    assert.equal(resolvePrimaryNavigationSurfaceCue("/operations"), "Open planning");
    assert.equal(resolvePrimaryNavigationSurfaceCue("/decide"), "Open decision tools");
    assert.equal(resolvePrimaryNavigationSurfaceCue("/method"), "Check trust");
    assert.equal(resolveNavigationRouteCue("/"), "Weekly Brief");
    assert.equal(resolveNavigationRouteCue("/signals"), "/signals");
  });

  it("keeps canonical route transitions for Decide and Method", () => {
    const decideLayer = navigationLayers.find((layer) => layer.key === "decide");
    const methodLayer = navigationLayers.find((layer) => layer.key === "method");

    assert.equal(decideLayer?.href, "/decide");
    assert.equal(methodLayer?.href, "/method");
    assert.equal(decideLayer?.href.startsWith("#"), false);
    assert.equal(methodLayer?.href.startsWith("#"), false);
  });

  it("demotes Toolkits into a supporting surface with an explicit parent", () => {
    assert.equal(primaryNavigationLayers.length, 5);
    assert.deepEqual(
      primaryNavigationLayers.map((layer) => layer.key),
      ["weekly-brief", "signals", "operations", "decide", "method"],
    );

    assert.deepEqual(
      supportingNavigationLayers.map((layer) => ({
        key: layer.key,
        parentKey: layer.parentKey,
      })),
      [
        { key: "toolkits", parentKey: "decide" },
      ],
    );
  });
});
