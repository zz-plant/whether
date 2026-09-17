import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import PrivacyPage from "../app/privacy/page";
import { STORAGE_KEYS } from "../lib/storage/keys";
import { TELEMETRY_STREAMS } from "../lib/telemetry/analyticsEngine";

/**
 * The privacy page has to stay an inventory, not a document.
 *
 * There was no privacy page at all: the footer carried Terms and an Acceptable
 * Use Policy, and every use of the word "data" in both means *market* data —
 * while the product stores subscriber addresses with verification tokens, the
 * email Stripe reports for a paying customer, a per-browser identifier the
 * server reads back, one cookie, nine browser storage keys, and eight telemetry
 * streams. A reader had nowhere to check any of it.
 *
 * Prose goes stale silently, which is the failure this guards. Each storage key
 * and each stream is claimed below by the section that accounts for it, so
 * adding one without deciding what the page says about it fails here. The
 * registry is deliberately hand-written: the point is that a person looked at
 * the new key and said where it belongs.
 */

/** Every `STORAGE_KEYS` entry, against the section of /privacy that covers it. */
const STORAGE_KEY_SECTIONS: Record<keyof typeof STORAGE_KEYS, string> = {
  theme: "2.4 — stays in the browser, never sent",
  homeOrientationDismissed: "2.4 — stays in the browser, never sent",
  reviewedRecordDates: "2.4 — stays in the browser, never sent",
  operatorProfile: "2.4 — stays in the browser, never sent",
  operatorWorkflowLastPath: "2.4 — stays in the browser, never sent",
  lastSeenCall: "2.4 — stays in the browser, never sent",
  decisionShieldPresets: "2.4 — stays in the browser, never sent",
  entitlementToken: "2.2 — the token that tells this browser its plan is active",
  decisionMemory: "2.3 and 2.4 — keyed to the browser identifier, and stored server-side",
};

/** Every `TELEMETRY_STREAMS` entry, against the section of /privacy that covers it. */
const TELEMETRY_STREAM_SECTIONS: Record<(typeof TELEMETRY_STREAMS)[number], string> = {
  "web-vitals": "2.6 — how fast a page loaded",
  "operator-workflow": "2.6 — which route was moved to from which",
  activation: "2.6 — funnel steps",
  "content-measurement": "2.6 — coarse acquisition bucket",
  "premium-funnel": "2.6 — checkout funnel steps",
  search: "2.6 — the shape of a search, never its text",
  /* Worker-authored. No browser writes these and no reader appears in them, but
     they are listed so the census covers the whole union rather than the part
     that happens to be browser-facing. */
  "ingest-pipeline": "not reader data — the scheduled pipeline's own success and duration",
  "cron-step": "not reader data — scheduled run history, published on /trust",
};

const renderPrivacyPage = () => renderToStaticMarkup(<PrivacyPage />);

describe("privacy policy", () => {
  it("accounts for every client storage key", () => {
    assert.deepEqual(
      Object.keys(STORAGE_KEYS).sort((a, b) => a.localeCompare(b)),
      Object.keys(STORAGE_KEY_SECTIONS).sort((a, b) => a.localeCompare(b)),
      "a client storage key was added or removed without saying what /privacy tells a reader about it",
    );
  });

  it("accounts for every telemetry stream", () => {
    assert.deepEqual(
      [...TELEMETRY_STREAMS].sort((a, b) => a.localeCompare(b)),
      Object.keys(TELEMETRY_STREAM_SECTIONS).sort((a, b) => a.localeCompare(b)),
      "a telemetry stream was added or removed without saying what /privacy tells a reader about it",
    );
  });

  it("states the things a reader came to check", () => {
    const html = renderPrivacyPage();

    // Each of these is a claim the code makes true elsewhere; the page is where
    // a reader can see it without reading the code.
    assert.match(html, /No third-party analytics/i);
    assert.match(html, /unsubscribe/i);
    assert.match(html, /Stripe/);
    assert.match(html, /Cloudflare/);
    assert.match(html, /no IP address/i);
    assert.match(html, /never sent/i);
  });

  it("tells a reader how to leave and how to ask", () => {
    const html = renderPrivacyPage();
    assert.match(html, /mailto:/, "no address for a deletion request");
    assert.match(html, /clearing site data/i, "no way to clear what the browser holds");
  });

  it("carries its own effective date, not the one the first two legal pages shipped with", () => {
    const html = renderPrivacyPage();
    assert.match(html, /Effective Date: 9\/17\/2026/);
    assert.doesNotMatch(html, /Effective Date: 2\/23\/2026/);
  });

  it("is reachable from the footer on every page", async () => {
    // A policy nobody can find is the state this replaced, one document along.
    const layout = await readFile("app/layout.tsx", "utf8");
    assert.match(layout, /href="\/privacy"/, "the footer does not link the privacy page");
  });

  it("is in the sitemap beside the other legal pages", async () => {
    const sitemap = await readFile("app/sitemap.ts", "utf8");
    assert.match(sitemap, /path: "\/privacy"/);
  });

  /*
   * The page says there is no third-party analytics, tag manager, ad network or
   * social pixel, and that fonts are served from this site. That is true today
   * and is the kind of thing a single added <script> makes false, so it is
   * checked rather than asserted.
   */
  it("does not claim an absence the app contradicts", async () => {
    const layout = await readFile("app/layout.tsx", "utf8");
    for (const vendor of ["googletagmanager", "google-analytics", "connect.facebook.net", "cdn.segment.com"]) {
      assert.ok(!layout.includes(vendor), `/privacy claims no third-party trackers, but the layout loads ${vendor}`);
    }
    const fonts = await readFile("app/styles/fonts.css", "utf8");
    assert.doesNotMatch(
      fonts,
      /@import\s+url\(["']?https:\/\/fonts\.googleapis\.com/,
      "/privacy claims fonts are self-hosted",
    );
  });
});
