import { buildBreadcrumbList, defaultSiteDescription, organizationName, websiteName } from "../../seo";
import { siteUrl } from "../../siteUrl";
import { createBreadcrumbTrail } from "../../navigation/breadcrumbs";
import { homeDecisionFaqItems } from "../decisionTransmissionCopy";

export const buildHomeStructuredData = () => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}#organization`,
      name: organizationName,
      url: siteUrl,
      logo: `${siteUrl}/icon.svg`,
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}#website`,
      name: websiteName,
      url: siteUrl,
      description: defaultSiteDescription,
      inLanguage: "en",
      mainEntityOfPage: `${siteUrl}/`,
      publisher: {
        "@id": `${siteUrl}#organization`,
      },
    },
    {
      "@type": "CollectionPage",
      "@id": `${siteUrl}/#webpage`,
      name: "Whether Report — Weekly Brief",
      url: siteUrl,
      description: defaultSiteDescription,
      inLanguage: "en",
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${siteUrl}/`,
      },
      isPartOf: {
        "@id": `${siteUrl}#website`,
      },
      about: {
        "@type": "Thing",
        name: "Weekly operating posture and decision triggers for leadership teams",
      },
      mainEntity: {
        "@type": "Dataset",
        name: "US Treasury yield curve snapshot",
        description:
          "Weekly US Treasury yield-curve regime snapshot used by Whether to guide what leaders should change now, with confidence and flip conditions.",
        creator: {
          "@id": `${siteUrl}#organization`,
        },
        license: `${siteUrl}/terms-of-service`,
        isBasedOn: {
          "@type": "CreativeWork",
          name: "FRED CSV Treasury series (DGS1MO/DGS3MO/DGS2/DGS10)",
          url: "https://fred.stlouisfed.org/",
        },
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}/#weekly-decision-faq`,
      mainEntity: homeDecisionFaqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
      isPartOf: {
        "@id": `${siteUrl}#website`,
      },
    },
    buildBreadcrumbList(createBreadcrumbTrail([{ path: "/" }])),
  ],
});
