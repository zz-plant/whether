import { cookies } from "next/headers";
import { assembleHomePage } from "./homePageAssembler";
import type { HomePageSearchParams } from "./homeMetadata";
import { parseOperatorContextFromCookies } from "./operatorContext";

// Cadence data does not load here either — but it no longer needs to. The non-weekly
// lead is derived from this assembly's own `assessment` and provenance
// (`lib/report/cadenceCallModel.ts`), so it costs no extra fetch and renders under
// fallback. It used to await the whole agent-interface payload behind Suspense, whose
// failure was swallowed, which is why every cadence tab served the same page.
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
