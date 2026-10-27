import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "bun:test";
import { GET } from "../app/api/oembed/route";
import { buildOEmbed, buildOEmbedDiscoveryUrl } from "../lib/export/oembed";
import { buildHomeMetadata } from "../lib/report/homeMetadata";
import { siteUrl } from "../lib/siteUrl";

type HeaderEntry = { source: string; headers: Array<{ key: string; value: string }> };
type NextConfigModule = { default: { headers: () => Promise<HeaderEntry[]> } };
const require = createRequire(import.meta.url);
/* The pattern `nextConfigRedirects.test.ts` uses: next.config.js ships no types. */
const loadNextConfig = (): NextConfigModule => require("../next.config.js");

/*
 * A pasted link to the live brief becomes the live widget in an editor that
 * reads oEmbed. A dated record does not: a live widget under a week's address
 * would print another week's guidance than the link names.
 */

describe("oEmbed", () => {
  it("frames the whole-document embed for the live brief", () => {
    const body = buildOEmbed(`${siteUrl}/`);
    assert.ok(body);
    assert.equal(body.type, "rich");
    assert.match(body.html, /^<iframe src="https:\/\/[^"]+\/api\/embed\?format=page&amp;ref=oembed"/);
  });

  it("keeps a reader's stage and caps the width at what the consumer allows", () => {
    const body = buildOEmbed(`${siteUrl}/?stage=seed`, 320);
    assert.equal(body?.width, 320);
    assert.ok(body?.html.includes("stage=seed"));
  });

  for (const url of [`${siteUrl}/brief/2026-w40`, "https://example.com/", "not a url", null]) {
    it(`declines ${String(url)}`, () => {
      assert.equal(buildOEmbed(url), null);
    });
  }

  it("answers 404 for an address it does not embed and 501 for XML", async () => {
    assert.equal(GET(new Request(`${siteUrl}/api/oembed?url=${encodeURIComponent("https://example.com/")}`)).status, 404);
    assert.equal(GET(new Request(`${siteUrl}/api/oembed?url=${encodeURIComponent(`${siteUrl}/`)}&format=xml`)).status, 501);
    const ok = GET(new Request(`${siteUrl}/api/oembed?url=${encodeURIComponent(`${siteUrl}/`)}`));
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).provider_name, "Whether");
  });

  it("is discoverable from the homepage's head", async () => {
    const metadata = await buildHomeMetadata();
    assert.deepEqual(metadata.alternates?.types, { "application/json+oembed": buildOEmbedDiscoveryUrl("/") });
  });

  it("lifts the frame DENY for the embed alone", async () => {
    const rules = await loadNextConfig().default.headers();
    const embedRule = rules.find((rule) => rule.source === "/api/embed");
    assert.ok(embedRule, "the embed has its own header rule");
    assert.ok(rules.indexOf(embedRule) > rules.findIndex((rule) => rule.source === "/(.*)"), "after the site rule, so its singular headers win");
    assert.ok(embedRule.headers.some((header) => header.key === "Content-Security-Policy" && header.value === "frame-ancestors *"));
  });
});
