import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import SharePage from "../app/share/page";
import { macroSeries } from "../lib/macroSnapshot";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { resetOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";
import { snapshotData } from "../lib/snapshot";

const originalFetch = globalThis.fetch;

beforeEach(async () => {
  globalThis.fetch = async () => {
    throw new Error("The current share artifact must not fetch around its OperatingSnapshot.");
  };
  const snapshot = buildOperatingSnapshot({
    treasury: snapshotData,
    macroSeries,
    now: new Date("2026-08-31T12:00:00.000Z"),
  });
  snapshot.weeklyCall = {
    ...snapshot.weeklyCall,
    currentCall: "Share the persisted call exactly.",
    actionNow: "Transmit the committed action.",
    pauseIf: "Pause if the snapshot cannot be read.",
    callChangesIf: "Re-open only from the next committed snapshot.",
  };
  await resetOperatingSnapshotStore().write(snapshot);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetOperatingSnapshotStore();
});

describe("/share current weekly artifact", () => {
  it("renders real weekly brief exports instead of placeholder marketing copy", async () => {
    const html = renderToStaticMarkup(await SharePage());

    assert.match(html, /Week of /);
    // The exports lead with the conditions label; "Posture" was the export header before the
    // 2026-09-22 copy pass renamed it, and is no longer a word the page prints.
    assert.match(html, /Conditions:/);
    assert.match(html, /Do now/);
    assert.match(html, /Pause if/);
    // The change condition under its own label, not the resume vocabulary.
    assert.match(html, /Conditions change if: Re-open only from the next committed snapshot\./);
    assert.match(html, /Resume when/);
    assert.match(html, /Meeting pack/);
    assert.match(html, /Share the persisted call exactly\./);
    assert.match(html, /Transmit the committed action\./);
    assert.match(html, /Pause if the snapshot cannot be read\./);
    assert.match(html, /Re-open only from the next committed snapshot\./);
    assert.doesNotMatch(html, /Macro signals.*operating posture/);
    assert.doesNotMatch(html, /Current regime and operating posture for the period/);
  });

  it("offers the board slide as a file beside the images, and the investor update beside the copy formats", async () => {
    const html = renderToStaticMarkup(await SharePage());

    assert.match(html, /href="\/api\/export\/board-slide\?format=pptx&amp;stage=seed"/);
    assert.match(html, /href="\/api\/export\/board-slide\?format=pdf&amp;stage=seed"/);
    assert.match(html, /Download PPTX/);
    assert.match(html, /Download PDF/);
    assert.match(html, /Investor update/);
    assert.match(html, /Copy investor update/);
    assert.match(html, /Portfolio note/);
    assert.match(html, /Copy portfolio note/);
  });
});
