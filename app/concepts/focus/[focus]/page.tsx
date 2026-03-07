import type { Metadata } from "next";
import {
  ConceptTaxonomyPage,
  type ConceptTaxonomyCopy,
  buildConceptTaxonomyMetadata,
} from "../../components/conceptTaxonomyPage";
import {
  conceptFocuses,
  findConceptFocusBySlug,
  getArticlesByFocus,
  toConceptTaxonomySlug,
  type ProductConceptArticle,
} from "../../../../lib/productCanon";

type FocusPageProps = {
  params: Promise<{ focus: string }>;
};

const focusCopy: ConceptTaxonomyCopy<ProductConceptArticle["focus"]> = {
  metadataNotFoundTitle: "Concept focus not found — Whether",
  metadataNotFoundDescription: "Requested concept focus collection was not found.",
  metadataNotFoundImageAlt: "Concept focus not found",
  metadataDescription: (resolvedFocus: string) =>
    `Browse ${resolvedFocus.toLowerCase()} product-management essays and their macro regime context.`,
  metadataImageAlt: (resolvedFocus: string) => `${resolvedFocus} concept map`,
  metadataImageParams: (resolvedFocus: string) => ({
    template: "guides" as const,
    eyebrow: "PM concept focus",
    title: `${resolvedFocus} essays`,
    subtitle: "Mapped to the market regimes where each framework spread.",
    kicker: "Whether concept maps",
  }),
  structuredDataName: (resolvedFocus: string) => `${resolvedFocus} product concept map`,
  eyebrow: "Concept focus map",
  heading: (resolvedFocus: string) => `${resolvedFocus} essays in context`,
  description: (resolvedFocus: string) =>
    `Explore high-signal essays tagged for ${resolvedFocus}, then review the macro posture around each publication date.`,
};

export const dynamicParams = false;

export function generateStaticParams() {
  return conceptFocuses.map((focus) => ({ focus: toConceptTaxonomySlug(focus) }));
}

export async function generateMetadata({ params }: FocusPageProps): Promise<Metadata> {
  const { focus } = await params;

  return buildConceptTaxonomyMetadata({
    taxonomyKind: "focus",
    slug: focus,
    resolveBySlug: findConceptFocusBySlug,
    copy: focusCopy,
  });
}

export default async function ConceptFocusPage({ params }: FocusPageProps) {
  const { focus } = await params;

  return (
    <ConceptTaxonomyPage
      taxonomyKind="focus"
      slug={focus}
      resolveBySlug={findConceptFocusBySlug}
      listByTaxonomy={getArticlesByFocus}
      copy={focusCopy}
    />
  );
}
