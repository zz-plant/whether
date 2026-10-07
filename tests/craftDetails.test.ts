import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "bun:test";

/*
 * Three details a font-level audit found on 2026-10-07 (ui-ux-standards §XXII–§XXIII),
 * pinned against source because they are class and stylesheet choices that no single
 * render covers. Each is a choice about what the shipped files can set, or what a
 * transition is allowed to move, rather than about one page's output.
 */

const walk = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => (entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)])),
  );
  return files.flat();
};

const appFiles = async (extensions: string[]) =>
  (await walk("app")).filter((file) => extensions.some((extension) => file.endsWith(extension)));

const offendersOf = async (extensions: string[], pattern: RegExp) => {
  const offenders: string[] = [];
  for (const file of await appFiles(extensions)) {
    if (pattern.test(await readFile(file, "utf8"))) offenders.push(file);
  }
  return offenders;
};

describe("type the shipped files can set", () => {
  /* Archivo and Chivo Mono ship upright only, so `italic` slants the roman. The chat
     preview's <em> is the one italic left: it shows how a chat client renders `_text_`. */
  it("sets no italic, which the faces do not draw", async () => {
    assert.deepEqual(await offendersOf([".tsx", ".ts"], /className=(?:"[^"]*|\{`[^`]*|\{"[^"]*)\bitalic\b/), []);
    assert.deepEqual(await offendersOf([".css"], /font-style:\s*italic/), []);
  });

  /* Neither face draws these, so each was set in whatever symbol font the reader's OS
     had. The icon set (app/components/uiIcons.tsx) draws them in one weight everywhere. */
  it("draws chrome marks with the icon set, not with symbols the faces lack", async () => {
    assert.deepEqual(await offendersOf([".tsx", ".ts", ".css"], /[▾▸↗✓✔✕✗]/), []);
  });
});

describe("transitions name what they move", () => {
  /* The page shell carried `transition-all`, so the padding change at the `sm`
     breakpoint animated while a window resized (§I: never animate layout). */
  it("never transitions every property", async () => {
    assert.deepEqual(await offendersOf([".tsx", ".ts"], /\btransition-all\b/), []);
    assert.deepEqual(await offendersOf([".css"], /transition(?:-property)?:\s*all\b/), []);
  });
});
