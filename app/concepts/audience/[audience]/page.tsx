import type { Metadata } from "next";
import {
  ConceptTaxonomyPage,
  type ConceptTaxonomyCopy,
  buildConceptTaxonomyMetadata,
} from "../../components/conceptTaxonomyPage";
import {
  conceptAudiences,
  findConceptAudienceBySlug,
  getArticlesByAudience,
  toConceptTaxonomySlug,
  type ProductConceptArticle,
} from "../../../../lib/productCanon";

type AudiencePageProps = {
  params: Promise<{ audience: string }>;
};

const audienceCopy: ConceptTaxonomyCopy<ProductConceptArticle["audience"]> = {
  metadataNotFoundTitle: "Concept audience not found — Whether",
  metadataNotFoundDescription: "Requested concept audience collection was not found.",
  metadataNotFoundImageAlt: "Concept audience not found",
  metadataDescription: (resolvedAudience: string) =>
    `Browse concept essays most relevant to ${resolvedAudience.toLowerCase()} and review macro context at publication.`,
  metadataImageAlt: (resolvedAudience: string) => `${resolvedAudience} concept map`,
  metadataImageParams: (resolvedAudience: string) => ({
    template: "guides" as const,
    eyebrow: "PM concept audience",
    title: `For ${resolvedAudience}`,
    subtitle: "Curated PM essays mapped to capital posture data.",
    kicker: "Whether concept maps",
  }),
  structuredDataName: (resolvedAudience: string) => `${resolvedAudience} concept map`,
  eyebrow: "Audience concept map",
  heading: (resolvedAudience: string) => `For ${resolvedAudience}`,
  description: (resolvedAudience: string) =>
    `A focused collection of PM essays for ${resolvedAudience}, with publication-time regime context to improve planning interpretation.`,
};

export const dynamicParams = false;

export function generateStaticParams() {
  return conceptAudiences.map((audience) => ({ audience: toConceptTaxonomySlug(audience) }));
}

export async function generateMetadata({ params }: AudiencePageProps): Promise<Metadata> {
  const { audience } = await params;

  return buildConceptTaxonomyMetadata({
    taxonomyKind: "audience",
    slug: audience,
    resolveBySlug: findConceptAudienceBySlug,
    copy: audienceCopy,
  });
}

export default async function ConceptAudiencePage({ params }: AudiencePageProps) {
  const { audience } = await params;

  return (
    <ConceptTaxonomyPage
      taxonomyKind="audience"
      slug={audience}
      resolveBySlug={findConceptAudienceBySlug}
      listByTaxonomy={getArticlesByAudience}
      copy={audienceCopy}
    />
  );
}
