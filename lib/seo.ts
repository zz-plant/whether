import type { Metadata } from "next";
import { siteUrl } from "./siteUrl";
import { decisionTransmissionSearchDescription } from "./report/decisionTransmissionCopy";

export const organizationName = "Whether";
/**
 * The category line, and the single source for it.
 *
 * Two nouns are load-bearing and neither may be substituted on an outward
 * surface: the product is the **Whether Weekly Brief**, and what it delivers is
 * the **weekly operating guidance**. Marketing surfaces kept minting third options
 * ("operating posture", "pacing authority", "decision-translation layer"), which
 * is fine internally and costly outwardly — this product spreads by someone
 * repeating it in a Slack channel, and a phrase that changes per surface does not
 * survive the retelling. See docs/editorial-guardrails.md -> Category line.
 */
export const websiteName = "Whether — Weekly Operating Guidance for Startup Leaders";
/*
 * The line leads with the lines, not the day. The record moves a few times a
 * year (`lineCrossingMonths` in `lib/report/trackRecord.ts`), so "each Monday"
 * as the opening promised news the weekly reading rarely has; the use that fits
 * is a set of lines checked weekly and an email the day one is crossed.
 */
export const canonicalPositioningLine =
  "The interest-rate and credit lines that pause or resume your hiring, spend and raise. Checked every Monday, with an email the day one is crossed.";
export const defaultSiteDescription =
  `${canonicalPositioningLine} ${decisionTransmissionSearchDescription}`;

/**
 * Where else the organization is on record. Search engines use `sameAs` to
 * tie the `Organization` node to profiles they already know; without it the
 * brand entity was anchored to nothing but its own homepage. Only the
 * organization's own presences belong here (the author's site is on the
 * Person node, in lib/publisher.ts).
 *
 * One entry is thin for a brand whose name is an ordinary English word, which
 * is the hardest case for entity resolution: "whether" appears in every corpus
 * a retrieval system holds, so the node needs corroborating identifiers rather
 * than more prose. A LinkedIn company page, an X profile, a Crunchbase entry
 * and a Wikidata item are the four that carry weight, and each belongs here the
 * day it exists. None are listed because none have been confirmed to exist —
 * an invented profile URL is a false claim about the organization, and a
 * `sameAs` pointing at a 404 is worse for entity resolution than a short list.
 */
export const organizationSameAs = ["https://github.com/zz-plant/whether"] as const;

/**
 * What the organization is about, as the site itself defines it.
 *
 * Derived from the two vocabularies that already exist — the signals the engine
 * publishes and the decision areas its rules are scoped to — so a topic cannot
 * be claimed here that no page covers. This is the other half of anchoring an
 * ambiguous brand name: `sameAs` says *which* entity, `knowsAbout` says what it
 * is competent in, and a retrieval system deciding whether to cite this site on
 * a hiring-under-tight-credit question reads the second one.
 */
export const organizationKnowsAbout = [
  "Macroeconomic conditions for startup operating decisions",
  "US Treasury yield curve",
  "Startup hiring decisions",
  "Capital raising timing",
  "Burn discipline",
  "Product tempo",
  "Expansion bets",
] as const;

/** The site-level entity ids every page's graph points at. */
export const organizationId = `${siteUrl}#organization`;
export const websiteId = `${siteUrl}#website`;
const defaultSocialImagePath = "/api/og?template=report";

export const buildCanonicalUrl = (path: string) => new URL(path, siteUrl).toString();
export const buildSocialImageUrl = (path = defaultSocialImagePath) =>
  buildCanonicalUrl(path);

export const buildOgImageUrl = (params?: Record<string, string>) => {
  const imageUrl = new URL("/api/og", siteUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => imageUrl.searchParams.set(key, value));
  }

  return imageUrl.toString();
};

export const buildBreadcrumbList = (items: Array<{ name: string; path: string }>) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: buildCanonicalUrl(item.path),
  })),
});

/**
 * Safely serializes JSON-LD for embedding in a script tag.
 * Escapes characters that can terminate the script context in HTML.
 */
export const serializeJsonLd = (value: unknown) =>
  JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");

/**
 * Text for an XML text node or attribute in `/feed.xml` and `/news-sitemap.xml`: a `&` in a
 * call or a headline broke the document. One copy, where each route had its own.
 */
export const escapeXml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* The /api/og templates that draw a title and subtitle a page supplies (the rest
   draw live data or a published record). Kept in step with `StaticOgTemplate`. */
const TEXT_CARD_TEMPLATES: ReadonlySet<string> = new Set([
  "operations",
  "signals",
  "method",
  "solutions",
  "guides",
  "reading",
  "record",
  "plain",
]);

/** A page title minus its section suffix ("Capital tightness | Evidence"). */
const cardTitle = (title: string) => title.split(" | ")[0] ?? title;

/** A subtitle that ends on a word, inside what the card draws. */
const cardSubtitle = (description: string, maxLength = 160) => {
  const normalized = description.trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength) return normalized;
  const cut = normalized.slice(0, maxLength - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), Math.floor(maxLength * 0.6))).trimEnd()}\u2026`;
};

/**
 * What the share card for a page draws.
 *
 * A page that passed nothing used to get the bare `/api/og`, which is the *live
 * weekly card* — so 113 pages, the privacy policy and all 82 archive periods
 * among them, previewed this week's reading when shared. A page that wants the
 * live card now asks for it (`template: "report"`); everything else gets a card
 * with its own title and description, and a text template that names only a
 * template gets the page's words rather than a site-wide default subtitle.
 */
const resolveCardParams = (
  title: string,
  description: string,
  imageParams: Record<string, string> | undefined,
): Record<string, string> => {
  if (imageParams === undefined) {
    return { template: "plain", title: cardTitle(title), subtitle: cardSubtitle(description) };
  }
  if (TEXT_CARD_TEMPLATES.has(imageParams.template ?? "")) {
    return { title: cardTitle(title), subtitle: cardSubtitle(description), ...imageParams };
  }
  return imageParams;
};

/** The share card a page's metadata names, for structured data that must name the same image. */
export const buildPageImageUrl = (title: string, description: string, imageParams?: Record<string, string>) =>
  buildOgImageUrl(resolveCardParams(title, description, imageParams));

export const buildPageMetadata = ({
  title,
  description,
  path,
  imageAlt,
  imagePath,
  imageParams,
}: {
  title: string;
  description: string;
  path: string;
  imageAlt: string;
  imagePath?: string;
  imageParams?: Record<string, string>;
}): Metadata => {
  const canonicalUrl = buildCanonicalUrl(path);
  const imageUrl = imagePath
    ? buildSocialImageUrl(imagePath)
    : buildPageImageUrl(title, description, imageParams);

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title,
      description,
      siteName: websiteName,
      images: [{
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: imageAlt,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
};
