import { redirectTo } from "../../lib/navigation/legacyRedirects";

type SolutionsHubPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SolutionsHubPage({ searchParams }: SolutionsHubPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const params = new URLSearchParams();

  if (resolvedSearchParams) {
    Object.entries(resolvedSearchParams).forEach(([key, value]) => {
      if (typeof value === "string") {
        params.set(key, value);
      }
    });
  }

  const query = params.toString();
  return redirectTo(query ? `/toolkits?${query}` : "/toolkits");
}
