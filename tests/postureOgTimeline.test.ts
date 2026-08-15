import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import postureArchive from "../data/posture_archive_index.json";
import postureTimeline from "../data/posture_og_timeline.json";

describe("posture OG timeline", () => {
  it("keeps the compact chart artifact aligned with quarterly archive records", () => {
    const quarters = postureArchive
      .filter((period) => period.kind === "quarter")
      .sort((left, right) => left.asOf.localeCompare(right.asOf));

    assert.equal(postureTimeline.length, quarters.length);
    postureTimeline.forEach((point, index) => {
      const period = quarters[index];
      assert.equal(point.label, period.title);
      assert.equal(point.regime, period.regime);
      assert.equal(point.intensity, Math.max(0.35, (period.regimeMix[0]?.share ?? 50) / 100));
    });
  });
});
