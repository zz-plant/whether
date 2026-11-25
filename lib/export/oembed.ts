/**
 * oEmbed (https://oembed.com) for the live brief: a whether.work link pasted into
 * Notion, Coda, Slite, Ghost or any Iframely-backed editor becomes the embed
 * (`/embed/call-strip`, `lib/export/callStripEmbed.ts`) instead of a bare link card.
 *
 * Only the addresses that are the live brief answer. A dated record
 * (`/brief/2026-w40`) is a citation of one week, and a live frame under its address
 * would print a different week's guidance than the link names, so those paths get the
 * link card their Open Graph tags already draw. So does an archived reading of the
 * homepage (`?month=&year=`), and so do the answer pages: each answers its own
 * question, and a frame would replace the answer with the week's guidance.
 */
import { buildCanonicalUrl, buildOgImageUrl } from "../seo";
import { siteUrl } from "../siteUrl";

const OEMBED_PATH = "/api/oembed";

/* The embed's address and title, here rather than beside its renderer so the pages that
   name the discovery link do not import the brief document builder. */
const CALL_STRIP_EMBED_PATH = "/embed/call-strip";
export const CALL_STRIP_EMBED_TITLE = "Whether: this week's guidance";

/** `light` or `dark` when the embedder pinned one (`?theme=`); otherwise the device setting decides. */
export type EmbedTheme = "light" | "dark" | "auto";

export const parseEmbedTheme = (value: string | null | undefined): EmbedTheme =>
  value === "light" || value === "dark" ? value : "auto";

/** The paths that are the live brief, as a reader shares them, and the embed's own address. */
const LIVE_PATHS = new Set(["/", "/share", CALL_STRIP_EMBED_PATH]);

/* The embed at its usual length with five areas; the frame scrolls if a week runs long. */
const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 720;

type OEmbedResponse = {
  version: "1.0";
  type: "rich";
  provider_name: string;
  provider_url: string;
  title: string;
  html: string;
  width: number;
  height: number;
  thumbnail_url: string;
  thumbnail_width: number;
  thumbnail_height: number;
  cache_age: number;
};

/* A consumer's limit, when it gave a usable one. */
const limitOf = (value: number | undefined) => (value !== undefined && Number.isFinite(value) && value > 0 ? value : undefined);

/** This site's address, or the `www.` form of it. */
const isSiteHost = (hostname: string) => {
  const site = new URL(siteUrl).hostname;
  return hostname === site || hostname === `www.${site}`;
};

type OEmbedResult =
  | { ok: true; body: OEmbedResponse }
  /* 400: no address, or not a URL. 404: an address this site does not embed (spec §2.3.4). */
  | { ok: false; status: 400 | 404; message: string };

/**
 * The frame keeps within the consumer's `maxwidth` and `maxheight` (spec §2.3.4.4); the
 * embed scrolls inside a frame shorter than it. A `theme` on the pasted address carries
 * into the frame.
 */
export const buildOEmbed = (
  rawUrl: string | null,
  { maxWidth, maxHeight }: { maxWidth?: number; maxHeight?: number } = {},
): OEmbedResult => {
  if (!rawUrl || !URL.canParse(rawUrl)) return { ok: false, status: 400, message: "Pass url, a whether.work address." };
  const target = new URL(rawUrl);
  if (!isSiteHost(target.hostname) || !LIVE_PATHS.has(target.pathname)) {
    return { ok: false, status: 404, message: "Not an embeddable whether.work address." };
  }
  if (target.searchParams.has("month") || target.searchParams.has("year")) {
    return { ok: false, status: 404, message: "An archived reading is not embedded; the frame shows the live week." };
  }

  const width = Math.floor(Math.min(DEFAULT_WIDTH, limitOf(maxWidth) ?? DEFAULT_WIDTH));
  const height = Math.floor(Math.min(DEFAULT_HEIGHT, limitOf(maxHeight) ?? DEFAULT_HEIGHT));
  const src = new URL(CALL_STRIP_EMBED_PATH, siteUrl);
  const theme = parseEmbedTheme(target.searchParams.get("theme"));
  if (theme !== "auto") src.searchParams.set("theme", theme);

  return {
    ok: true,
    body: {
      version: "1.0",
      type: "rich",
      provider_name: "Whether",
      provider_url: buildCanonicalUrl("/"),
      title: CALL_STRIP_EMBED_TITLE,
      html: `<iframe src="${src.toString().replaceAll("&", "&amp;")}" width="${width}" height="${height}" style="border:0;max-width:100%" loading="lazy" title="${CALL_STRIP_EMBED_TITLE.replaceAll("'", "&#39;")}"></iframe>`,
      width,
      height,
      thumbnail_url: buildOgImageUrl({ template: "report" }),
      thumbnail_width: 1200,
      thumbnail_height: 630,
      /* The embed itself refreshes every 15 minutes; the frame markup changes only with a deploy. */
      cache_age: 86400,
    },
  };
};

/** The discovery address a page's `<link rel="alternate" type="application/json+oembed">` names. */
export const buildOEmbedDiscoveryUrl = (pagePath: string) => {
  const url = new URL(OEMBED_PATH, siteUrl);
  url.searchParams.set("url", buildCanonicalUrl(pagePath));
  url.searchParams.set("format", "json");
  return url.toString();
};
