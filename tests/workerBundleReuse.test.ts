import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "bun:test";
import { shouldReuseCurrentBundle } from "../scripts/cloudflare-run.mjs";
import { isWorkerBundleCurrent } from "../scripts/worker-bundle.mjs";

/*
 * One Workers Builds push used to pay two Vite builds: the landmark audit in the gate
 * (`check-main-content-landmarks.mjs`) builds the worker bundle to serve it, then the
 * deploy step (`deploy:cloudflare`) rebuilt it from scratch. `--skip-build-if-current`
 * makes the production deploy reuse the audit's bundle when it is current for this tree.
 * These pin the freshness check, the reuse decision, and the wiring.
 */

const LONG_AGO = new Date("2000-01-01T00:00:00Z");

describe("worker bundle freshness (isWorkerBundleCurrent)", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  const MARKER = [".cloudflare", "output", "v0", "config.json"];
  const writeMarker = (root: string, mode: string, isPreview = false) =>
    writeFileSync(join(root, ...MARKER), JSON.stringify({ buildContext: { isPreview, mode } }));

  /** A tree whose Build Output is a current production build: sources written first, the marker last. */
  const makeCurrentFixture = () => {
    const root = mkdtempSync(join(tmpdir(), "worker-bundle-"));
    roots.push(root);
    mkdirSync(join(root, ...MARKER.slice(0, -1)), { recursive: true });
    mkdirSync(join(root, "app"), { recursive: true });
    writeFileSync(join(root, "app", "page.tsx"), "export default function Page() {}\n");
    writeMarker(root, "production");
    return root;
  };

  it("is current when the marker records a production build and no bundled source is newer", () => {
    assert.equal(isWorkerBundleCurrent(makeCurrentFixture()), true);
  });

  it("is not current when a bundled source is newer than the marker", () => {
    const root = makeCurrentFixture();
    utimesSync(join(root, ...MARKER), LONG_AGO, LONG_AGO);
    assert.equal(isWorkerBundleCurrent(root), false);
  });

  it("is not current when the marker is missing, unreadable, or records another mode or a preview", () => {
    const missing = makeCurrentFixture();
    rmSync(join(missing, ...MARKER), { force: true });
    assert.equal(isWorkerBundleCurrent(missing), false);

    const unreadable = makeCurrentFixture();
    writeFileSync(join(unreadable, ...MARKER), "not json");
    assert.equal(isWorkerBundleCurrent(unreadable), false);

    const otherMode = makeCurrentFixture();
    writeMarker(otherMode, "development");
    assert.equal(isWorkerBundleCurrent(otherMode), false);

    // A Worker Preview build records the production mode too, and lands in the same directory
    // on every branch build: deploy:cloudflare must never reuse it.
    const preview = makeCurrentFixture();
    writeMarker(preview, "production", true);
    assert.equal(isWorkerBundleCurrent(preview), false);
  });
});

describe("deploy bundle reuse (shouldReuseCurrentBundle)", () => {
  it("reuses only on the production lane, when asked, and when the bundle is current", () => {
    assert.equal(shouldReuseCurrentBundle({ skipBuildIfCurrent: true, targetEnv: "", current: true }), true);
    assert.equal(
      shouldReuseCurrentBundle({ skipBuildIfCurrent: false, targetEnv: "", current: true }),
      false,
      "no flag, no reuse",
    );
    assert.equal(
      shouldReuseCurrentBundle({ skipBuildIfCurrent: true, targetEnv: "preview", current: true }),
      false,
      "a named environment builds its own configuration",
    );
    assert.equal(
      shouldReuseCurrentBundle({ skipBuildIfCurrent: true, targetEnv: "", current: false }),
      false,
      "a stale bundle never reuses",
    );
  });
});

describe("deploy reuse wiring", () => {
  const source = readFileSync(new URL("../scripts/cloudflare-run.mjs", import.meta.url), "utf8");
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

  it("asks the production deploy to reuse a current bundle", () => {
    assert.match(packageJson.scripts?.["deploy:cloudflare"] ?? "", /--skip-build-if-current/);
  });

  it("parses the flag and decides with the audit's own freshness check", () => {
    assert.match(source, /arg === "--skip-build-if-current"/);
    assert.match(source, /skipBuildIfCurrent: parsed\.skipBuildIfCurrent/);
    assert.match(source, /isWorkerBundleCurrent\(\)/);
    // The explicit --skip-build path stays the only other way past the build.
    assert.match(source, /\} else if \(!parsed\.skipBuild\) \{/);
  });
});