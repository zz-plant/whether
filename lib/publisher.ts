/**
 * Publisher and author identity.
 *
 * Google Discover and Google News both require a named author, information about
 * the publisher behind the content, and a contact route. Everything here is
 * rendered publicly on /about, /contact, and in article JSON-LD — change it in one
 * place rather than inlining names or addresses at call sites.
 */
import { buildCanonicalUrl, organizationId, organizationSameAs } from "./seo";
import { siteUrl } from "./siteUrl";

export const publisherAuthor = {
  name: "Kanav Jain",
  role: "Editor, Whether",
  /** Rendered as a mailto: link on /contact and used as the schema.org contact point. */
  email: "kanavj@gmail.com",
  bio:
    "Kanav Jain writes and maintains Whether's weekly operating brief, and owns the model that turns public U.S. market data into the weekly guidance.",
  /** The author's own site, linked from the footer; `sameAs` on the Person node. */
  sameAs: ["https://kanav.net"],
} as const;

/**
 * The license on Whether's own published readings, scores and briefs (Terms of Service, section 2),
 * and the `license` of each Dataset built from them. Until 2026-11-12 that was the terms page, whose
 * grant is a revocable right of internal use, so Google Dataset Search listed the data as closed.
 * Not /comps: its medians are computed from licensed market prices.
 */
export const publishedDataLicenseUrl = "https://creativecommons.org/licenses/by/4.0/";

/**
 * Google's setting for adding this site as a preferred source, which shows its pages more often in
 * that reader's Top Stories (Search Central, "Preferred sources"). The deeplink, not Google's button
 * script, so a page that offers it loads nothing from a third party.
 */
export const googlePreferredSourceUrl = `https://www.google.com/preferences/source?q=${new URL(siteUrl).host}`;

/** The periodical the frozen weeks are issues of: the feed's title and their structured data's. */
export const weeklyPublicationName = "Whether Weekly Brief";

export const publisherProfilePath = "/about";
export const publisherContactPath = "/contact";

const publisherProfileUrl = () => buildCanonicalUrl(publisherProfilePath);
const publisherContactUrl = () => buildCanonicalUrl(publisherContactPath);

/** schema.org Person for article bylines. */
export const buildAuthorSchema = () => ({
  "@type": "Person",
  name: publisherAuthor.name,
  jobTitle: publisherAuthor.role,
  url: publisherProfileUrl(),
  sameAs: [...publisherAuthor.sameAs],
});

/**
 * schema.org Organization with the contact point Discover/News policies ask for.
 *
 * Carries the same `@id`, logo and `sameAs` as the homepage's Organization node,
 * so every page's publisher resolves to one entity rather than a lookalike.
 */
export const buildPublisherSchema = (organizationName: string) => ({
  "@type": "Organization",
  "@id": organizationId,
  name: organizationName,
  url: buildCanonicalUrl("/"),
  logo: `${siteUrl}/icon.svg`,
  sameAs: [...organizationSameAs],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "editorial",
    email: publisherAuthor.email,
    url: publisherContactUrl(),
  },
});
