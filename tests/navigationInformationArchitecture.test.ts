import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { navigationLayers, navigationLabelByPath } from "../lib/navigation/informationArchitecture";
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

  it("keeps one layer for each IA boundary and route", () => {
    const hrefs = new Set(navigationLayers.map((layer) => layer.href));
    const labels = new Set(navigationLayers.map((layer) => layer.label));

    assert.equal(hrefs.size, navigationLayers.length);
    assert.equal(labels.size, navigationLayers.length);

    assert.equal(navigationLabelByPath["/"], "Weekly Brief");
    assert.equal(navigationLabelByPath["/start"], "Command Center");
    assert.equal(navigationLabelByPath["/method"], "Method");
  });
});
