import type { Metadata } from "next";
import { siteUrl } from "./siteUrl";

export const organizationName = "Whether";
export const websiteName = "Whether — Weekly Startup Market Weather & Operating Posture";
export const canonicalPositioningLine =
  "Whether translates macro market signals into a weekly operating posture for startups.";
export const defaultSiteDescription =
  "Whether translates macro market signals into a weekly operating posture for startups: when to hire, when to raise, and when to conserve runway.";
export const defaultSocialImagePath = "/api/og?template=report";

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
  imageParams,
}: {
  title: string;
  description: string;
  path: string;
  imageAlt: string;
  imageParams?: Record<string, string>;
}): Metadata => {
  const canonicalUrl = buildCanonicalUrl(path);
  const imageUrl = buildOgImageUrl(imageParams);

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
