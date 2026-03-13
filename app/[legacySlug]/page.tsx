import { notFound } from "next/navigation";
import {
  legacyRedirects,
  redirectTo,
  resolveLegacyRedirectSlug,
} from "../../lib/navigation/legacyRedirects";

export const revalidate = 900;

export const generateStaticParams = () => {
  return legacyRedirects.map(({ legacyPath }) => ({
    legacySlug: legacyPath.slice(1),
  }));
};

export default async function LegacySlugRoute({
  params,
}: {
  params: Promise<{ legacySlug: string }>;
}) {
  const { legacySlug } = await params;
  const targetPath = resolveLegacyRedirectSlug(legacySlug);

  if (!targetPath) {
    notFound();
  }

  redirectTo(targetPath);
}
