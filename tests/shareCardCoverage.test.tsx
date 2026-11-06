import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { ImageResponse } from "next/og";
import { renderOgElement } from "../app/api/og/renderOgElement";
import { collectPageShareCards } from "./fixtures/pageShareCards";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";
import { findSatoriLayoutViolations, ogFontFaces } from "./fixtures/ogCardLayout";

serveUnreachableUpstreams();

/*
 * What every sitemap page previews as when its link is shared.
 *
 * An audit on 2026-09-23 found 113 pages previewing the *live weekly card* —
 * the privacy policy, and all 82 archive periods, so a link to 2014 showed this
 * week's reading — and /pricing previewing nothing, because it set `openGraph`
 * by hand without `images` and Next replaces that object rather than merging
 * it. Both were the default doing the wrong thing silently. The live card is now
 * something a page asks for, and these two are the pages that do. (/share and
 * /api-docs set no `openGraph` at all, so they previewed as the homepage: its
 * title and its URL. Both go through `buildPageMetadata` now.)
 */
const LIVE_CARD_PAGES = new Set(["/", "/share"]);

describe("share card coverage", () => {
  it("gives every sitemap page a card of its own, and the live card only to the pages that ask", async () => {
    const cards = await collectPageShareCards();
    assert.ok(cards.length > 100, `read ${cards.length} pages; the sitemap has well over a hundred`);
    const problems: string[] = [];
    for (const card of cards) {
      if (card.unreadable) {
        if (!LIVE_CARD_PAGES.has(card.path)) problems.push(`${card.path}: metadata could not be read offline (${card.unreadable.slice(0, 80)})`);
        continue;
      }
      if (!card.imageUrl) {
        problems.push(`${card.path}: no og:image`);
        continue;
      }
      const template = card.imageUrl.searchParams.get("template");
      const isLiveCard = card.imageUrl.pathname === "/api/og" && (template === null || template === "report");
      if (isLiveCard && !LIVE_CARD_PAGES.has(card.path)) problems.push(`${card.path}: previews the live weekly card`);
    }
    assert.deepEqual(problems, [], `\n${problems.join("\n")}\n`);
  });

  it("renders every distinct card without a layout satori rejects mid-render", async () => {
    const cards = await collectPageShareCards();
    const queries = new Set<string>(["template=report", "template=compare"]);
    for (const card of cards) if (card.imageUrl) queries.add(card.imageUrl.searchParams.toString());
    const violations: string[] = [];
    for (const query of queries) {
      for (const found of findSatoriLayoutViolations(await renderOgElement(new URLSearchParams(query)))) {
        violations.push(`?${query.slice(0, 60)}: ${found}`);
      }
    }
    assert.deepEqual(violations, []);
  });

  /* One per template, with the real fonts: a glyph outside the subset aborts the
     render after the headers are sent, which reads as a 200 with an empty body. */
  it("renders one card of each template to a PNG", async () => {
    const cards = await collectPageShareCards();
    const byTemplate = new Map<string, string>([["report", "template=report"]]);
    for (const card of cards) {
      const template = card.imageUrl?.searchParams.get("template");
      if (card.imageUrl && template && !byTemplate.has(template)) byTemplate.set(template, card.imageUrl.searchParams.toString());
    }
    assert.ok(byTemplate.size >= 10, `only ${byTemplate.size} templates in use`);
    for (const [template, query] of byTemplate) {
      const image = new ImageResponse(await renderOgElement(new URLSearchParams(query)), { width: 1200, height: 630, fonts: ogFontFaces });
      const body = await image.arrayBuffer();
      assert.ok(body.byteLength > 1000, `${template}: ${body.byteLength} bytes`);
      assert.deepEqual([...new Uint8Array(body.slice(0, 4))], [0x89, 0x50, 0x4e, 0x47], `${template} is a PNG`);
    }
  });
});
