import type { Metadata } from "next";

import { buildPageMetadata, organizationName } from "../../lib/seo";
import { publisherAuthor } from "../../lib/publisher";
import { buildCalibrationStudyStructuredData } from "../../lib/seo/pageStructuredData";
import {
  SecondaryPageHeader,
  SecondaryPageSection,
} from "../components/secondaryPageShell";
import { JsonLdScript } from "../components/jsonLdScript";
import { ConfidenceRecordSection } from "../components/history/confidenceRecord";
import { PremiseOutcomeScatterChart } from "../components/history/premiseOutcomeScatterChart";
import { loadPremiseTestBacktestModel } from "../../lib/research/premiseBacktestModel";
import { confidenceCalibrationTotals } from "../../lib/report/confidenceCalibration";
import { countRecord } from "../../lib/report/trackRecord";
import { getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";
import { formatMonthYearShortFromValue } from "../../lib/formatters";
import { SectionTabs } from "../components/sectionTabs";
import { ContentPageShell } from "../components/ui/contentPageShell";

export const runtime = "edge";

/**
 * The calibration study, on a URL of its own.
 *
 * It was a section inside `/trust`, which is a page about freshness and source
 * coverage — so the one piece of original research on the site had no address,
 * could not be linked to or cited, and was indexed only as part of a page about
 * something else.
 *
 * The finding is worth a URL on its own terms: the published confidence percent
 * understates in every band, and across the two least-confident bands it orders
 * the outcome backwards. That is a negative result about the site's own number,
 * measured against its own archive and published rather than quietly re-fitted,
 * which is a thing almost nobody in this category does.
 *
 * `/trust` keeps a pointer rather than a copy — two indexable URLs carrying the
 * same study would compete with each other.
 */
export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "How often the guidance held up",
    description:
      "How often the weekly guidance held, checked against every month since 2012, and how close conditions came to changing each time.",
    path: "/calibration",
    imageAlt: "How often the guidance held up",
    imageParams: { template: "method", eyebrow: "The record" },
  }),
  /* Google Scholar reads these Highwire Press tags, not schema.org: the `ScholarlyArticle` node
     reaches every other reader, and these reach Scholar. The date is the study's first
     publication at this address (2026-09-17); its figures update monthly on the same URL. */
  other: {
    citation_title: "How often the guidance held up",
    citation_author: publisherAuthor.name,
    citation_publication_date: "2026/09/17",
    citation_technical_report_institution: organizationName,
    citation_language: "en",
  },
};

export default function CalibrationPage() {
  const totals = confidenceCalibrationTotals();
  /* The record's own counts (`countRecord`), the ones /history and /about print, so
     this page cannot say "six" while they say seven. */
  const record = countRecord(getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER));
  const since = record ? formatMonthYearShortFromValue(record.firstRecordDate) : "2012";
  const premiseModel = loadPremiseTestBacktestModel();

  return (
    <ContentPageShell measure="wide">
      <JsonLdScript data={buildCalibrationStudyStructuredData({ totals })} />
      <SectionTabs currentPath="/calibration" />

      {/* No "The record" kicker (2026-10-09): the header's Record tab and the
          sub-tab row above already name the group, as the report pages dropped
          "Weekly brief" over their titles. */}
      <SecondaryPageHeader
        title="How often the guidance held up"
        description={`We checked the published room before a change against ${totals.months} month-to-month comparisons since 2012: how often conditions stayed put at each distance from the line where they change.`}
      />

      <ConfidenceRecordSection />

      {/* No description (2026-11-11): the chart's own caption and key say what it
          draws, over which quarters, and where the two groups split. */}
      <SecondaryPageSection title="What happened to venture fundraising when funding pressure was above 70">
        <PremiseOutcomeScatterChart model={premiseModel} className="max-w-xl" />
      </SecondaryPageSection>

      <SecondaryPageSection title="How it was measured">
        <ul className="space-y-2 text-base text-slate-300">
          <li>
            <span className="text-slate-100">Sample.</span> Every monthly reading in the archive
            that has a following month to compare against: {totals.months} of them.
            {record ? (
              <>
                {" "}The record holds {record.readings} readings, {since} to{" "}
                {formatMonthYearShortFromValue(record.latestRecordDate)}; the newest has no following month yet.
              </>
            ) : null}
          </li>
          <li>
            <span className="text-slate-100">Outcome.</span> Did conditions stay the same one month
            later? No other outcome is scored, and none is weighted.
          </li>
          <li>
            <span className="text-slate-100">Bands.</span> Distance to the nearest line where
            conditions change, in points of funding pressure, with a risk-appetite point converted the
            same way the room before a change converts it. The cut points were chosen before the outcomes
            were looked at.
          </li>
          {/* The sources, as the last line of the method (2026-11-11). They were a
              section of their own, beside a link to how the scores are computed that
              the sub-tab row above already carries. */}
          <li>
            <span className="text-slate-100">Sources.</span> Rates from the{" "}
            <a
              href="https://fred.stlouisfed.org/"
              className="underline decoration-slate-600 underline-offset-4 hover:text-slate-100"
            >
              St. Louis Fed (FRED) Treasury series
            </a>{" "}
            (DGS1MO, DGS3MO, DGS2, DGS10).
          </li>
        </ul>
      </SecondaryPageSection>

      {/* The limits alone (2026-11-11): a caption tying them to the decision not to
          re-fit restated the first limit, and a closing line about reading the room as
          a distance restated the study's own finding above. */}
      <SecondaryPageSection title="What it does not show">
        <ul className="space-y-2 text-base text-slate-300">
          <li>
            {record ? `${record.changes} ${record.changes === 1 ? "change" : "changes"} in conditions since ${since}` : "A handful of changes in conditions"} is not enough to estimate a probability per band. A
            curve fitted to that base rate would report about 97% every week and discriminate nothing. That is worse than a number that at least measures something real.
          </li>
          <li>
            One month is the only horizon tested. Nothing here says what a reading is worth over a
            quarter.
          </li>
          <li>
            The archive is one model over one country&rsquo;s rates. It is evidence
            about this number, not about forecasting scores generally.
          </li>
        </ul>
      </SecondaryPageSection>
    </ContentPageShell>
  );
}
