import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import {
  readActiveFlag,
  SLACK_PREVIEW_CHANGED_EVENT,
} from "../app/components/useSlackPreviewOverlay";

describe("slack preview overlay payload", () => {
  it("accepts only a boolean active flag", () => {
    assert.equal(readActiveFlag({ active: true }), true);
    assert.equal(readActiveFlag({ active: false }), false);
  });

  it("rejects payloads that do not carry a boolean, rather than coercing them", () => {
    // The event is public on `window`, so anything can dispatch it. A coerced
    // value would silently flip the toggle to a state nobody selected.
    for (const detail of [
      null,
      undefined,
      "true",
      42,
      [],
      {},
      { active: "true" },
      { active: 1 },
      { active: null },
      { activeee: true },
    ]) {
      assert.equal(readActiveFlag(detail), null, `should reject ${JSON.stringify(detail) ?? String(detail)}`);
    }
  });

  it("names the event both share surfaces agree on", () => {
    assert.equal(SLACK_PREVIEW_CHANGED_EVENT, "whether-slack-preview-changed");
  });
});
