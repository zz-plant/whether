import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { resolveBranchFromGit, shouldRunChecks } from "../scripts/vinext-run.mjs";

describe("build check gate", () => {
  const noGitBranch = () => "";

  it("stays out of the way locally", () => {
    const gate = shouldRunChecks({}, noGitBranch);

    assert.equal(gate.run, false);
    assert.match(gate.reason, /not a remote build/);
  });

  it("runs on a preview build", () => {
    const gate = shouldRunChecks({ WORKERS_CI: "1", WORKERS_CI_BRANCH: "fix/some-branch" }, noGitBranch);

    assert.equal(gate.run, true);
    assert.match(gate.reason, /fix\/some-branch/);
  });

  // A production build that fails on a flaky test would block a deploy, and the flakiness
  // here is real — whetherCli tests fail under CPU contention. A pull request is the right
  // place to be strict, because being wrong there costs a rerun instead of an outage.
  it("never gates the production branch", () => {
    const gate = shouldRunChecks({ WORKERS_CI: "1", WORKERS_CI_BRANCH: "main" }, noGitBranch);

    assert.equal(gate.run, false);
    assert.match(gate.reason, /production branch/);
  });

  // Fails open on purpose: a missing environment variable should not be the reason a deploy
  // is blocked. The build log says so on every build, because a gate that quietly stops
  // running is worse than no gate.
  it("skips rather than guess when the branch is unknown", () => {
    const gate = shouldRunChecks({ WORKERS_CI: "1" }, noGitBranch);

    assert.equal(gate.run, false);
    assert.match(gate.reason, /branch unknown/);
  });

  it("recognises a Cloudflare build from the build uuid alone", () => {
    const gate = shouldRunChecks({ WORKERS_CI_BUILD_UUID: "abc", WORKERS_CI_BRANCH: "topic" }, noGitBranch);

    assert.equal(gate.run, true);
  });

  it("accepts the Pages branch variable as a fallback", () => {
    const gate = shouldRunChecks({ WORKERS_CI: "1", CF_PAGES_BRANCH: "topic" }, noGitBranch);

    assert.equal(gate.run, true);
  });

  // The reason the branch is read from more than one place: this gate was written against
  // WORKERS_CI_BRANCH without being able to confirm the build environment sets it, and a
  // gate that silently stops running is the failure mode to design against.
  it("falls back to git when no environment variable names the branch", () => {
    const gate = shouldRunChecks({ WORKERS_CI: "1" }, () => "fix/from-git");

    assert.equal(gate.run, true);
    assert.match(gate.reason, /fix\/from-git/);
  });

  it("still refuses to gate production when git is what named it", () => {
    const gate = shouldRunChecks({ WORKERS_CI: "1" }, () => "main");

    assert.equal(gate.run, false);
    assert.match(gate.reason, /production branch/);
  });

  it("treats a generic CI marker as a remote build", () => {
    const gate = shouldRunChecks({ CI: "true" }, () => "topic");

    assert.equal(gate.run, true);
  });
});

describe("resolveBranchFromGit", () => {
  it("answers with a branch name or an empty string, never \"HEAD\"", () => {
    const branch = resolveBranchFromGit();

    assert.equal(typeof branch, "string");
    assert.notEqual(branch, "HEAD", "a detached checkout must read as unknown, not as a branch");
  });
});
