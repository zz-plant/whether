import Link from "next/link";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import type { TreasuryData } from "../../../lib/types";
import type { TimeMachineRegimeEntry } from "../../../lib/timeMachine/timeMachineCache";
import { getHistoricalAnalogPlaybook } from "../../../lib/analogPlaybook";
import { UrlDetails } from "../../components/ui/urlDetails";
import { SignalVisualizationSuite } from "./signalVisualizationSuite";
import { SignalInversionPreview } from "./signalInversionPreview";
import { SignalSparklineStrip } from "./signalSparklineStrip";
import { AdvancedThresholdsSection } from "./advancedThresholdsSection";
import { TimeMachinePanel } from "./timeMachinePanel";
import { RegimeTimelinePanel } from "./regimeTimelinePanel";
import { FossilRecordSection } from "./fossilRecordSection";
import type { SignalsPageSearchParams } from "../evidencePageModel";

/**
 * The fourth section of the evidence page: the instruments. Charts, the line
 * editor, the month picker, the nearest reference cycle and the fossil record
 * are for the reader who wants to check the method, so each sits behind one
 * disclosure and the page reads to its end without them. The charts open by
 * default; they are the evidence the section is named for.
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
  curveSignal: number | null;
};

type TrendPoint = { label: string; value: number };

const SUMMARY_CLASS = "cursor-pointer select-none text-base font-semibold text-slate-100";

const formatCoordinate = (value: number, unit: "%" | "pts") =>
  unit === "%" ? `${value.toFixed(2)}%` : value.toFixed(0);

/**
 * The nearest of four hand-picked reference cycles, by four coordinates. This
 * used to headline a "90% Match" — a number clamped into 65–96 from a distance,
 * on the page whose job is to be the proof behind the call. The coordinates are
 * the evidence, so they are what gets shown.
 */
const AnalogPatternDisclosure = ({ assessment }: { assessment: Pick<RegimeAssessment, "scores"> }) => {
  const analog = getHistoricalAnalogPlaybook(assessment);
  return (
    <details id="analog-pattern" className="weather-auto-chevron weather-panel space-y-4 p-5">
      <summary className={SUMMARY_CLASS}>
        Nearest reference cycle · {analog.analogPeriod} · {analog.regimeType}
      </summary>
      <p className="text-fluid-xs text-slate-400">
        Closest of {analog.referenceCycleCount} reference cycles on the four coordinates below.
        A resemblance in the inputs, not a forecast of the outcome.
      </p>
      {/* Without explicit column widths the label column absorbs every pixel
          of slack, so on a wide panel the two numeric columns end up jammed
          against the right edge. 50/25/25 keeps the pairs readable across
          the row. */}
      <table className="w-full max-w-2xl table-fixed border-collapse text-left text-fluid-xs">
        <caption className="sr-only">Match coordinates, reference cycle against this week</caption>
        <colgroup>
          <col className="w-1/2" />
          <col className="w-1/4" />
          <col className="w-1/4" />
        </colgroup>
        <thead>
          <tr className="border-b border-slate-800/80 text-slate-400">
            <th scope="col" className="py-1.5 pr-3 font-medium">Coordinate</th>
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
      <dl className="grid gap-3 border-t border-slate-800 pt-4 sm:grid-cols-3">
        {[
          { label: "Common mistake then", value: analog.consensusTrap },
          { label: "What held up then", value: analog.winningMove },
          { label: "What marked the turn", value: analog.reversalMarker },
        ].map((cell) => (
          <div key={cell.label}>
            <dt className="text-fluid-nano font-semibold uppercase tracking-wider text-slate-400">{cell.label}</dt>
            <dd className="mt-1 text-fluid-xs leading-relaxed text-slate-200">{cell.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-fluid-nano text-slate-500">
        Cycle notes are editorial summaries of that period&apos;s public record, not a measured sample of companies.{" "}
        <Link href="/history/compare" className="font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
          Compare against any past month →
        </Link>
      </p>
    </details>
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
  searchParams?: SignalsPageSearchParams;
}) => (
  <section id="instruments" aria-labelledby="instruments-heading" className="space-y-6">
    <div>
      <p className="type-eyebrow type-eyebrow-section">Deeper evidence</p>
      <h2 id="instruments-heading" className="mt-1 text-base font-semibold text-slate-100 sm:text-lg">
        Charts, past months, and the checks that would overturn the call.
      </h2>
    </div>

    {/* Open by default: the charts are what this section is for. Which of the
        instruments a reader had open is incidental to a shared link, except
        the month picker below, whose open state other pages link into. */}
    <details id="signal-diagnostics" open className="weather-auto-chevron weather-panel space-y-4 p-5">
      <summary className={SUMMARY_CLASS}>Every chart behind the call.</summary>
      <SignalVisualizationSuite treasury={treasury} yieldCurveSeries={yieldCurveSeries} />
      <SignalInversionPreview yieldCurveSeries={yieldCurveSeries} />
      <div id="trends" className="space-y-4 border-t border-slate-800/60 pt-4">
        <h3 className="type-eyebrow">Funding pressure and risk appetite over time</h3>
        {/* The table above publishes *this week's* reading and this series is
            the month-end archive, so the two disagree by design — for the same
            two named signals. Each cell stamps its own period; this line says
            what the block is, once. */}
        <p className="text-fluid-xs text-slate-400">
          Month-end readings from the archive, so the latest figure here is the last
          completed month rather than this week&rsquo;s score above.
        </p>
        <SignalSparklineStrip
          series={[
            { key: "tightness", label: "Funding pressure", points: tightnessTrend, windowLabel: `${tightnessTrend.length} mo` },
            { key: "riskAppetite", label: "Risk appetite", points: riskAppetiteTrend, increaseIsPositive: true, windowLabel: `${riskAppetiteTrend.length} mo` },
          ]}
        />
      </div>
    </details>

    <AdvancedThresholdsSection currentThresholds={assessment.thresholds} />

    <UrlDetails
      id="past-months"
      queryKey="advanced"
      initialOpen={monthPickerOpen}
      className="weather-auto-chevron weather-panel p-5"
      summaryClassName={SUMMARY_CLASS}
      summary={<span>Past months · See what the brief said in an earlier month</span>}
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

    <AnalogPatternDisclosure assessment={assessment} />

    <FossilRecordSection
      regime={assessment.regime}
      open={searchParams?.fossil === "1" || searchParams?.fossil === "open"}
    />
  </section>
);
