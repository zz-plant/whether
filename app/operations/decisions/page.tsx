import { redirectTo } from "../../../lib/navigation/legacyRedirects";

export const runtime = "edge";

type OperationsDecisionsPageProps = {
  searchParams?: Promise<{
    month?: string;
    year?: string;
    [key: string]: string | undefined;
  }>;
};

export default async function OperationsDecisionsPage({
  searchParams,
}: OperationsDecisionsPageProps) {
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
  const destination = query ? `/operations?${query}` : "/operations";
  return redirectTo(destination);
}
