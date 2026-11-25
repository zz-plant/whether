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
import { AdviceStudyTeaser } from "../components/history/AdviceStudyTeaser";
import { PremiseOutcomeScatterChart } from "../components/history/premiseOutcomeScatterChart";
import { loadPremiseTestBacktestModel } from "../../lib/research/premiseBacktestModel";
import { confidenceCalibrationTotals } from "../../lib/report/confidenceCalibration";
import { countRecord } from "../../lib/report/trackRecord";
import { getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";
import { formatMonthYearShortFromValue } from "../../lib/formatters";
import { SectionTabs } from "../components/sectionTabs";
import { ContentPageShell } from "../components/ui/contentPageShell";
import { describePremiseAnswer } from "./calibrationQuestions";

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
    /* The page's question answered in spoken sentences (2026-11-25); it listed what the study
       checks. */
    description:
      "Most months: conditions stayed the same into the next month at every distance from a change, and more often than the percent published for that distance. Checked against every month-end since 2012.",
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
  /* The premise section's question and its answer, from the medians the chart's key prints. */
  const premiseQuestion = describePremiseAnswer(premiseModel);

  return (
    <ContentPageShell measure="wide">
      <JsonLdScript data={buildCalibrationStudyStructuredData({ totals, questions: [premiseQuestion] })} />
      <SectionTabs currentPath="/calibration" />

      {/* No "The record" kicker (2026-10-09): the header's Record tab and the
          sub-tab row above already name the group, as the report pages dropped
          "Weekly brief" over their titles. */}
      <SecondaryPageHeader
        title="How often the guidance held up"
        description={`Checked across ${totals.months} month-to-month comparisons since 2012: how often conditions held at each distance from the change line.`}
      />

      <ConfidenceRecordSection />

      {/* The question, asked as one, and its answer first (2026-11-25). There was no
          description from 2026-11-11, when it said what the chart's caption and key say; the
          answer says what they show. */}
      <SecondaryPageSection title={premiseQuestion.question} description={premiseQuestion.answer}>
        <PremiseOutcomeScatterChart model={premiseModel} className="max-w-xl" />
      </SecondaryPageSection>

      <SecondaryPageSection title="How it was measured">
        <ul className="space-y-2 text-base text-slate-300">
          <li>
            <span className="text-slate-100">Sample.</span> {totals.months} monthly readings with a following month to compare.
            {record ? (
              <>
                {" "}The record holds {record.readings} readings, {since} to {formatMonthYearShortFromValue(record.latestRecordDate)}.
              </>
            ) : null}
          </li>
          <li>
            <span className="text-slate-100">Outcome.</span> Whether conditions stayed the same one month later. Every month counts the same, and nothing else is scored.
          </li>
          <li>
            <span className="text-slate-100">Bands.</span> Pre-set distance bands from the nearest change line (in funding-pressure points, converting risk-appetite points the same way).
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
            {record ? `${record.changes} ${record.changes === 1 ? "change" : "changes"} in conditions since ${since}` : "A handful of changes in conditions"} is too few to fit a probability to each band. A fitted curve would read about 97% every week and tell the bands apart not at all.
          </li>
          <li>
            Only the one-month horizon is tested; nothing here measures a quarter.
          </li>
          <li>
            One model over U.S. rates—evidence about this score, not forecasting generally.
          </li>
        </ul>
      </SecondaryPageSection>

      <AdviceStudyTeaser />
    </ContentPageShell>
  );
}
