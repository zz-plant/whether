import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

import { walkFiles } from "../scripts/walk-files.mjs";

/*
 * The one walk the census checks, the test runner and the agent index share. Its
 * contract is the part each copy used to get differently: the suppression census
 * called `statSync` unguarded, so a dangling symlink — or a path removed between the
 * directory read and the stat — crashed the census instead of costing one entry.
 */
const roots: string[] = [];

const scaffold = (files: Record<string, string>) => {
  const root = mkdtempSync(join(tmpdir(), "walk-files-"));
  roots.push(root);
  for (const [path, source] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), source);
  }
  return root;
};

const listed = (root: string, options?: Parameters<typeof walkFiles>[1]) =>
  walkFiles(root, options)
    .map((path) => relative(root, path))
    .sort();

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("walkFiles", () => {
  it("lists every file under a directory, depth first", () => {
    const root = scaffold({ "a.ts": "", "nested/b.ts": "", "nested/deeper/c.md": "" });
    assert.deepEqual(listed(root), ["a.ts", "nested/b.ts", "nested/deeper/c.md"]);
  });

  it("skips a dangling symlink instead of throwing, which is the crash the census used to have", () => {
    const root = scaffold({ "kept.ts": "" });
    symlinkSync(join(root, "nowhere.ts"), join(root, "dangling.ts"));

    assert.deepEqual(listed(root), ["kept.ts"]);
  });

  it("answers nothing for a root it cannot read, rather than throwing", () => {
    assert.deepEqual(walkFiles(join(tmpdir(), "walk-files-does-not-exist")), []);
  });

  it("leaves out what the caller skips, and everything under a skipped directory", () => {
    const root = scaffold({ "src/a.ts": "", "node_modules/pkg/index.js": "", "src/.DS_Store": "" });

    assert.deepEqual(
      listed(root, { skip: (name, isDirectory) => (isDirectory && name === "node_modules") || name === ".DS_Store" }),
      ["src/a.ts"],
    );
  });

  it("follows a symlink by default and leaves it out when asked, as a Dirent walk does", () => {
    const root = scaffold({ "real/a.ts": "" });
    symlinkSync(join(root, "real"), join(root, "linked"));

    assert.deepEqual(listed(root), ["linked/a.ts", "real/a.ts"]);
    assert.deepEqual(listed(root, { followSymlinks: false }), ["real/a.ts"]);
  });
});
