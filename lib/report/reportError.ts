export type ReportDependencyFailureLog = {
  route: string;
  requestId: string;
  dependency: "treasury" | "macro" | "report";
  status: "degraded" | "failed";
  message: string;
  fallbackUsed: boolean;
  timestamp: string;
};

export const logReportDependencyFailure = (event: ReportDependencyFailureLog) => {
  console.error("report_dependency_failure", event);
};
