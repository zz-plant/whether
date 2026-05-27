import { cookies } from "next/headers";
import { assembleHomePage } from "./homePageAssembler";
import { buildAgentInterfaceResponse, isAgentCadence } from "../agentInterface";
import { isArtifactMode } from "../shareArtifacts";
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

  const [homepage, cadenceData] = await Promise.all([
    assembleHomePage({ searchParams, operatorContext }),
    activeCadence !== "weekly"
      ? buildAgentInterfaceResponse(activeCadence).catch(() => null)
      : Promise.resolve(null),
  ]);

  const initialArtifactMode = isArtifactMode(searchParams?.artifactMode)
    ? searchParams.artifactMode
    : undefined;

  const reportData = homepage.reportResult.ok
    ? homepage.reportResult.data
    : homepage.reportResult.fallback;

  const regimeHistory = getMonthlyRegimeHistory();

  const artifactPayload = await homepage.leadershipArtifactPayloadPromise.catch(() => null);

  return {
    homepage,
    cadenceData,
    activeCadence,
    initialArtifactMode,
    reportData,
    regimeHistory,
    artifactPayload,
    operatorContext,
  };
}
