import Link from "next/link";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import type { TreasuryData } from "../../../lib/types";
import type { TimeMachineRegimeEntry } from "../../../lib/timeMachine/timeMachineCache";
import { getHistoricalAnalogPlaybook } from "../../../lib/analogPlaybook";
import { UrlDetails } from "../../components/ui/urlDetails";
import { isDisclosureOpenInParams } from "../../components/ui/disclosureUrlState";
import { SignalVisualizationSuite } from "./signalVisualizationSuite";
import { SignalInversionPreview } from "./signalInversionPreview";
import { SignalSparklineStrip } from "./signalSparklineStrip";
import { AdvancedThresholdsSection } from "./advancedThresholdsSection";
import { TimeMachinePanel } from "./timeMachinePanel";
import { RegimeTimelinePanel } from "./regimeTimelinePanel";
import { FossilRecordSection } from "./fossilRecordSection";
import type { SignalsPageSearchParams } from "../evidencePageModel";
import { regimeSignalLabel } from "../../../lib/report/signalTranslations";
import { buildRatesTrail, monthOfLabel } from "../../../lib/report/evidenceInstrumentSummaries";
import type { InstrumentQuestions, SignalsQuestion } from "../signalsQuestions";
import { InstrumentQuestion } from "./instrumentQuestion";
import { ConditionCellsPreview, RatesSparklinePreview, ScoreSparklinesPreview } from "./instrumentPreviews";
import { MonthReadoutStrip } from "./monthReadoutStrip";
import { columnMonthLabel, columnYearLabel, instrumentMonthHref } from "./instrumentMonthHref";
import { formatMonthLabel } from "../../../lib/timeMachine/monthFormatting";
import { THRESHOLD_PARAM_KEYS } from "../../../lib/thresholds";
import { hasInputChoiceParams, type InputChoiceModel } from "../../../lib/report/countedInputs";

/**
 * The fourth section of the evidence page: the instruments. Charts, the line
 * editor, the month picker, the nearest reference cycle and the fossil record
 * are for the reader who wants to check the method, so each sits behind one
 * disclosure titled with the question it answers, and all of them start
 * closed. The charts used to open by default, which put about 2,000px of
 * charts between "What would change this guidance" and the other five
 * instruments; a reader looking for an earlier month scrolled past all of it.
 *
 * Until 2026-09-22 these were gated behind a "Reading depth" radio and then a
 * second "Show advanced filters" link, so the month picker was three clicks and
 * two page loads from the call it explains. A link written as
 * `/signals?advanced=1#time-machine` still opens it: `advanced` is the query
 * key the picker's disclosure carries.
 */

type YieldCurvePoint = {
  year: number;
  month: number;
  recordDate: string;
  oneMonth: number | null;
  threeMonth: number | null;
  twoYear: number | null;
  tenYear: number | null;
  spread10Y2Y: number | null;
  spread2Y3M: number | null;
};

type TrendPoint = { label: string; value: number };

/* No space-y here: Tailwind's space-y puts a bottom margin on every child but
   the last, and the summary is one, so a closed row came out 13px taller than
   its neighbours. Each body spaces itself. */
/* No side inset on a phone, like the section title above the list
   (`px-5 max-sm:px-0`): the rows are unboxed, so their questions align with
   the page column, and an opened chart keeps the full width. */
const DISCLOSURE_CLASS = "weather-auto-chevron weather-panel px-0 py-5";
const SUMMARY_CLASS = "cursor-pointer select-none text-base font-semibold text-slate-100";

/* A score carries its scale ("72/100"); a bare "72" beside "3.50%" read as the same kind of number. */
const formatCoordinate = (value: number, unit: "%" | "pts") =>
  unit === "%" ? `${value.toFixed(2)}%` : `${value.toFixed(0)}/100`;

/**
 * The nearest of four hand-picked reference cycles, by four coordinates. This
 * used to headline a "90% Match" — a number clamped into 65–96 from a distance,
 * on the page whose job is to be the proof behind the call. The coordinates are
 * the evidence, so they are what gets shown.
 */
const AnalogPatternDisclosure = ({
  assessment,
  open,
  question,
}: {
  assessment: Pick<RegimeAssessment, "scores">;
  open: boolean;
  /** The question and its answer, from the page model (`buildInstrumentQuestions`). */
  question: SignalsQuestion;
}) => {
  const analog = getHistoricalAnalogPlaybook(assessment);
  return (
    <UrlDetails
      id="analog-pattern"
      queryKey="analog"
      initialOpen={open}
      className={DISCLOSURE_CLASS}
      summaryClassName={SUMMARY_CLASS}
      summary={
        <InstrumentQuestion question={question.question} answer={question.answer} />
      }
    >
      <div className="space-y-4">
        <p className="text-fluid-sm text-slate-400">
          Closest of {analog.referenceCycleCount} reference cycles on the four readings below.
          A resemblance in the inputs, not a forecast of the outcome.
        </p>
        {/* Without explicit column widths the label column absorbs every pixel
            of slack, so on a wide panel the two numeric columns end up jammed
            against the right edge. 50/25/25 keeps the pairs readable across
            the row. */}
        <table className="w-full max-w-2xl table-fixed border-collapse text-left text-fluid-sm">
          <caption className="sr-only">Match coordinates, reference cycle against this week</caption>
          <colgroup>
            <col className="w-1/2" />
            <col className="w-1/4" />
            <col className="w-1/4" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-800/80 text-slate-400">
              <th scope="col" className="py-1.5 pr-3 font-medium">Reading</th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">{analog.analogPeriod}</th>
              <th scope="col" className="py-1.5 text-right font-medium">This week</th>
            </tr>
          </thead>
          <tbody>
            {analog.matchBasis.map((item) => (
              <tr key={item.key} className="border-b border-slate-800/40 last:border-0">
                <td className="py-1.5 pr-3 text-slate-300">{item.label}</td>
                <td className="py-1.5 pr-3 text-right font-mono text-slate-400">{formatCoordinate(item.historical, item.unit)}</td>
                <td className="py-1.5 text-right font-mono text-slate-100">{formatCoordinate(item.live, item.unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="weather-switch gap-3 border-t border-slate-800 pt-4 [--col-min:12rem]">
          {[
            { label: "Common mistake then", value: analog.consensusTrap },
            { label: "What held up then", value: analog.winningMove },
            { label: "What marked the turn", value: analog.reversalMarker },
          ].map((cell) => (
            <div key={cell.label}>
              <dt className="type-eyebrow">{cell.label}</dt>
              <dd className="mt-1 text-fluid-sm leading-relaxed text-slate-200">{cell.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-fluid-nano text-slate-500">
          Cycle notes are editorial summaries of that period&apos;s public record, not a measured sample of companies.{" "}
          <Link href="/history" className="font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
            Every month-end since 2012, on History
          </Link>
        </p>
      </div>
    </UrlDetails>
  );
};

export const SignalsInstrumentsSection = ({
  assessment,
  treasury,
  yieldCurveSeries,
  tightnessTrend,
  riskAppetiteTrend,
  regimeSeries,
  selectedYear,
  selectedMonth,
  isHistorical,
  cacheCoverage,
  cacheMonthsByYear,
  invalidHistoricalSelection,
  monthPickerOpen,
  inputChoice = null,
  questions,
  searchParams,
}: {
  assessment: RegimeAssessment;
  treasury: TreasuryData;
  yieldCurveSeries: YieldCurvePoint[];
  tightnessTrend: TrendPoint[];
  riskAppetiteTrend: TrendPoint[];
  regimeSeries: TimeMachineRegimeEntry[];
  selectedYear: number;
  selectedMonth: number;
  isHistorical: boolean;
  cacheCoverage: { earliest: string | null; latest: string | null };
  cacheMonthsByYear: Record<number, number[]>;
  invalidHistoricalSelection: boolean;
  monthPickerOpen: boolean;
  /** Which inputs count, for the line settings (`buildInputChoiceModel`); null when the reading offers no choice. */
  inputChoice?: InputChoiceModel | null;
  /** Each closed question and its answer (`buildInstrumentQuestions`), the entries the page's markup carries too. */
  questions: InstrumentQuestions;
  searchParams?: SignalsPageSearchParams;
}) => {
  /* Each closed question carries its answer (§XII), from the values the panel
     under it draws: this week's rates beside the month-end archive the rate
     charts plot, the two series the score cells print, and the runs the
     month-by-month timeline counts. The page model builds the words, so the
     markup reads the same ones. */
  const ratesInputs = {
    current: { recordDate: treasury.record_date, oneMonth: treasury.yields.oneMonth },
    series: yieldCurveSeries,
  };
  /* The points the rates answer quotes its last two of: the sparkline beside it and the month row in the panel draw them. */
  const ratesTrail = buildRatesTrail(ratesInputs);
  const scoreSeries = [
    { key: "tightness", label: regimeSignalLabel.tightness, points: tightnessTrend },
    { key: "riskAppetite", label: regimeSignalLabel.riskAppetite, points: riskAppetiteTrend, increaseIsPositive: true },
  ];
  const ratesMonths = (ratesTrail ?? []).flatMap((point) => {
    const reading = point.isCurrent ? undefined : yieldCurveSeries.find((entry) => entry.recordDate === point.recordDate);
    return reading ? [{ ...reading, label: formatMonthLabel(reading.year, reading.month) }] : [];
  });
  const ratesMonthHref = instrumentMonthHref({ searchParams, panelKey: "rates", anchor: "signal-diagnostics" });
  const trendsMonthHref = instrumentMonthHref({ searchParams, panelKey: "trends", anchor: "trends" });
  const percent = (value: number | null) => (typeof value === "number" ? `${value.toFixed(2)}%` : "n/a");
  /* The line settings open when the URL names lines or inputs: a shared link opens on what the
     sender set. Decided here, from the request, so the server and the browser agree. */
  const linesOpen =
    Object.values(THRESHOLD_PARAM_KEYS).some((key) => typeof searchParams?.[key] === "string") || hasInputChoiceParams(searchParams);
  return (
  /* Ruled off from "What would change this guidance" by the report rows' own divider.
     It drew a second rule 24px under that one, and kept the 20px inset the report
     sections dropped, so its title sat right of every title above it (2026-11-10). */
  <section id="instruments" aria-labelledby="instruments-heading" className="space-y-6">
    <h2 id="instruments-heading" className="type-section">
      Charts, past months and checks
    </h2>

    {/* One list, one rule between items. They used to be a disclosure, a heading
        block, two bare disclosure rows and a section with its own boxed toggle,
        so nothing said they were the same kind of thing or where one ended. A
        box each would put the charts' own cards three frames deep (§XIII). */}
    <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
      {/* Each opened instrument writes its own query key (2026-10-27), as the month
          picker and the fossil record already did: a link to "the rates chart open"
          sent the recipient a page of seven closed questions. */}
      <UrlDetails
        id="signal-diagnostics"
        queryKey="rates"
        initialOpen={isDisclosureOpenInParams(searchParams, "rates")}
        className={DISCLOSURE_CLASS}
        summaryClassName={SUMMARY_CLASS}
        summary={
          <InstrumentQuestion
            question={questions.rates.question}
            answer={questions.rates.answer}
            preview={ratesTrail ? <RatesSparklinePreview trail={ratesTrail} /> : null}
          />
        }
      >
        {/* The month-ends the line beside the question draws, each one open. */}
        {ratesMonths.length > 0 ? (
          <div className="mb-4">
            <MonthReadoutStrip
              label={`Rates at each month-end, ${ratesMonths[0]?.label ?? ""} to ${ratesMonths.at(-1)?.label ?? ""}`}
              caption="The month-ends the line beside the question draws. Each shows its four rates and opens the guidance as it read then."
              months={ratesMonths.map((reading, index) => ({
                key: reading.recordDate,
                label: reading.label,
                shortLabel: columnMonthLabel(reading.year, reading.month),
                yearLabel: columnYearLabel(reading.year, reading.month, index),
                readout: `1-month ${percent(reading.oneMonth)}, 3-month ${percent(reading.threeMonth)}, 2-year ${percent(reading.twoYear)}, 10-year ${percent(reading.tenYear)}`,
                href: ratesMonthHref(reading),
              }))}
            />
          </div>
        ) : null}
        <SignalVisualizationSuite treasury={treasury} yieldCurveSeries={yieldCurveSeries} />
      </UrlDetails>

      <SignalInversionPreview
        yieldCurveSeries={yieldCurveSeries}
        className={DISCLOSURE_CLASS}
        summaryClassName={SUMMARY_CLASS}
        open={isDisclosureOpenInParams(searchParams, "curve")}
        monthHref={instrumentMonthHref({ searchParams, panelKey: "curve", anchor: "curve-context" })}
        question={questions.curve}
      />

      <UrlDetails
        id="trends"
        queryKey="trends"
        initialOpen={isDisclosureOpenInParams(searchParams, "trends")}
        className={DISCLOSURE_CLASS}
        summaryClassName={SUMMARY_CLASS}
        summary={
          <InstrumentQuestion
            question={questions.trends.question}
            answer={questions.trends.answer}
            preview={<ScoreSparklinesPreview series={scoreSeries} />}
          />
        }
      >
        <div className="space-y-4">
          {/* The table above publishes *this week's* reading and this series is
              the month-end archive, so the two disagree by design — for the same
              two named signals. Each cell stamps its own period; this line says
              what the block is, once. */}
          <p className="text-fluid-sm text-slate-400">
            Month-end readings from the archive, so the latest figure here is the last
            completed month rather than this week&rsquo;s score above.
          </p>
          <SignalSparklineStrip series={scoreSeries} />
          {/* The same points, a month at a time: the series carry their months as
              labels, which name the month each one opens. */}
          <MonthReadoutStrip
            label={`Month-end scores, ${tightnessTrend[0]?.label ?? ""} to ${tightnessTrend.at(-1)?.label ?? ""}`}
            caption="Each month-end shows its two scores and opens the guidance as it read then."
            months={tightnessTrend.map((point, index) => {
              const month = monthOfLabel(point.label);
              const riskAppetite = riskAppetiteTrend.find((candidate) => candidate.label === point.label);
              return {
                key: point.label,
                label: point.label,
                shortLabel: month ? columnMonthLabel(month.year, month.month) : point.label,
                yearLabel: month ? columnYearLabel(month.year, month.month, index) : null,
                readout: `${regimeSignalLabel.tightness} ${Math.round(point.value)}${
                  riskAppetite ? `, ${regimeSignalLabel.riskAppetite.toLowerCase()} ${Math.round(riskAppetite.value)}` : ""
                }`,
                href: month ? trendsMonthHref(month) : null,
              };
            })}
          />
        </div>
      </UrlDetails>

      <AdvancedThresholdsSection
        currentThresholds={assessment.thresholds}
        defaultOpen={linesOpen}
        question={questions.lines.question}
        answer={questions.lines.answer ?? ""}
        inputChoice={inputChoice}
      />

      <UrlDetails
        id="past-months"
        queryKey="advanced"
        initialOpen={monthPickerOpen}
        className={DISCLOSURE_CLASS}
        summaryClassName={SUMMARY_CLASS}
        summary={
          <InstrumentQuestion
            question={questions.pastMonths.question}
            answer={questions.pastMonths.answer}
            preview={<ConditionCellsPreview series={regimeSeries} />}
          />
        }
      >
        <TimeMachinePanel
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          isHistorical={isHistorical}
          latestRecordDate={treasury.record_date}
          cacheCoverage={cacheCoverage}
          monthsByYear={cacheMonthsByYear}
          invalidSelection={invalidHistoricalSelection}
          historicalRegime={isHistorical ? assessment.regime : null}
          historicalSummary={isHistorical ? assessment.description : null}
        />
        <RegimeTimelinePanel
          series={regimeSeries}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          searchParams={searchParams}
        />
      </UrlDetails>

      <AnalogPatternDisclosure
        assessment={assessment}
        open={isDisclosureOpenInParams(searchParams, "analog")}
        question={questions.analog}
      />

      <FossilRecordSection
        regime={assessment.regime}
        open={searchParams?.fossil === "1" || searchParams?.fossil === "open"}
        className={DISCLOSURE_CLASS}
        summaryClassName={SUMMARY_CLASS}
        question={questions.fossil}
      />
    </div>
  </section>
  );
};
