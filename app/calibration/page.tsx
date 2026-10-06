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
import { CalibrationCurveGlyph } from "../components/illustrations/CalibrationCurveGlyph";
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
  title: "Confidence score calibration study",
  description:
    "Whether's confidence percent, checked against every month-end reading since 2012: how often conditions held at each distance from the line where they change.",
  path: "/calibration",
  imageAlt: "Whether confidence calibration study",
  imageParams: { template: "method", eyebrow: "The record" },
});

export default function CalibrationPage() {
  const totals = confidenceCalibrationTotals();

  return (
    <ContentPageShell measure="wide">
      <JsonLdScript data={buildCalibrationStudyStructuredData({ totals })} />

      <SecondaryPageHeader
        eyebrow="The record"
        title="Confidence score calibration study"
        description={`The published confidence percent, checked against ${totals.months} month-end readings from 2012 to 2026: how often conditions held at each distance from the line where they change.`}
        aside={<CalibrationCurveGlyph size={64} />}
      />

      <ConfidenceRecordSection />

      <SecondaryPageSection
        title="How it was measured"
        description="What was counted, and what counted as a hold."
      >
        <ul className="space-y-2 text-sm text-slate-300">
          <li>
            <span className="text-slate-100">Sample.</span> Every month-end reading in the archive
            that has a following month to compare against — {totals.months} of them.
          </li>
          <li>
            <span className="text-slate-100">Outcome.</span> Whether conditions were the same one month
            later. No other outcome is scored, and none is weighted.
          </li>
          <li>
            <span className="text-slate-100">Bands.</span> Distance to the nearest line where
            conditions change, in points of funding pressure, with a risk-appetite point converted the
            same way the published confidence converts it. The cut points were chosen before the outcomes
            were looked at — they are the distances at which the published label changes.
          </li>
        </ul>
      </SecondaryPageSection>

      <SecondaryPageSection
        title="What it does not show"
        description="The limits are the reason the number was not simply re-fitted."
      >
        <ul className="space-y-2 text-sm text-slate-300">
          <li>
            Six changes in conditions in fourteen years is not enough to estimate a probability per band. A
            curve fitted to that base rate would report about 97% every week and discriminate
            nothing, which is worse than a number that at least measures something real.
          </li>
          <li>
            One month is the only horizon tested. Nothing here says what a reading is worth over a
            quarter.
          </li>
          <li>
            The archive is one model over one country&rsquo;s rates. It is evidence
            about this number, not about confidence scores generally.
          </li>
        </ul>
        <p className="mt-4 text-sm text-slate-300">
          So the percent keeps measuring distance, which is an honest thing to measure, and this
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
