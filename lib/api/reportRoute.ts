import { loadReportDataSafe, type ReportData, type ReportDataFallback, type ReportSearchParams } from "../report/reportData";

export type ReportRouteContext = {
  reportData: ReportData | ReportDataFallback;
  degraded: boolean;
};

export const loadReportRouteContext = async ({
  route,
  searchParams,
}: {
  route: string;
  searchParams?: ReportSearchParams;
}): Promise<ReportRouteContext> => {
  const reportResult = await loadReportDataSafe(searchParams, { route });

  return {
    reportData: reportResult.ok ? reportResult.data : reportResult.fallback,
    degraded: !reportResult.ok,
  };
};
