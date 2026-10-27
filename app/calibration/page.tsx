import type { Metadata } from "next";

import { buildPageMetadata } from "../../lib/seo";
import { buildCalibrationStudyStructuredData } from "../../lib/seo/pageStructuredData";
import {
  SecondaryPageHeader,
  SecondaryPageSection,
} from "../components/secondaryPageShell";
import { JsonLdScript } from "../components/jsonLdScript";
import { ActionLink } from "../components/ui/actionLink";
import { ConfidenceRecordSection } from "../components/history/confidenceRecord";
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
export const metadata: Metadata = buildPageMetadata({
  title: "Margin calibration study",
  description:
    "Whether's margin measures distance from the line where conditions change. This study checks it against every month-end reading since 2012.",
  path: "/calibration",
  imageAlt: "Whether margin calibration study",
  imageParams: { template: "method", eyebrow: "The record" },
});

export default function CalibrationPage() {
  const totals = confidenceCalibrationTotals();
  /* The record's own counts (`countRecord`), the ones /history and /about print, so
     this page cannot say "six" while they say seven. */
  const record = countRecord(getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER));
  const since = record ? formatMonthYearShortFromValue(record.firstRecordDate) : "2012";

  return (
    <ContentPageShell measure="wide">
      <JsonLdScript data={buildCalibrationStudyStructuredData({ totals })} />
      <SectionTabs currentPath="/calibration" />

      {/* No "The record" kicker (2026-10-09): the header's Record tab and the
          sub-tab row above already name the group, as the report pages dropped
          "Weekly brief" over their titles. */}
      <SecondaryPageHeader
        title="Margin calibration study"
        description={`The published margin, checked against ${totals.months} month-to-month comparisons since 2012: how often conditions held at each distance from the line where they change.`}
      />

      <ConfidenceRecordSection />

      <SecondaryPageSection
        title="How it was measured"
        description="Which readings we counted, how we scored the outcome, and how the distance bands work."
      >
        <ul className="space-y-2 text-sm text-slate-300">
          <li>
            <span className="text-slate-100">Sample.</span> Every month-end reading in the archive
            that has a following month to compare against — {totals.months} of them.
            {record ? (
              <>
                {" "}The record holds {record.readings} readings, {since} to{" "}
                {formatMonthYearShortFromValue(record.latestRecordDate)}; the newest has no following month yet.
              </>
            ) : null}
          </li>
          <li>
            <span className="text-slate-100">Outcome.</span> Whether conditions were the same one month
            later. No other outcome is scored, and none is weighted.
          </li>
          <li>
            <span className="text-slate-100">Bands.</span> Distance to the nearest line where
            conditions change, in points of funding pressure, with a risk-appetite point converted the
            same way the published margin converts it. The cut points were chosen before the outcomes
            were looked at.
          </li>
        </ul>
      </SecondaryPageSection>

      <SecondaryPageSection
        title="What it does not show"
        description="The limits are the reason the number was not simply re-fitted."
      >
        <ul className="space-y-2 text-sm text-slate-300">
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
        <p className="mt-4 text-sm text-slate-300">
          So the margin keeps measuring distance, and distance is an honest thing to measure. This
          record is published beside it rather than folded into it.
        </p>
      </SecondaryPageSection>

      <SecondaryPageSection title="Sources">
        <ul className="space-y-2 text-sm text-slate-300">
          <li>
            Rates:{" "}
            <a
              href="https://fred.stlouisfed.org/"
              className="underline decoration-slate-600 underline-offset-4 hover:text-slate-100"
            >
              St. Louis Fed (FRED) Treasury series
            </a>{" "}
            (DGS1MO, DGS3MO, DGS2, DGS10).
          </li>
          <li>
            Archive and method:{" "}
            <ActionLink href="/trust" variant="inline">
              how the scores are computed
            </ActionLink>
            .
          </li>
        </ul>
      </SecondaryPageSection>
    </ContentPageShell>
  );
}
