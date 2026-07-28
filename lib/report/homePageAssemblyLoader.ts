import { cookies } from "next/headers";
import { assembleHomePage } from "./homePageAssembler";
import { buildAgentInterfaceResponse, isAgentCadence } from "../agentInterface";
import { parseOperatorContextFromCookies } from "./operatorContext";
import { getMonthlyRegimeHistory } from "../summary/monthlyRegimeHistory";
import type { HomePageSearchParams } from "./homeMetadata";

export async function loadHomePageAssembly(
  searchParams?: HomePageSearchParams,
) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const operatorContext = parseOperatorContextFromCookies(cookieHeader);

  const activeCadence = searchParams?.cadence && isAgentCadence(searchParams.cadence)
    ? searchParams.cadence
    : "weekly";

  const homepage = await assembleHomePage({ searchParams, operatorContext });

  const cadenceData = activeCadence !== "weekly"
    ? await buildAgentInterfaceResponse(activeCadence).catch(() => null)
    : null;

  const reportData = homepage.reportResult.ok
    ? homepage.reportResult.data
    : homepage.reportResult.fallback;

  const regimeHistory = getMonthlyRegimeHistory();

  return {
    homepage,
    cadenceData,
    activeCadence,
    reportData,
    regimeHistory,
    operatorContext,
  };
}
