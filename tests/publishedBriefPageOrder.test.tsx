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

  it("prints the w31 correction in the header", async () => {
    const page = await import("../app/brief/[week]/page");
    const html = renderToStaticMarkup(await page.default({ params: Promise.resolve({ week: "2026-w31" }) }));
    const correction = html.indexOf("Correction:");
    assert.ok(correction !== -1 && correction < html.indexOf("What changed this week"));
  });
});
