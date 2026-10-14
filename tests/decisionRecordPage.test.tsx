import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import DecisionsPage, { metadata } from "../app/decisions/page";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

/**
 * The page renders here because it reads through a loader that degrades: with
 * no upstreams the suite can reach, `loadWeeklyBriefSnapshot` falls back to the
 * bundled snapshot and the page still returns markup. A page behind the raw
 * report read path would suspend at its data boundary and this file could only
 * read its source.
 *
 * The ledger itself is not rendered here and cannot be: it is owned by a
 * browser identifier in local storage, so the server render is the shell plus a
 * client panel. What is worth pinning is everything that is *not* the ledger —
 * the indexing decision, the reader-facing vocabulary, and that the exports are
 * controls rather than links, which is the mistake this page nearly shipped.
 */

const render = async () => renderToStaticMarkup(await DecisionsPage());

describe("decision record page", () => {
  it("renders against the bundled snapshot with no upstreams", async () => {
    const html = await render();
    assert.match(html, /Your decision record/);
    assert.match(html, /Recorded from this browser/);
  });

  /*
   * There is exactly one reader for whom this page has content, and a crawler
   * is not it: to anyone else it is its own empty state, which is the thin
   * content the quality gate refuses everywhere else. `follow` stays on,
   * because every link it carries goes somewhere worth crawling.
   */
  it("asks not to be indexed, and is in no sitemap", async () => {
    assert.deepEqual(metadata.robots, { index: false, follow: true });
    const sitemap = await readFile("app/sitemap.ts", "utf8");
    assert.ok(!sitemap.includes('"/decisions"'), "a per-browser page has nothing to submit");
  });

  /*
   * `/api/decision-memory` authorises every read on a header, so an <a href> to
   * it hands the reader a 401 for their own record. This page had those links
   * for one draft; the assertion is that it does not get them back.
   */
  it("offers its exports as controls, never as links a header cannot reach", async () => {
    const source = await readFile("app/decisions/page.tsx", "utf8");
    assert.doesNotMatch(source, /href=["'][^"']*\/api\/decision-memory/, "a plain link to an owned endpoint is a 401");

    const html = await render();
    assert.match(html, /Download as CSV/);
    assert.match(html, /Download JSON \(one line per decision\)/);
  });

  // The same rule the answer pages are held to: the engine's names stay in the engine.
  it("carries no engine vocabulary into what a reader sees", async () => {
    const html = await render();
    assert.doesNotMatch(html, /tightness|riskAppetite|noindex|clientId/i);
  });

  it("is reachable without already knowing the URL", async () => {
    const layout = await readFile("app/layout.tsx", "utf8");
    assert.match(layout, /href="\/decisions"/, "the footer is the only standing way in");

    const palette = await readFile("app/components/commandPalette.tsx", "utf8");
    assert.match(palette, /\/decisions/, "and the palette is the way a returning reader finds it");
  });
});
