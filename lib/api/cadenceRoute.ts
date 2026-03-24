import { NextResponse } from "next/server";
import type { ReportData, ReportDataFallback } from "../report/reportData";
import { loadReportRouteContext } from "./reportRoute";

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
  const { reportData, degraded } = await loadReportRouteContext({ route });
  const summary = buildSummary(reportData);
  const extraPayload = buildExtraPayload ? await buildExtraPayload({ reportData, summary }) : {};

  return NextResponse.json({
    summary,
    copy: summary.copy,
    provenance: summary.provenance,
    recordDateLabel: summary.recordDateLabel,
    generatedAt: new Date().toISOString(),
    version: "v1",
    degraded,
    ...extraPayload,
  });
};
