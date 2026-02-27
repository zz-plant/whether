import { redirectWithParams } from "../../../lib/navigation/legacyRedirects";

type Params = { slug: string };

export default function UseCaseDetailPage({ params }: { params: Promise<Params> }) {
  return redirectWithParams(params, ({ slug }) => `/decide/${slug}`);
}
