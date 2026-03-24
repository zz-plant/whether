import { loadWeeklyBriefSnapshot } from "../report/weeklyBriefSnapshot";
import type { ReportSearchParams } from "../report/reportData";

export const loadCliRouteContext = async ({
  route,
  searchParams,
}: {
  route: string;
  searchParams?: ReportSearchParams;
}) => {
  const { reportData, degraded, snapshot } = await loadWeeklyBriefSnapshot(searchParams, { route });
  if (!snapshot.postureState) {
    throw new Error(`CLI route ${route} could not build posture state.`);
  }

  return {
    reportData,
    degraded,
    postureState: snapshot.postureState,
    snapshot,
  };
};
