/**
 * Playbook selector unit tests for regime mapping.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getPlaybookForRegime,
  getRoleScopedTemplate,
  stakeholderRoles,
} from "../lib/playbook";

const regimes = ["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"] as const;

describe("playbook selector", () => {
  it("returns playbook for known regime", () => {
    const playbook = getPlaybookForRegime("SCARCITY");
    assert.ok(playbook);
    assert.equal(playbook?.key, "SCARCITY");
  });

  it("provides bounded role templates for every role across posture classes", () => {
    for (const regime of regimes) {
      for (const role of stakeholderRoles) {
        const template = getRoleScopedTemplate(regime, role);
        assert.ok(template.doNow.length > 20);
        assert.match(template.avoidNow, /avoid/i);
        assert.match(template.reversalTrigger, /when|if|once|after|falls|rises|holds|return/i);
      }
    }
  });
});
