import { redirectTo } from "../../../lib/navigation/legacyRedirects";

type Params = { slug?: string[] };

const resolveSolutionsRedirect = ({ slug }: Params): string => {
  if (!slug || slug.length === 0) return "/toolkits";

  const [section] = slug;

  if (section === "career-paths") return "/decide/use-cases";
  if (section === "engineering-capacity") return "/toolkits/ops-capacity";
  if (section === "product-roadmapping") return "/toolkits/focus";
  if (section === "market-regime-playbook") return "/operations";

  return "/toolkits";
};

export default async function SolutionsCatchAllPage({ params }: { params: Promise<Params> }) {
  const resolved = await params;
  return redirectTo(resolveSolutionsRedirect(resolved));
}
