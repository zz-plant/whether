import { redirectWithParams } from "../../../../lib/navigation/legacyRedirects";
export const runtime = 'edge';


export default async function CanonArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  return redirectWithParams(params, ({ slug }) => `/concepts/${slug}`);
}
