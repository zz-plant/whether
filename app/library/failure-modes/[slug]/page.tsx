import { redirectWithParams } from "../../../../lib/navigation/legacyRedirects";

export const runtime = 'edge';

type Params = { slug: string };

export default async function LibraryFailureModeDetailPage({ params }: { params: Promise<Params> }) {
  return redirectWithParams(params, ({ slug }) => `/learn/failure-modes/${slug}`);
}
