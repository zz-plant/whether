import type { SignalsPageModel, SignalsPageSearchParams } from "../evidencePageModel";
import type { FocusTab } from "../evidenceQueryState";
import { SignalsCallLinesSection, SignalsCallSection, SignalsWhatChangedSection } from "./evidenceReaderSections";
import { SignalsInstrumentsSection } from "./evidenceInstruments";

/**
 * The evidence page's four sections, in the order a reader answers their
 * questions: what the call is, what changed, what would change it, and the
 * instruments to check the method with. Kept apart from `page.tsx` so a test
 * can render the sections from a fixture model and assert the order without
 * the shell, the route tracker or a data load.
 *
 * Returned as a fragment on purpose: `ReportShell` wraps each child in a
 * divided row, so the sections have to arrive as siblings.
 */
export const SignalsEvidenceBody = ({
  model,
  focusLabelByTab,
  tightnessTrend,
  riskAppetiteTrend,
  searchParams,
}: {
  model: SignalsPageModel;
  focusLabelByTab: Record<FocusTab, string>;
  tightnessTrend: Array<{ label: string; value: number }>;
  riskAppetiteTrend: Array<{ label: string; value: number }>;
  searchParams?: SignalsPageSearchParams;
}) => (
  <>
    <SignalsCallSection
      callLine={model.actionNowShort ?? "Keep this week's guidance while the scores stay inside their lines."}
      trustStrip={model.trustStrip}
    />
    <SignalsWhatChangedSection
      rows={model.changedSignalRows}
      activeFocus={model.activeFocus}
      focusLabelByTab={focusLabelByTab}
      focusInstruments={model.focusInstruments}
      searchParams={searchParams}
      basis={model.basis}
    />
    <SignalsCallLinesSection
      ladders={model.callLineLadders}
      triggerCondition={model.triggerCondition}
      reversalCondition={model.reversalCondition}
      showMicroDecisionRows={model.showMicroDecisionRows}
    />
    <SignalsInstrumentsSection
      assessment={model.assessment}
      treasury={model.treasury}
      yieldCurveSeries={model.yieldCurveSeries}
      tightnessTrend={tightnessTrend}
      riskAppetiteTrend={riskAppetiteTrend}
      regimeSeries={model.regimeSeries}
      selectedYear={model.selectedYear}
      selectedMonth={model.selectedMonth}
      isHistorical={Boolean(model.historicalSelection)}
      cacheCoverage={model.cacheCoverage}
      cacheMonthsByYear={model.cacheMonthsByYear}
      invalidHistoricalSelection={model.invalidHistoricalSelection}
      monthPickerOpen={model.monthPickerOpen}
      searchParams={searchParams}
    />
  </>
);
