import { redirectWithParams } from "../../../../lib/navigation/legacyRedirects";

type ConceptRouteParams = {
  slug: string;
};

export default function LearnConceptDetailPage({
  params,
}: {
  params: Promise<ConceptRouteParams>;
}) {
  return redirectWithParams(params, ({ slug }) => `/concepts/${slug}`);
}
