import type { ReportData } from "../reportData";
import type { buildWeeklyDecisionCardViewModel } from "../homeBriefModel";
import type { loadHomePageReportData } from "../homePageData";
import type { WeeklyCallContract } from "../weeklyCallContract";

export type HomePageAssembly = {
  reportShell: {
    regime: ReportData["assessment"]["regime"];
    statusLabel: string;
    recordDateLabel: string;
    fetchedAtLabel: string;
    treasurySource: ReportData["treasury"]["source"];
    trustStatusLabel: string;
    trustStatusDetail: string;
    trustStatusAction: string;
    degradedSourceRows: Array<{
      sourceName: string;
      modeLabel: string;
      freshnessStatus: string;
    }>;
    provenance: ReportData["treasuryProvenance"];
    showOfflineBadge: boolean;
    structuredData: unknown;
    historicalBanner: {
      banner: string;
      liveHref: string;
      previousHref?: string;
      timeMachineHref: string;
    } | null;
  };
  reportResult: Awaited<ReturnType<typeof loadHomePageReportData>>;
  weeklyCall: WeeklyCallContract;
  weeklyDecisionCardModel: ReturnType<typeof buildWeeklyDecisionCardViewModel>;
};
