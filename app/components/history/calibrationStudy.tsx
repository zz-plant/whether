import { ReportSection } from "../reportSection";
import { JsonLdScript } from "../jsonLdScript";
import { ConfidenceRecordSection } from "./confidenceRecord";
import { PremiseOutcomeScatterChart } from "./premiseOutcomeScatterChart";
import { describePremiseAnswer } from "./calibrationQuestions";
import { buildCalibrationStudyStructuredData } from "../../../lib/seo/pageStructuredData";
import { loadPremiseTestBacktestModel } from "../../../lib/research/premiseBacktestModel";
import { confidenceCalibrationTotals } from "../../../lib/report/confidenceCalibration";
import { countRecord } from "../../../lib/report/trackRecord";
import { getTimeMachineRegimeSeries } from "../../../lib/timeMachine/timeMachineCache";
import { formatMonthYearShortFromValue } from "../../../lib/formatters";

/** Where the study starts on /history: the table's section. `/calibration` redirects here. */
export const CALIBRATION_STUDY_ANCHOR = "confidence-record";

/**
 * The calibration study, as sections of /history (2026-11-25).
 *
 * It had a URL of its own, /calibration, from 2026-09-17: it was a section of /trust, which
 * is about freshness and sources, and could not be linked or cited. History is where the
 * record is graded, and its "Has it been right?" tiles summarised this study and linked
 * away to it, so the study sits under them now and the old address redirects to its first
 * section. The Highwire `citation_*` tags went with the page: they describe a standalone
 * report, and /history is not one. The `ScholarlyArticle` and `Dataset` markup stays,
 * pointed at the section.
 *
 * The finding: the published room before a change understates how often conditions held
 * in every band, and across the two nearest bands it orders the outcome backwards. A
 * negative result about the site's own number, published rather than re-fitted.
 */
export function CalibrationStudy() {
  const totals = confidenceCalibrationTotals();
  /* The record's own counts (`countRecord`), the ones the rest of /history and /about
     print, so the study cannot say "six" while they say seven. */
  const record = countRecord(getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER));
  const since = record ? formatMonthYearShortFromValue(record.firstRecordDate) : "2012";
  const premiseModel = loadPremiseTestBacktestModel();
  const premiseQuestion = describePremiseAnswer(premiseModel);

  return (
    <>
      <JsonLdScript data={buildCalibrationStudyStructuredData({ totals, questions: [premiseQuestion] })} />

      <ConfidenceRecordSection
        description={`Checked across ${totals.months} month-to-month comparisons since 2012: how often conditions held at each distance from the change line.`}
      />

      {/* The question, asked as one, and its answer first (2026-11-25). */}
      <ReportSection id="premise-test" title={premiseQuestion.question} description={premiseQuestion.answer}>
        <PremiseOutcomeScatterChart model={premiseModel} className="max-w-xl" />
      </ReportSection>

      <ReportSection id="calibration-method" title="How the study was measured">
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
        <h3 className="mt-6 text-sm font-semibold text-slate-100">What it does not show</h3>
        <ul className="mt-2 space-y-2 text-base text-slate-300">
          {/* No count here: the "Has it been right?" tiles above print the changes in
              conditions, and a page prints each count once. */}
          <li>
            Too few changes in conditions since {since} to fit a probability to each band. A fitted curve would read about 97% every week and tell the bands apart not at all.
          </li>
          <li>
            Only the one-month horizon is tested; nothing here measures a quarter.
          </li>
          <li>
            One model over U.S. rates—evidence about this score, not forecasting generally.
          </li>
        </ul>
      </ReportSection>
    </>
  );
}
