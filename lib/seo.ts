import type { Metadata } from "next";
import { siteUrl } from "./siteUrl";
import { decisionTransmissionSearchDescription } from "./report/decisionTransmissionCopy";

export const organizationName = "Whether";
/**
 * The category line, and the single source for it.
 *
 * Two nouns are load-bearing and neither may be substituted on an outward
 * surface: the product is the **Whether Weekly Brief**, and what it delivers is
 * the **weekly operating call**. Marketing surfaces kept minting third options
 * ("operating posture", "pacing authority", "decision-translation layer"), which
 * is fine internally and costly outwardly — this product spreads by someone
 * repeating it in a Slack channel, and a phrase that changes per surface does not
 * survive the retelling. See docs/editorial-guardrails.md -> Category line.
 */
export const websiteName = "Whether — Weekly Operating Call for Startup Leaders";
export const canonicalPositioningLine =
  "Whether turns macro conditions into a weekly operating call for startup leaders.";
export const defaultSiteDescription =
  `${canonicalPositioningLine} ${decisionTransmissionSearchDescription}`;
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
  const imageUrl = imagePath ? buildSocialImageUrl(imagePath) : buildOgImageUrl(imageParams);

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
