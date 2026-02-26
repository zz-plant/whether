import { redirectTo } from "../../lib/navigation/legacyRedirects";

export const runtime = "edge";

type EvidencePageProps = {
  searchParams?: Promise<{
    month?: string;
    year?: string;
    [key: string]: string | undefined;
  }>;
};

export default async function EvidencePage({ searchParams }: EvidencePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const params = new URLSearchParams();

  if (resolvedSearchParams) {
    Object.entries(resolvedSearchParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
  }

  const query = params.toString();
  const destination = query ? `/signals?${query}` : "/signals";
  return redirectTo(destination);
}
