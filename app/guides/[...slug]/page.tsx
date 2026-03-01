import { redirectTo } from "../../../lib/navigation/legacyRedirects";

type Params = { slug?: string[] };

const stakeholderSlugs = new Set([
  "founders-ceos",
  "heads-of-product",
  "finance-leaders",
  "strategy-chief-of-staff",
  "vps-of-engineering",
  "boards-investors",
  "ceo",
  "cfo",
  "cto",
  "cpo",
  "coo",
  "head-of-product",
  "head-of-engineering",
]);

const stageSlugs = new Set(["pre-seed", "seed", "series-a", "series-b", "series-c-plus"]);

const resolveGuidesRedirect = ({ slug }: Params): string => {
  if (!slug || slug.length === 0) return "/learn";

  if (slug[0] === "stage") {
    if (slug.length > 1 && stageSlugs.has(slug[1])) {
      return "/decide/use-cases";
    }
    return "/learn";
  }

  if (slug.length === 1 && stakeholderSlugs.has(slug[0])) {
    return "/decide/use-cases";
  }

  return "/learn";
};

export default async function GuidesCatchAllPage({ params }: { params: Promise<Params> }) {
  const resolved = await params;
  return redirectTo(resolveGuidesRedirect(resolved));
}
