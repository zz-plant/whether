import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, it } from "bun:test";
import { TELEMETRY_STREAMS } from "../lib/telemetry/analyticsEngine";

/*
 * A declared stream with no producer is an open write with no reader to notice.
 *
 * `regime-transition` and `degraded-state` sat in the union and in the public
 * intake's accepted set, and nothing in `lib/`, `app/` or `worker/` had ever
 * written either one. The only way a row reached them was a POST from outside,
 * and no reader would have looked. Nothing in the gate noticed, because an
 * unwritten stream is not a type error, not a lint finding, and not a failing
 * test — it is the same shape of dead weight `check:dead-exports` measures for
 * exports, one level up.
 */
const REPO_ROOT = new URL("..", import.meta.url).pathname;
const SOURCE_ROOTS = ["app", "lib", "worker"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);

const sourceFiles = (directory: string, into: string[] = []): string[] => {
  let entries: string[];
  try {
    entries = readdirSync(directory);
  } catch {
    return into;
  }
  for (const entry of entries) {
    if (entry === "node_modules") continue;
    const path = join(directory, entry);
    let isDirectory: boolean;
    try {
      isDirectory = statSync(path).isDirectory();
    } catch {
      continue;
    }
    if (isDirectory) sourceFiles(path, into);
    else if (SOURCE_EXTENSIONS.has(extname(entry))) into.push(path);
  }
  return into;
};

describe("telemetry stream reachability", () => {
  /* Imported, not parsed out of the source: the union derives from this array,
     so the test measures the same list the writer does. */
  const streams: readonly string[] = TELEMETRY_STREAMS;
  const files = SOURCE_ROOTS.flatMap((root) => sourceFiles(join(REPO_ROOT, root)));
  const corpus = files.map((path) => readFileSync(path, "utf8")).join("\n");

  it("finds the streams to check", () => {
    assert.ok(streams.length >= 5, `parsed ${streams.length} stream(s) from the union`);
    assert.ok(files.length > 100, `scanned ${files.length} source file(s)`);
  });

  /*
   * A producer is either a `writeAnalytics("<stream>", …)` in server code or an
   * emitter posting to `/api/telemetry/<stream>`. Both are cheap to find and
   * either one means a row can arrive without an outsider sending it.
   */
  it("has a producer for every declared stream", () => {
    const orphans = streams.filter(
      (stream) =>
        !corpus.includes(`writeAnalytics(\n      "${stream}"`) &&
        !corpus.includes(`writeAnalytics("${stream}"`) &&
        !corpus.includes(`/api/telemetry/${stream}`),
    );

    assert.deepEqual(
      orphans,
      [],
      `declared but never written: ${orphans.join(", ")}. Write it, or drop it from TelemetryStream.`,
    );
  });

  /*
   * The intake's accepted set is `STREAM_VALIDATORS`' keys, so a stream with no
   * validator cannot be posted. This pins the reason rather than the mechanism:
   * five of the ten names it used to accept reached `writeAnalytics` unexamined,
   * two of them Worker-authored, and one of those two is rendered on /trust.
   */
  it("accepts nothing at the public intake that it does not validate", () => {
    const route = readFileSync(join(REPO_ROOT, "app/api/telemetry/[stream]/route.ts"), "utf8");

    assert.match(route, /const STREAM_VALIDATORS = \{/);
    assert.match(route, /Object\.hasOwn\(STREAM_VALIDATORS, value\)/);
    assert.match(route, /STREAM_VALIDATORS\[stream\]\(payload\)/);
    assert.doesNotMatch(route, /"cron-step"|"ingest-pipeline"/, "worker-authored streams are not postable");
  });
});
