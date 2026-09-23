import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import { generateMetadata as scenarioMetadata } from "../app/signals/[cluster]/[decision-scenario]/page";
import { generateMetadata as briefMetadata } from "../app/brief/[week]/page";
import { signalScenarioRoutes } from "../app/seoRouteClusters";
import { getPublishedBriefs } from "../lib/report/publishedBriefs";

/*
 * A search result shows about 160 characters of a description. The templated
 * ones are the ones that drift: every scenario page on the curve watch ran to
 * 186–191, and both published weeks to 190–204, so the snippet was cut exactly
 * where it said what changed.
 */
const LIMIT = 160;

describe("search snippets", () => {
  it("fit every signal-scenario description", async () => {
    const seen = new Set<string>();
    for (const route of signalScenarioRoutes) {
      const metadata = await scenarioMetadata({
        params: Promise.resolve({ cluster: route.signalSlug, "decision-scenario": route.decisionScenario }),
      });
      const description = String(metadata.description ?? "");
      assert.ok(description.length > 0 && description.length <= LIMIT, `${route.signalSlug}/${route.decisionScenario}: ${description.length}`);
      seen.add(description);
    }
    assert.equal(seen.size, signalScenarioRoutes.length, "each scenario page describes itself differently");
  });

  it("fit every published week's description", async () => {
    for (const brief of getPublishedBriefs()) {
      const metadata = await briefMetadata({ params: Promise.resolve({ week: brief.slug }) });
      const description = String(metadata.description ?? "");
      assert.ok(description.length > 0 && description.length <= LIMIT, `${brief.slug}: ${description.length}`);
    }
  });
});
