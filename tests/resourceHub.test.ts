import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import sitemap from "../app/sitemap";
import { buildResourceHubEntries } from "../lib/resourceHub";
import { siteUrl } from "../lib/siteUrl";

describe("resources hub", () => {
  /*
   * The finding this closes: six indexable /resources URLs were in the
   * sitemap while /resources itself redirected away, so three of them had no
   * inbound link at all. Every /resources URL the sitemap emits must be one
   * the hub links.
   */
  it("links every /resources URL the sitemap submits", async () => {
    const entries = await sitemap({ programmaticEligible: true });
    const submitted = entries
      .map((entry) => entry.url.replace(siteUrl, ""))
      .filter((path) => path.startsWith("/resources/"));
    assert.ok(submitted.length >= 6, `${submitted.length} resource URLs submitted`);

    const linked = new Set(buildResourceHubEntries().map((entry) => entry.href));
    for (const path of submitted) {
      assert.ok(linked.has(path as `/resources/${string}`), `${path} is submitted but the hub does not link it`);
    }
  });

  it("carries a title and description for each entry", () => {
    for (const entry of buildResourceHubEntries()) {
      assert.ok(entry.title.length > 0);
      assert.ok(entry.description.length > 0);
    }
  });
});
