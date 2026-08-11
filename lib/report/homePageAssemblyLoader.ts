import { cookies } from "next/headers";
import { assembleHomePage } from "./homePageAssembler";
import type { HomePageSearchParams } from "./homeMetadata";
import { parseOperatorContextFromCookies } from "./operatorContext";

// Cadence data intentionally does NOT load here: the homepage renders it behind
// Suspense (`AsyncCadenceSection`), so fetching it on this blocking path would
// defeat the streaming boundary and duplicate the posture-state work.
export async function loadHomePageAssembly(
  searchParams?: HomePageSearchParams,
) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const operatorContext = parseOperatorContextFromCookies(cookieHeader);

  const homepage = await assembleHomePage({ searchParams, operatorContext });

  const reportData = homepage.reportResult.ok
    ? homepage.reportResult.data
    : homepage.reportResult.fallback;

  return {
    homepage,
    reportData,
    operatorContext,
  };
}
