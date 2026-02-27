import { redirectWithParams } from "../../../../lib/navigation/legacyRedirects";

export const runtime = "edge";

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
