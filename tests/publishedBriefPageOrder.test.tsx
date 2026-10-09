import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

/*
 * Every shared paste links to /brief/<week>, so most arrivals are cold. The
 * copy panel used to sit directly under the header, and a monospace Slack
 * preview filled the first desktop screen with "What changed" on the fold
 * (2026-09-30 attention pass). The call's delta and what would change it lead
 * now; the share tool follows, with its preview folded to a few lines.
 */
describe("/brief/[week] leads with the delta, then the share tool", () => {
  it("orders what changed and what would change it ahead of the copy panel", async () => {
    const page = await import("../app/brief/[week]/page");
    const html = renderToStaticMarkup(await page.default({ params: Promise.resolve({ week: "2026-w31" }) }));

    const changed = html.indexOf("What changed this week");
    const share = html.indexOf("share-brief-title");
    const areas = html.indexOf("Guidance by area");
    assert.ok(changed !== -1 && share !== -1 && areas !== -1);
    assert.ok(changed < share, "the delta is read before the copy panel");
    assert.ok(share < areas, "the share tool still precedes the long per-area table");
    assert.match(html, /Show the whole preview/, "the preview opens folded");
  });

  /* The record used to be a panel of tags with the call as body text, so a
     screenshot of a cited week matched nothing the reader saw on Monday. */
  it("draws the record in the live brief's card, once", async () => {
    const page = await import("../app/brief/[week]/page");
    const html = renderToStaticMarkup(await page.default({ params: Promise.resolve({ week: "2026-w31" }) }));
    const card = html.slice(html.indexOf('id="share-ready-artifact"'), html.indexOf("What changed this week"));

    assert.match(card, /type-stamp/, "the regime word is the card's stamp");
    /* w31 stored an avoid-list item where the pause line goes; the card leaves the slot out rather than print it as a trigger. */
    assert.doesNotMatch(card, /Over-engineering/);
    assert.match(card, /Conditions change if/);
    assert.match(card, /Funding pressure rises from 52 to clear 70/);
    /* Once, in the card's heading: the caption at its foot carried the week as well
       until 2026-10-09, and the heading's "Freezing:" restated the stamp above it. */
    assert.match(card, /<h1[^>]*>Guidance for the week of [A-Z][a-z]{2} \d{1,2}, \d{4}<\/h1>/, "a crop of the card carries its week");
    assert.equal((card.match(/[Ww]eek of /g) ?? []).length, 1, "and carries it once");
    assert.equal(html.match(/<h1[\s>]/g)?.length, 1, "the week's title is the page's one h1");
    assert.equal(html.match(/>Conditions change if<\/dt>/g)?.length, 1, "the call-change line is labelled once outside the paste preview");
  });

  /* w40 printed "+27.0 vs prior week": the stored move was against Aug 31, five
     weeks back, and the week before had read 85, not 63. */
  it("names the reading each move is against, in whole points", async () => {
    const page = await import("../app/brief/[week]/page");
    const html = renderToStaticMarkup(await page.default({ params: Promise.resolve({ week: "2026-w40" }) }));
    const readings = html.slice(html.indexOf("The numbers behind the guidance"));
    assert.match(readings, />\+5 vs Sep 22</);
    assert.doesNotMatch(html, /vs prior week|\+27\.0|last week 63/);
  });

  it("prints the w31 correction inside the card", async () => {
    const page = await import("../app/brief/[week]/page");
    const html = renderToStaticMarkup(await page.default({ params: Promise.resolve({ week: "2026-w31" }) }));
    const card = html.slice(html.indexOf('id="share-ready-artifact"'), html.indexOf("What changed this week"));
    const correction = card.indexOf("Correction:");
    assert.ok(correction !== -1, "a crop of the card carries the correction");
    assert.equal(html.match(/>Correction:/g)?.length, 1, "the page prints the correction once; the paste text carries its own");
  });
});
