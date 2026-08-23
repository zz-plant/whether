import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { shouldRunChecks } from "../scripts/vinext-run.mjs";

describe("build check gate", () => {
  it("stays out of the way locally", () => {
    const gate = shouldRunChecks({});

    assert.equal(gate.run, false);
    assert.match(gate.reason, /not a Cloudflare build/);
  });

  it("runs on a preview build", () => {
    const gate = shouldRunChecks({ WORKERS_CI: "1", WORKERS_CI_BRANCH: "fix/some-branch" });

    assert.equal(gate.run, true);
    assert.match(gate.reason, /fix\/some-branch/);
  });

  // A production build that fails on a flaky test would block a deploy, and the flakiness
  // here is real — whetherCli tests fail under CPU contention. A pull request is the right
  // place to be strict, because being wrong there costs a rerun instead of an outage.
  it("never gates the production branch", () => {
    const gate = shouldRunChecks({ WORKERS_CI: "1", WORKERS_CI_BRANCH: "main" });

    assert.equal(gate.run, false);
    assert.match(gate.reason, /production branch/);
  });

  // Fails open on purpose: a missing environment variable should not be the reason a deploy
  // is blocked. The build log says so on every build, because a gate that quietly stops
  // running is worse than no gate.
  it("skips rather than guess when the branch is unknown", () => {
    const gate = shouldRunChecks({ WORKERS_CI: "1" });

    assert.equal(gate.run, false);
    assert.match(gate.reason, /branch unknown/);
  });

  it("recognises a Cloudflare build from the build uuid alone", () => {
    const gate = shouldRunChecks({ WORKERS_CI_BUILD_UUID: "abc", WORKERS_CI_BRANCH: "topic" });

    assert.equal(gate.run, true);
  });

  it("accepts the Pages branch variable as a fallback", () => {
    const gate = shouldRunChecks({ WORKERS_CI: "1", CF_PAGES_BRANCH: "topic" });

    assert.equal(gate.run, true);
  });
});
