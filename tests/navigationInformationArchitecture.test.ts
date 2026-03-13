import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { navigationGroupLabels, navigationLayers, navigationLabelByPath } from "../lib/navigation/informationArchitecture";
import { primaryNavigation } from "../lib/navigation/primaryNavigation";

describe("navigation information architecture", () => {
  it("keeps primary navigation aligned to architecture layers", () => {
    assert.equal(primaryNavigation.length, navigationLayers.length);

    for (const layer of navigationLayers) {
      const link = primaryNavigation.find((item) => item.href === layer.href);
      assert.ok(link);
      assert.equal(link?.label, layer.label);
      assert.equal(link?.description, layer.description);
    }
  });

  it("defines passive group labels from IA as single source of truth", () => {
    assert.equal(navigationGroupLabels.core, "Now");
    assert.equal(navigationGroupLabels.workflow, "Operate");
    assert.equal(navigationGroupLabels.reference, "Reference");

    for (const layer of navigationLayers) {
      assert.ok(navigationGroupLabels[layer.group]);
    }
  });

  it("keeps one layer for each IA boundary and route", () => {
    const hrefs = new Set(navigationLayers.map((layer) => layer.href));
    const labels = new Set(navigationLayers.map((layer) => layer.label));

    assert.equal(hrefs.size, navigationLayers.length);
    assert.equal(labels.size, navigationLayers.length);

    assert.equal(navigationLabelByPath["/"], "Start");
    assert.equal(navigationLabelByPath["/signals"], "Signals");
    assert.equal(navigationLabelByPath["/operations"], "Operations");
    assert.equal(navigationLabelByPath["/decide"], "Decide");
    assert.equal(navigationLabelByPath["/toolkits"], "Toolkits");
    assert.equal(navigationLabelByPath["/learn"], "Learn");
    assert.equal(navigationLabelByPath["/method"], "Method");
  });

  it("keeps canonical route transitions for Decide and Method", () => {
    const decideLayer = navigationLayers.find((layer) => layer.key === "decide");
    const methodLayer = navigationLayers.find((layer) => layer.key === "method");

    assert.equal(decideLayer?.href, "/decide");
    assert.equal(methodLayer?.href, "/method");
    assert.equal(decideLayer?.href.startsWith("#"), false);
    assert.equal(methodLayer?.href.startsWith("#"), false);
  });
});
