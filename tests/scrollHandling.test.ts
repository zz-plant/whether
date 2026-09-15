import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "bun:test";
import { centredScrollLeft, scrollBehaviorFor, scrollRowToItem } from "../app/components/scrollRowToItem";

/*
 * Two scroll defects measured in a browser on 2026-09-15, pinned here against source
 * because the suite has no DOM:
 *
 * - Anchors landed 227–264px down a phone screen. `scroll-padding-top` on html and
 *   `scroll-margin-top` on targets are additive, and the app declared both (80px on the
 *   root, 112px on every section, 72px on every heading). The rule now: one offset, on
 *   html, and nothing else adds a margin.
 * - The sticky chip rows kept their current chip in view with `scrollIntoView`, which
 *   scrolls every ancestor: it moved the page by 71px whenever the header overlapped
 *   the row. Rows scroll themselves now (scrollRowToItem.ts).
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

describe("one anchor offset", () => {
  it("declares scroll-padding-top on html once, in typography.css, at the sticky-stack height", async () => {
    const css = await readFile("app/styles/typography.css", "utf8");
    const declarations = css.match(/scroll-padding-top:[^;]+;/g) ?? [];
    assert.equal(declarations.length, 1);
    assert.match(declarations[0], /7rem/);
  });

  it("lets nothing under app/ add a scroll margin on top of it", async () => {
    const offenders: string[] = [];
    for (const file of await appFiles([".tsx", ".ts", ".css"])) {
      const source = await readFile(file, "utf8");
      // Declarations only: the stylesheet's own comment names the property to forbid it.
      if (/scroll-mt-|scroll-margin(?:-top)?\s*:|scrollMarginTop\s*[:=]/.test(source)) offenders.push(file);
    }
    assert.deepEqual(offenders, [], "scroll margins stack on the html padding; remove them");
  });
});

describe("sticky rows scroll themselves, never the page", () => {
  it("keeps scrollIntoView out of the chip rows and the year rail", async () => {
    for (const file of [
      "app/components/mobileSectionChips.tsx",
      "app/components/TimelineBar.tsx",
    ]) {
      const source = await readFile(file, "utf8");
      assert.doesNotMatch(source, /scrollIntoView/, `${file} scrolls the page to show a chip`);
      assert.match(source, /scrollRowToItem/, `${file} does not use the shared row scroll`);
    }
  });

  it("centres the item from rects and clamps at the row's start", () => {
    const row = {
      scrollLeft: 100,
      clientWidth: 300,
      getBoundingClientRect: () => ({ left: 20, width: 300 }),
    };
    // An item whose left edge sits 400px into the row's content: centre it.
    assert.equal(centredScrollLeft(row, { getBoundingClientRect: () => ({ left: 420, width: 80 }) }), 390);
    // An item near the start would need a negative scrollLeft: clamp to 0.
    assert.equal(centredScrollLeft(row, { getBoundingClientRect: () => ({ left: 20, width: 80 }) }), 0);
  });

  it("scrolls the row through scrollTo when it has one, and through scrollLeft otherwise", () => {
    const calls: Array<{ left: number; behavior: ScrollBehavior }> = [];
    const row = {
      scrollLeft: 0,
      clientWidth: 300,
      getBoundingClientRect: () => ({ left: 0, width: 300 }),
      scrollTo: (options: { left: number; behavior: ScrollBehavior }) => calls.push(options),
    };
    scrollRowToItem(row, { getBoundingClientRect: () => ({ left: 500, width: 100 }) });
    assert.deepEqual(calls, [{ left: 400, behavior: "auto" }]);

    const legacy = { scrollLeft: 0, clientWidth: 300, getBoundingClientRect: () => ({ left: 0, width: 300 }) };
    scrollRowToItem(legacy, { getBoundingClientRect: () => ({ left: 500, width: 100 }) });
    assert.equal(legacy.scrollLeft, 400);
  });

  it("turns a smooth request into a jump when the reader prefers reduced motion", () => {
    const hadWindow = Reflect.has(globalThis, "window");
    const previousWindow: unknown = Reflect.get(globalThis, "window");
    try {
      Reflect.set(globalThis, "window", { matchMedia: () => ({ matches: true }) });
      assert.equal(scrollBehaviorFor(true), "auto");
      Reflect.set(globalThis, "window", { matchMedia: () => ({ matches: false }) });
      assert.equal(scrollBehaviorFor(true), "smooth");
      assert.equal(scrollBehaviorFor(false), "auto", "an instant request stays instant either way");
    } finally {
      if (hadWindow) Reflect.set(globalThis, "window", previousWindow);
      else Reflect.deleteProperty(globalThis, "window");
    }
  });
});

describe("J and K", () => {
  it("focus without a scroll, then make one scroll to the section start that honours reduced motion", async () => {
    const source = await readFile("app/components/KeyboardShortcuts.tsx", "utf8");
    assert.match(source, /focus\(\{ preventScroll: true \}\)/);
    assert.match(source, /scrollIntoView\(\{ behavior: scrollBehaviorFor\(true\), block: "start" \}\)/);
    assert.doesNotMatch(source, /behavior: "smooth"/);
  });
});

describe("hash landing", () => {
  it("retries until the target has layout and stops on reader intent", async () => {
    const source = await readFile("app/components/anchorFeedback.tsx", "utf8");
    assert.match(source, /getBoundingClientRect\(\)\.height > 0/);
    assert.match(source, /"wheel", "touchstart", "pointerdown", "keydown"/);
    assert.match(source, /scrollIntoView\(\{ block: "start" \}\)/);
  });
});
