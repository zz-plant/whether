import { NextResponse } from "next/server";
import { loadReportDataSafe, type ReportData, type ReportDataFallback } from "../report/reportData";

type CadenceRouteData = ReportData | ReportDataFallback;

type CadenceSummary = {
  copy: string;
  provenance: unknown;
  recordDateLabel: string | null;
};

export const buildCadenceRouteResponse = async <TSummary extends CadenceSummary>({
  route,
  buildSummary,
  buildExtraPayload,
}: {
  route: string;
  buildSummary: (reportData: CadenceRouteData) => TSummary;
  buildExtraPayload?: (
    input: { reportData: CadenceRouteData; summary: TSummary }
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
}) => {
  const reportResult = await loadReportDataSafe(undefined, { route });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const summary = buildSummary(reportData);
  const extraPayload = buildExtraPayload ? await buildExtraPayload({ reportData, summary }) : {};

  return NextResponse.json({
    summary,
    copy: summary.copy,
    provenance: summary.provenance,
    recordDateLabel: summary.recordDateLabel,
    generatedAt: new Date().toISOString(),
    version: "v1",
    degraded: !reportResult.ok,
    ...extraPayload,
  });
};
