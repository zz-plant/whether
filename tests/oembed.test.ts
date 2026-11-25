import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { GET } from "../app/api/oembed/route";
import { buildOEmbed, buildOEmbedDiscoveryUrl } from "../lib/export/oembed";
import { buildHomeMetadata } from "../lib/report/homeMetadata";
import { metadata as shareMetadata } from "../app/share/page";
import { siteUrl } from "../lib/siteUrl";

/*
 * A pasted link to the live brief becomes the embed in an editor that reads oEmbed
 * (Notion, Coda and Slite through Iframely). A dated record does not: a live frame
 * under a week's address would print another week's guidance than the link names.
 */

const oembed = (query: Record<string, string>) =>
  GET(new Request(`${siteUrl}/api/oembed?${new URLSearchParams(query).toString()}`));

describe("GET /api/oembed", () => {
  it("answers a whether.work address with a rich response that frames the embed", async () => {
    const response = oembed({ url: `${siteUrl}/`, format: "json" });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^application\/json/);
    assert.equal(response.headers.get("access-control-allow-origin"), "*");

    const body = await response.json();
    assert.equal(body.type, "rich");
    assert.equal(body.version, "1.0");
    assert.equal(body.provider_name, "Whether");
    assert.equal(body.provider_url, `${siteUrl}/`);
    assert.equal(body.title, "Whether: this week's guidance");
    assert.equal(typeof body.cache_age, "number");
    assert.ok(Number.isInteger(body.width) && body.width > 0);
    assert.ok(Number.isInteger(body.height) && body.height > 0);
    assert.equal(body.html, `<iframe src="${siteUrl}/embed/call-strip" width="${body.width}" height="${body.height}" style="border:0;max-width:100%" loading="lazy" title="Whether: this week&#39;s guidance"></iframe>`);
  });

  it("treats a missing format as JSON, as the spec's default", async () => {
    assert.equal(oembed({ url: `${siteUrl}/share` }).status, 200);
  });

  it("embeds the embed's own address and carries a pinned theme into the frame", async () => {
    const body = await oembed({ url: `${siteUrl}/embed/call-strip?theme=dark`, format: "json" }).json();
    assert.match(body.html, /src="https:\/\/[^"]+\/embed\/call-strip\?theme=dark"/);
  });

  it("answers 404 for another site's address", async () => {
    const response = oembed({ url: "https://example.com/", format: "json" });
    assert.equal(response.status, 404);
    assert.equal(oembed({ url: `https://evil.${new URL(siteUrl).hostname}.example.com/`, format: "json" }).status, 404);
  });

  it("answers 400 without a usable url", () => {
    assert.equal(oembed({ format: "json" }).status, 400);
    assert.equal(oembed({ url: "not a url", format: "json" }).status, 400);
  });

  it("answers 501 for any format but JSON", () => {
    assert.equal(oembed({ url: `${siteUrl}/`, format: "xml" }).status, 501);
  });

  it("keeps the frame within both of the consumer's limits", async () => {
    const body = await oembed({ url: `${siteUrl}/`, maxwidth: "240", maxheight: "180" }).json();
    assert.equal(body.width, 240);
    assert.equal(body.height, 180);
    assert.match(body.html, /width="240" height="180"/);
  });
});

describe("buildOEmbed", () => {
  it("ignores a limit that is not a positive number", () => {
    const result = buildOEmbed(`${siteUrl}/`, { maxWidth: Number.NaN, maxHeight: 0 });
    assert.ok(result.ok);
    assert.equal(result.body.width, 640);
    assert.equal(result.body.height, 720);
  });

  for (const url of [`${siteUrl}/brief/2026-w40`, `${siteUrl}/?month=3&year=2020`, `${siteUrl}/answers/should-we-hire`]) {
    it(`declines ${url}, which is not the live week`, () => {
      const result = buildOEmbed(url);
      assert.ok(!result.ok);
      assert.equal(result.status, 404);
    });
  }
});

describe("oEmbed discovery", () => {
  it("is named in the homepage's head", async () => {
    const metadata = await buildHomeMetadata();
    assert.deepEqual(metadata.alternates?.types, { "application/json+oembed": buildOEmbedDiscoveryUrl("/") });
    assert.equal(buildOEmbedDiscoveryUrl("/"), `${siteUrl}/api/oembed?url=${encodeURIComponent(`${siteUrl}/`)}&format=json`);
  });

  it("is not offered on an archived reading, which the embed would replace", async () => {
    const metadata = await buildHomeMetadata(Promise.resolve({ month: "3", year: "2020" }));
    assert.equal(metadata.alternates?.types, undefined);
  });

  it("is named in /share's head, beside its own canonical", () => {
    assert.equal(shareMetadata.alternates?.canonical, "/share");
    assert.deepEqual(shareMetadata.alternates?.types, { "application/json+oembed": buildOEmbedDiscoveryUrl("/share") });
  });
});
