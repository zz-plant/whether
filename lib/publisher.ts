/**
 * Publisher and author identity.
 *
 * Google Discover and Google News both require a named author, information about
 * the publisher behind the content, and a contact route. Everything here is
 * rendered publicly on /about, /contact, and in article JSON-LD — change it in one
 * place rather than inlining names or addresses at call sites.
 */
import { buildCanonicalUrl } from "./seo";

export const publisherAuthor = {
  name: "Kanav Jain",
  role: "Editor, Whether",
  /** Rendered as a mailto: link on /contact and used as the schema.org contact point. */
  email: "kanavj@gmail.com",
  bio:
    "Kanav Jain writes and maintains Whether's weekly operating brief, and owns the regime model that turns public macro data into a posture call.",
} as const;

export const publisherProfilePath = "/about";
export const publisherContactPath = "/contact";

export const publisherProfileUrl = () => buildCanonicalUrl(publisherProfilePath);
export const publisherContactUrl = () => buildCanonicalUrl(publisherContactPath);

/** schema.org Person for article bylines. */
export const buildAuthorSchema = () => ({
  "@type": "Person",
  name: publisherAuthor.name,
  jobTitle: publisherAuthor.role,
  url: publisherProfileUrl(),
});

/** schema.org Organization with the contact point Discover/News policies ask for. */
export const buildPublisherSchema = (organizationName: string) => ({
  "@type": "Organization",
  name: organizationName,
  url: buildCanonicalUrl("/"),
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "editorial",
    email: publisherAuthor.email,
    url: publisherContactUrl(),
  },
});
