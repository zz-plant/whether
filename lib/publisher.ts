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
    "Kanav Jain writes and maintains Whether's weekly operating brief, and owns the regime model that turns public macro data into a posture call.",
  /** The author's own site, linked from the footer; `sameAs` on the Person node. */
  sameAs: ["https://kanav.net"],
} as const;

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
