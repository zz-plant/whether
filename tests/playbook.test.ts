/**
 * Playbook selector unit tests for regime mapping.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPlaybookForRegime } from "../lib/playbook";

describe("playbook selector", () => {
  it("returns playbook for known regime", () => {
    const playbook = getPlaybookForRegime("SCARCITY");
    assert.ok(playbook);
    assert.equal(playbook?.key, "SCARCITY");
  });
});
