import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildBriefingPackPdfBytes,
  normalizeBriefingPackPdfText,
} from "../app/components/downloadBriefingPackButton";

describe("DownloadBriefingPackButton PDF helpers", () => {
  it("normalizes share-ready brief copy into PDF-safe text", () => {
    const normalized = normalizeBriefingPackPdfText("Action → hold • reverse if confidence ≥ HIGH — don't wait…");

    assert.equal(normalized, "Action -> hold - reverse if confidence >= HIGH - don't wait...");
  });

  it("builds a non-empty PDF from the current briefing-pack character set", async () => {
    const bytes = await buildBriefingPackPdfBytes([
      "WEEKLY BRIEF",
      "Action → hold the current operating posture.",
      "Trigger: confidence ≥ HIGH and source coverage improves.",
      "Reverse: reopen if the stop line clears — otherwise keep the board note tight.",
    ].join("\n"));

    assert.equal(bytes[0], 37);
    assert.equal(bytes[1], 80);
    assert.ok(bytes.length > 500);
  });
});
