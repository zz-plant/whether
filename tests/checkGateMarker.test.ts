import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { headCommit, passedChecks, recordPassedChecks } from "../scripts/check-gate-marker.mjs";

/**
 * The record that stops the build gate running twice.
 *
 * Workers Builds runs `check:vinext`, then runs the deploy command, which reaches
 * `vinext-run build` — and that second arrival used to re-run the same five checks
 * against the same tree. About a minute of repeated work on every pull-request push,
 * for no signal, because a check that has just passed cannot fail.
 *
 * Skipped by evidence rather than deleted: the build command lives in the Cloudflare
 * dashboard, so nothing here can prove it still names `check:vinext`, and this repo
 * has already paid to learn that "a gate that quietly stops running is worse than no
 * gate at all". Every failure path below therefore answers "nothing passed", so a
 * marker that is missing, malformed, stale, or for another commit costs a repeated
 * run rather than a skipped gate.
 */
const MARKER_DIRECTORY = join(".cache", "check-gate");
// Deliberately not HEAD: writing a marker for the real commit would tell a later
// `vinext-run build` in this very checkout that checks it never ran had passed.
const FAKE_COMMIT = "0123456789abcdef0123456789abcdef01234567";
const OTHER_COMMIT = "fedcba9876543210fedcba9876543210fedcba98";

const markerFile = (commit: string) => join(MARKER_DIRECTORY, `${commit}.json`);

const writeMarker = (commit: string, record: unknown) => {
  mkdirSync(MARKER_DIRECTORY, { recursive: true });
  writeFileSync(markerFile(commit), JSON.stringify(record));
};

afterEach(() => {
  for (const commit of [FAKE_COMMIT, OTHER_COMMIT]) rmSync(markerFile(commit), { force: true });
});

describe("check gate marker", () => {
  it("reports nothing for a commit it has never seen", () => {
    assert.deepEqual(passedChecks(FAKE_COMMIT), []);
  });

  it("reports back what passed", () => {
    assert.equal(recordPassedChecks(["lint", "typecheck"], FAKE_COMMIT), true);
    assert.deepEqual(passedChecks(FAKE_COMMIT), ["lint", "typecheck"]);
  });

  // `check:vinext` is two runs: the four cheap checks, then the landmark audit alone.
  // The second must add to the first rather than erase it.
  it("unions successive runs instead of overwriting", () => {
    recordPassedChecks(["lint", "typecheck", "test", "assets"], FAKE_COMMIT);
    recordPassedChecks(["landmarks"], FAKE_COMMIT);

    assert.deepEqual(passedChecks(FAKE_COMMIT), ["assets", "landmarks", "lint", "test", "typecheck"]);
  });

  it("never vouches for a different commit", () => {
    recordPassedChecks(["lint", "typecheck", "test", "assets", "landmarks"], FAKE_COMMIT);

    assert.deepEqual(passedChecks(OTHER_COMMIT), []);
  });

  // A record whose filename is the commit but whose contents name another one is not
  // a record of this commit, however it came to be on disk.
  it("refuses a record that names a commit other than its own file", () => {
    writeMarker(FAKE_COMMIT, { commit: OTHER_COMMIT, tasks: ["lint"], recordedAt: new Date().toISOString() });

    assert.deepEqual(passedChecks(FAKE_COMMIT), []);
  });

  /*
   * A container can outlive a build. An old record must not vouch for a run nobody
   * made, so anything past the window reads as unproved — as does a record stamped in
   * the future, which is a clock nobody should trust either way.
   */
  it("expires, so a resurrected container cannot vouch for a build it did not run", () => {
    const now = Date.now();
    recordPassedChecks(["lint"], FAKE_COMMIT);

    assert.deepEqual(passedChecks(FAKE_COMMIT, now + 5 * 60 * 60 * 1000), ["lint"]);
    assert.deepEqual(passedChecks(FAKE_COMMIT, now + 7 * 60 * 60 * 1000), []);
    assert.deepEqual(passedChecks(FAKE_COMMIT, now - 60 * 60 * 1000), []);
  });

  it("treats an unreadable or malformed record as nothing proved", () => {
    writeMarker(FAKE_COMMIT, "not an object");
    assert.deepEqual(passedChecks(FAKE_COMMIT), []);

    writeMarker(FAKE_COMMIT, { commit: FAKE_COMMIT, tasks: "lint", recordedAt: new Date().toISOString() });
    assert.deepEqual(passedChecks(FAKE_COMMIT), []);

    writeMarker(FAKE_COMMIT, { commit: FAKE_COMMIT, tasks: ["lint"], recordedAt: "not a date" });
    assert.deepEqual(passedChecks(FAKE_COMMIT), []);
  });

  it("declines to record anything when git cannot name the commit", () => {
    assert.equal(recordPassedChecks(["lint"], ""), false);
    assert.deepEqual(passedChecks(""), []);
  });

  it("declines to record an empty list, which would prove nothing", () => {
    assert.equal(recordPassedChecks([], FAKE_COMMIT), false);
  });

  it("names the checked-out commit, or nothing it cannot verify", () => {
    const commit = headCommit();
    assert.ok(commit === "" || /^[0-9a-f]{40}$/.test(commit), `unexpected commit: ${commit}`);
  });

  /*
   * The marker's claim is "these checks passed for this commit", and a dirty tree makes
   * that false: the commit no longer describes what was checked. Answering "" there
   * disables the marker in both directions, so the build runs the checks itself rather
   * than trusting a record of code nobody ran them against.
   */
  it("names no commit while the tree holds changes that commit does not", () => {
    const repository = mkdtempSync(join(tmpdir(), "check-gate-marker-"));
    const git = (...args: string[]) => spawnSync("git", args, { cwd: repository, encoding: "utf8" });

    try {
      git("init", "--quiet");
      git("config", "user.email", "test@example.com");
      git("config", "user.name", "test");
      writeFileSync(join(repository, "tracked.txt"), "committed\n");
      git("add", "tracked.txt");
      git("commit", "--quiet", "-m", "initial");

      assert.match(headCommit(repository), /^[0-9a-f]{40}$/, "a clean checkout has a commit to name");

      writeFileSync(join(repository, "tracked.txt"), "modified\n");
      assert.equal(headCommit(repository), "", "a modified tracked file is not the commit");

      git("checkout", "--quiet", "--", "tracked.txt");
      writeFileSync(join(repository, "untracked.txt"), "new\n");
      assert.equal(headCommit(repository), "", "an untracked file is not the commit either");
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });
});
