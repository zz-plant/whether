/**
 * oEmbed (https://oembed.com) for the live brief: a whether.work link pasted
 * into Notion, Ghost, a wiki, or any Iframely-backed editor becomes the live
 * widget instead of a bare link card.
 *
 * Only the addresses that are the live brief answer. A dated record
 * (`/brief/2026-w40`) is a citation of one week, and a live widget under its
 * address would print a different week's guidance than the link names, so
 * those paths get the link card their Open Graph tags already draw. So does an
 * archived reading of the homepage (`?month=&year=`): the widget only draws
 * the live week.
 */
import { buildCanonicalUrl, buildOgImageUrl } from "../seo";
import { siteUrl } from "../siteUrl";

const OEMBED_PATH = "/api/oembed";

/** The paths that are the live brief, as a reader shares them. */
const LIVE_PATHS = new Set(["/", "/share"]);

const DEFAULT_WIDTH = 560;
/* The brief widget's height at its usual length; the frame scrolls if a week runs long. */
const BRIEF_HEIGHT = 520;

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

/**
 * Null when the address is not this site's live brief: the route answers 404, as the spec asks.
 * The frame keeps within the consumer's `maxwidth` and `maxheight` (spec §2.3.4.4); the widget
 * scrolls inside a frame shorter than it.
 */
export const buildOEmbed = (
  rawUrl: string | null,
  { maxWidth, maxHeight }: { maxWidth?: number; maxHeight?: number } = {},
): OEmbedResponse | null => {
  if (!rawUrl) return null;
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return null;
  }
  const site = new URL(siteUrl);
  const sameSite = target.hostname === site.hostname || target.hostname === `www.${site.hostname}`;
  if (!sameSite || !LIVE_PATHS.has(target.pathname)) return null;
  if (target.searchParams.has("month") || target.searchParams.has("year")) return null;

  const width = Math.floor(Math.min(DEFAULT_WIDTH, limitOf(maxWidth) ?? DEFAULT_WIDTH));
  const height = Math.floor(Math.min(BRIEF_HEIGHT, limitOf(maxHeight) ?? BRIEF_HEIGHT));
  const src = new URL("/api/embed", siteUrl);
  src.searchParams.set("format", "page");
  src.searchParams.set("ref", "oembed");
  const stage = target.searchParams.get("stage");
  if (stage) src.searchParams.set("stage", stage);

  const title = "Whether: this week's guidance";
  return {
    version: "1.0",
    type: "rich",
    provider_name: "Whether",
    provider_url: buildCanonicalUrl("/"),
    title,
    html: `<iframe src="${src.toString().replaceAll("&", "&amp;")}" width="${width}" height="${height}" style="border:0;max-width:100%" loading="lazy" title="${title.replaceAll("'", "&#39;")}"></iframe>`,
    width,
    height,
    thumbnail_url: buildOgImageUrl({ template: "report" }),
    thumbnail_width: 1200,
    thumbnail_height: 630,
    cache_age: 3600,
  };
};

/** The discovery address a page's `<link rel="alternate">` names. */
export const buildOEmbedDiscoveryUrl = (pagePath: string) => {
  const url = new URL(OEMBED_PATH, siteUrl);
  url.searchParams.set("url", buildCanonicalUrl(pagePath));
  url.searchParams.set("format", "json");
  return url.toString();
};
