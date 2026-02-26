import { redirectWithParams } from "../../../../lib/navigation/legacyRedirects";

export default async function CanonArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  return redirectWithParams(params, ({ slug }) => `/concepts/${slug}`);
}
