import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "bun:test";
import { matchHeaders, requestContextFromRequest } from "vinext/config/config-matchers";
import { GET } from "../app/embed/call-strip/route";
import {
  buildCallStripEmbedModel,
  renderCallStripEmbedDocument,
  renderCallStripEmbedUnavailable,
} from "../lib/export/callStripEmbed";
import { OG_CONDITION_INK, OG_CONDITION_INK_LIGHT } from "../lib/image/ogTheme";
import { assembleHomePage } from "../lib/report/homePageAssembler";
import { siteUrl } from "../lib/siteUrl";
import { buildReportDataFixture } from "./fixtures/reportFixtures";

type HeaderEntry = { source: string; headers: Array<{ key: string; value: string }> };
type NextConfigModule = { default: { headers: () => Promise<HeaderEntry[]> } };
const require = createRequire(import.meta.url);
/* The pattern `nextConfigRedirects.test.ts` uses: next.config.js ships no types. */
const loadNextConfig = (): NextConfigModule => require("../next.config.js");

/*
 * `/embed/call-strip` is the brief inside somebody else's doc: a Notion or Coda embed
 * block frames it, so it carries none of the site's chrome, can be framed when no other
 * route can, is never indexed, and draws in either theme.
 */

const assemble = (reportData = buildReportDataFixture()) =>
  assembleHomePage({ searchParams: undefined }, { loadHomePageReportData: async () => ({ ok: true, data: reportData }) });

const renderEmbed = async (theme: "light" | "dark" | "auto", reportData = buildReportDataFixture()) =>
  renderCallStripEmbedDocument(buildCallStripEmbedModel(await assemble(reportData)), { theme });

const count = (html: string, pattern: RegExp) => (html.match(pattern) ?? []).length;
const textOf = (html: string) =>
  html
    .replace(/<style>[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&")
    .replace(/\s+/g, " ");

describe("/embed/call-strip renders the week for a frame", () => {
  for (const theme of ["light", "dark"] as const) {
    it(`renders a whole document in the ${theme} theme, pinned by ?theme=`, async () => {
      const html = await renderEmbed(theme);
      assert.match(html, /^<!doctype html>/);
      assert.match(html, new RegExp(`<html lang="en" data-theme="${theme}" data-regime="DEFENSIVE">`));
      assert.match(html, new RegExp(`<meta name="color-scheme" content="${theme}">`));
      /* The regime word takes the theme's condition ink (tokens.css, mirrored in ogTheme). */
      const ink = theme === "dark" ? OG_CONDITION_INK.DEFENSIVE : OG_CONDITION_INK_LIGHT.DEFENSIVE;
      assert.ok(html.includes(`:root[data-regime="DEFENSIVE"]{`) && html.includes(`--regime-ink-${theme}:${ink}`));
      const themeBlock = theme === "dark" ? /:root\[data-theme="dark"\]\{([^}]*)\}/ : /:root\{(color-scheme:light;[^}]*)\}/;
      const block = themeBlock.exec(html)?.[1] ?? "";
      assert.match(block, new RegExp(`color-scheme:${theme};`));
      assert.match(block, new RegExp(`--regime-ink:var\\(--regime-ink-${theme}\\)`));
    });
  }

  it("follows the device setting when no theme is pinned, with light as the base", async () => {
    const html = await renderEmbed("auto");
    assert.match(html, /<html lang="en" data-regime="DEFENSIVE">/);
    assert.match(html, /<meta name="color-scheme" content="light dark">/);
    assert.match(html, /:root\{color-scheme:light;/);
    assert.match(html, /@media \(prefers-color-scheme:dark\)\{:root:not\(\[data-theme="light"\]\)\{color-scheme:dark;/);
  });

  it("has exactly one main landmark and none of the site's chrome", async () => {
    const html = await renderEmbed("auto");
    assert.equal(count(html, /<main\b/g), 1);
    assert.equal(count(html, /<main id="main-content">/g), 1);
    assert.equal(count(html, /<h1\b/g), 1);
    for (const chrome of [/<header\b/, /<nav\b/, /<footer\b/, /skip-link/, /<script\b/]) {
      assert.doesNotMatch(html, chrome);
    }
  });

  it("is noindex, and every link leaves the frame", async () => {
    const html = await renderEmbed("auto");
    assert.match(html, /<meta name="robots" content="noindex">/);
    assert.match(html, /<base target="_blank">/);
    const links = [...html.matchAll(/<a\b[^>]*>/g)].map(([tag]) => tag);
    assert.ok(links.length > 0);
    for (const tag of links) {
      assert.match(tag, /target="_blank"/);
      assert.match(tag, /rel="noopener"/);
    }
  });

  it("prints the conditions, the guidance, each area with one line, what changes conditions, and the date", async () => {
    const homepage = await assemble();
    const model = buildCallStripEmbedModel(homepage);
    const text = textOf(renderCallStripEmbedDocument(model, { theme: "auto" }));

    assert.match(text, /Conditions Cloudy/);
    assert.ok(text.includes(model.guidance), "the guidance the homepage leads with");
    assert.ok(model.areas.length >= 4, "every operating area");
    for (const area of model.areas) {
      assert.ok(text.includes(`${area.label} ${area.action}`), `${area.label} carries its action`);
      assert.match(area.line.label, /^(Pause if|Restart when)$/);
      assert.ok(text.includes(`${area.line.label}: ${area.line.value}`), `${area.label} carries one line`);
    }
    assert.ok(text.includes(`Conditions change if: ${homepage.weeklyCall.callChangesIf}`));
    for (const move of model.marketMoves) assert.ok(text.includes(move), "the change line in market terms");
    assert.match(text, /Data as of Mar 1, 2026/);
    assert.match(text, /Checked Mar 1, 2026 00:00 UTC · Source: FRED/);
    assert.doesNotMatch(text, /Saved copy/);
    assert.doesNotMatch(text, /\bcall\b/i, "the guidance is never 'the call' in reader copy (docs/editorial-guardrails.md)");
  });

  it("links back to the weekly brief as a teammate's share", async () => {
    const { briefUrl } = buildCallStripEmbedModel(await assemble());
    assert.ok(briefUrl.startsWith(`${siteUrl}/`));
    assert.equal(new URL(briefUrl).searchParams.get("ref"), "share");
  });

  it("says so when the numbers came off a saved copy", async () => {
    const reportData = buildReportDataFixture({
      treasury: { fallback_at: "2026-03-01T00:00:00Z", fallback_reason: "upstream unavailable" },
    });
    assert.match(textOf(await renderEmbed("auto", reportData)), /Saved copy, not a live reading/);
  });

  it("escapes what it prints", async () => {
    const model = { ...buildCallStripEmbedModel(await assemble()), guidance: `<script>alert("x")</script>` };
    const html = renderCallStripEmbedDocument(model, { theme: "auto" });
    assert.doesNotMatch(html, /<script>/);
    assert.ok(html.includes("&lt;script&gt;"));
  });

  it("keeps one main landmark when the read fails", () => {
    const html = renderCallStripEmbedUnavailable({ theme: "dark" });
    assert.equal(count(html, /<main\b/g), 1);
    assert.match(html, /data-theme="dark"/);
    assert.match(html, /<meta name="robots" content="noindex">/);
  });

  it("answers a failed read with a frame: 503, noindex and no shared cache", async () => {
    /* Outside a request the homepage read has no incremental cache and throws, which is the
       failure path; the success path is the document the tests above render. */
    const response = await GET(new Request(`${siteUrl}/embed/call-strip?theme=dark`));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
    assert.equal(response.headers.get("x-robots-tag"), "noindex");
    assert.equal(response.headers.get("cache-control"), "no-store");
    const html = await response.text();
    assert.equal(count(html, /<main\b/g), 1);
    assert.match(html, /<html lang="en" data-theme="dark">/);
  });
});

/*
 * What vinext sends: every matching rule's headers, the last match winning per singular
 * header name (node_modules/vinext/dist/server/config-headers.js). Evaluated with the
 * framework's own matcher so a source pattern it reads differently from Next fails here.
 */
const effectiveHeaders = async (pathname: string) => {
  const rules = await loadNextConfig().default.headers();
  const matched = matchHeaders(pathname, rules, requestContextFromRequest(new Request(`https://whether.work${pathname}`)));
  const last = new Map<string, string>();
  for (const header of matched) last.set(header.key.toLowerCase(), header.value);
  return last;
};

describe("the frame exception", () => {
  it("lets any site frame the embed", async () => {
    const headers = await effectiveHeaders("/embed/call-strip");
    assert.equal(headers.get("content-security-policy"), "frame-ancestors *");
    assert.notEqual(headers.get("x-frame-options"), "DENY");
    assert.equal(headers.get("x-content-type-options"), "nosniff", "the rest of the site's headers still apply");
  });

  for (const pathname of ["/", "/share", "/brief/2026-w40", "/api/oembed", "/embedded", "/api/agent"]) {
    it(`keeps ${pathname} unframeable`, async () => {
      const headers = await effectiveHeaders(pathname);
      assert.equal(headers.get("x-frame-options"), "DENY");
      assert.equal(headers.get("content-security-policy"), undefined);
    });
  }
});
