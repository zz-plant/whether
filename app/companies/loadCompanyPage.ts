import { cache } from "react";
import { pilotPeerGrowth, readCompanyRecord } from "../../lib/companies/companyFilingStore";
import type { CompanyEntry } from "../../lib/companies/companyRegistry";
import { buildCompanySituation } from "../../lib/report/companySituation";
import { getRegimePublicLabel, getRegimeWeatherRationale } from "../../lib/regimePresentation";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { describeSavedCopyBanner } from "../../lib/report/trustStatus";
import { isCallStaleForIndexing } from "../../lib/seo/freshnessIndexation";
import type { WeekConditions } from "./companyPageSections";

const loadWeek = cache(() => loadWeeklyBriefSnapshot(undefined, { route: "/companies" }));

/** What every company page reads: the week, once per request, and this company's stored figures. */
export const loadCompanyPage = async (company: CompanyEntry) => {
  const [week, figures] = await Promise.all([loadWeek(), readCompanyRecord(company)]);
  const { reportData, degraded, homeBriefModel, weeklyCall } = week.snapshot;
  const regime = reportData.assessment.regime;
  const stale = isCallStaleForIndexing({
    recordDateIso: reportData.treasury.record_date,
    isFallbackSnapshot: degraded || !reportData.treasury.isLive,
  });
  const conditions: WeekConditions = {
    label: getRegimePublicLabel(regime),
    rationale: getRegimeWeatherRationale(regime),
    guidance: weeklyCall.currentCall,
    recordDateLabel: reportData.recordDateLabel,
    /* A robots tag protects search results, not a reader who follows a link. */
    ...(stale
      ? { savedCopyNotice: describeSavedCopyBanner({ recordDate: reportData.treasury.record_date, now: new Date(), guidanceHeld: false }) }
      : {}),
  };
  const situation = figures ? buildCompanySituation(company, figures, pilotPeerGrowth()) : null;
  return {
    conditions,
    regime,
    situation,
    rules: homeBriefModel.decisionRules,
    /* A page with no current filing or no current call is one more name on a template. */
    indexable: Boolean(situation?.current) && !stale,
  };
};
