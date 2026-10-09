import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "bun:test";

import { buildMonthlyFile, monthlyDrift, readPostsFile, serialise } from "../scripts/advice-corpus/siteData";

/*
 * data/advice-corpus/monthly.json is what /concepts draws, and it is generated from
 * data/advice-corpus/posts.json. This is the generator's `--check`, run in the suite, so
 * the committed series cannot drift from the committed labels.
 */

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("the advice corpus data", () => {
  it("monthly.json is exactly what posts.json generates (`bun run advice-corpus:check`)", () => {
    assert.equal(monthlyDrift(), null);
  });

  it("names the first differing line when the series has been edited by hand", () => {
    const root = mkdtempSync(join(tmpdir(), "advice-corpus-"));
    roots.push(root);
    const postsPath = join(root, "posts.json");
    const monthlyPath = join(root, "monthly.json");
    writeFileSync(postsPath, readFileSync("data/advice-corpus/posts.json", "utf8"));
    const generated = buildMonthlyFile(readPostsFile(postsPath));
    writeFileSync(monthlyPath, serialise({ ...generated, eligiblePosts: generated.eligiblePosts + 1 }));
    const drift = monthlyDrift(postsPath, monthlyPath);
    assert.ok(drift?.includes("eligiblePosts"), drift ?? "no drift reported");
  });

  it("commits derived metadata only: no post text, and no quote over fifteen words", () => {
    const posts = readPostsFile();
    for (const post of posts.posts) {
      assert.ok(!("text" in post), post.id);
      assert.ok(post.evidence.split(/\s+/).filter(Boolean).length <= 15, `${post.id}: ${post.evidence}`);
    }
    assert.equal(posts.labelModel, "qwen3-coder:30b-128k");
  });

  it("covers the registered window, one row per month and per quarter", () => {
    const monthly = buildMonthlyFile(readPostsFile());
    assert.equal(monthly.months[0].period, "2012-01");
    assert.equal(monthly.months.at(-1)?.period, "2026-09");
    assert.equal(monthly.months.length, 177);
    assert.equal(monthly.quarters.length, 59);
  });
});
